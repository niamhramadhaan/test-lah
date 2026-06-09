/**
 * Unified LLM service — uses Vercel AI SDK for all providers.
 *
 * This module creates AI SDK provider instances on the fly from user config,
 * so the rest of the codebase only calls generateText() without caring which
 * provider is underneath.
 */

import { generateText, Output } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'
import { type ProviderDef } from './providers'

// ---------------------------------------------------------------------------
// Schema for test case generation
// ---------------------------------------------------------------------------

const TestCaseSchema = z.object({
  title: z.string().describe('Short descriptive title of the test case'),
  steps: z.string().describe('Numbered test steps separated by newlines'),
  expected: z.string().describe('Expected result of the test'),
})

export type GeneratedTestCase = z.infer<typeof TestCaseSchema>

// ---------------------------------------------------------------------------
// Provider factory — returns an AI SDK model instance
// ---------------------------------------------------------------------------

export interface ProviderConfig {
  def: ProviderDef
  apiKey: string
  model: string
  baseURL?: string
}

export function createModel(config: ProviderConfig) {
  const { def, apiKey, model, baseURL } = config

  if (def.type === 'native') {
    switch (def.sdkProvider) {
      case 'openai': {
        const provider = createOpenAI({ apiKey })
        return provider(model || def.defaultModel)
      }
      case 'google': {
        const provider = createGoogleGenerativeAI({ apiKey })
        return provider(model || def.defaultModel)
      }
      case 'anthropic': {
        const provider = createAnthropic({ apiKey })
        return provider(model || def.defaultModel)
      }
      case 'groq': {
        const provider = createGroq({ apiKey })
        return provider(model || def.defaultModel)
      }
      default:
        throw new Error(`Unknown native SDK provider: ${def.sdkProvider}`)
    }
  }

  // OpenAI-compatible path (deepseek, xiaomi, custom, etc.)
  const effectiveBaseURL = baseURL || def.baseURL
  if (!effectiveBaseURL) {
    throw new Error(`Base URL is required for OpenAI-compatible provider "${def.id}"`)
  }

  const provider = createOpenAI({
    apiKey,
    baseURL: effectiveBaseURL,
    name: def.id,
  })
  return provider(model || def.defaultModel)
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function getSystemPrompt(language: string = 'en'): string {
  const langInstruction =
    language === 'id'
      ? 'Write ALL test case content (title, steps, expected result) in Bahasa Indonesia.'
      : 'Write ALL test case content (title, steps, expected result) in English.'

  return `You are a QA engineer. Generate test cases for the given feature.
${langInstruction}

RULES FOR STEPS:
- Each test case's steps must be specific to THAT scenario. Do NOT repeat generic navigation steps.
- Assume the user is already on the relevant page unless the test specifically requires navigation.
- Each step should describe a UNIQUE action. If two test cases share setup, mention it only in the first step of that test.
- Be concise: 2-5 steps per test case.
- Focus on the action being tested, not boilerplate.

Generate 3-8 test cases covering happy path, edge cases, and error scenarios.`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateTestCases(
  config: ProviderConfig,
  title: string,
  prompt: string,
  language: string = 'en',
  images?: string[],
): Promise<GeneratedTestCase[]> {
  const model = createModel(config)

  const systemPrompt = getSystemPrompt(language)
  const userText = `Feature: ${title}\n\nDescription / DoD / Acceptance Criteria:\n${prompt || '(no additional description provided)'}${images?.length ? '\n\nThe user has attached screenshot(s) of the UI/feature. Use them as additional context to write more accurate and specific test cases.' : ''}`

  // Build multimodal content if images are present
  const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [
    { type: 'text', text: userText },
  ]

  if (images?.length) {
    for (const img of images) {
      content.push({ type: 'image', image: img })
    }
  }

  const { output } = await generateText({
    model,
    output: Output.array({ element: TestCaseSchema }),
    system: systemPrompt,
    messages: [{ role: 'user', content }],
    temperature: 0.4,
  })

  return output
}

export async function testConnection(
  config: ProviderConfig,
): Promise<{ ok: boolean; error?: string; models?: string[] }> {
  try {
    const model = createModel(config)

    await generateText({
      model,
      prompt: 'Say "ok" in one word.',
      maxOutputTokens: 10,
    })

    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    return { ok: false, error: message }
  }
}
