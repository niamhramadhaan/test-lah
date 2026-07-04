/**
 * Generates test cases by shelling out to a locally installed, logged-in
 * Claude Code CLI (`claude -p`) instead of calling a provider API directly.
 *
 * Auth is whatever the CLI itself already has configured (subscription OAuth
 * session or ANTHROPIC_API_KEY) — this module never handles a key. Only
 * works on a machine that has `claude` installed and authenticated.
 */

import { spawn } from 'child_process'
import { getSystemPrompt, parseTestCasesFromText, buildFeatureContext, type GeneratedTestCase, type FeatureContext } from './index'

const CLAUDE_CLI_TIMEOUT_MS = 60_000

export async function generateTestCasesViaClaudeCode(
  input: FeatureContext & { language?: string },
): Promise<GeneratedTestCase[]> {
  const systemPrompt = getSystemPrompt(input.language ?? 'en')
  const fullPrompt =
    `${systemPrompt}\n\n` +
    'IMPORTANT: Respond with ONLY a valid JSON array. No markdown, no code fences, no explanation, no thinking tags. ' +
    'Each object must have exactly these keys: "title" (string), "steps" (string with numbered steps separated by newlines), "expected" (string).\n\n' +
    buildFeatureContext(input)

  const text = await runClaudeCli(fullPrompt)
  return parseTestCasesFromText(text)
}

export async function refineNotesViaClaudeCode(projectName: string, notes: string): Promise<string> {
  const systemPrompt = `You are a QA documentation assistant. Your job is to refine project notes for a QA testing project.

Rules:
- Make the notes more structured, clear, and professional
- Use the project name as context for domain-appropriate formatting
- Organize into logical sections with bullet points if appropriate
- Keep the original meaning and all technical details
- Do NOT add new information or assumptions
- Return ONLY the refined notes text, no explanation or wrapper`

  const fullPrompt = `${systemPrompt}\n\nProject: ${projectName}\n\nCurrent notes:\n${notes || '(no notes yet)'}`

  const text = await runClaudeCli(fullPrompt)
  return text.trim()
}

export async function testClaudeCodeConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const text = await runClaudeCli('Say "ok" in one word. Respond with only that word, nothing else.')
    return { ok: text.trim().length > 0 }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' }
  }
}

function runClaudeCli(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // --allowedTools '' denies all tool use so this stays a plain text
    // completion (no file/bash access) rather than an agentic session.
    const child = spawn('claude', ['-p', '--output-format', 'json', '--allowedTools', ''], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill()
      reject(new Error('Claude Code CLI timed out after 60s'))
    }, CLAUDE_CLI_TIMEOUT_MS)

    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (err.code === 'ENOENT') {
        reject(new Error(
          'Claude Code CLI ("claude") not found on PATH. Install it and run "claude login" on the machine running this server.',
        ))
      } else {
        reject(err)
      }
    })

    child.on('close', code => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(`Claude Code CLI exited with code ${code}: ${stderr.trim() || 'no error output'}`))
        return
      }
      try {
        const envelope = JSON.parse(stdout)
        const text = envelope?.result
        if (typeof text !== 'string') {
          reject(new Error(`Unexpected Claude Code CLI output shape: ${stdout.slice(0, 300)}`))
          return
        }
        resolve(text)
      } catch {
        reject(new Error(`Failed to parse Claude Code CLI JSON output: ${stdout.slice(0, 300)}`))
      }
    })

    child.stdin.write(prompt)
    child.stdin.end()
  })
}
