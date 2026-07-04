import { NextRequest } from 'next/server'
import type { E2ERunConfig, E2ETestResult, StepResult } from '@/lib/e2e-agent'
import { analyzeFailure } from '@/lib/e2e-agent'
import { decrypt } from '@/lib/crypto'
import type { TestCase } from '@/types'

interface AIAction {
  idx?: number | null
  action: string
  selector: string
  value?: string
  description: string
  skip?: boolean
  confidence?: number
}

interface LastResolved {
  description: string
}

// Step types that describe a real interaction with a specific element, as
// opposed to navigation/verify/wait/general steps. Used to decide when
// "skip"/"not_found"/low confidence must be treated as a failure rather than
// a benign no-op — a correctness signal must never be silently absorbed.
const ACTIONABLE_STEP_TYPES = ['click', 'fill', 'hover', 'scroll', 'select', 'check']

// Routes a one-shot text prompt through either the configured API-key
// provider (Vercel AI SDK) or, when the active provider is Claude Code
// (local CLI), through the locally installed `claude` CLI — same one-shot
// prompt-in/text-out contract either way, so callers don't need to branch.
async function generateWithConfig(config: any, prompt: string, maxOutputTokens?: number): Promise<string> {
  if (config.provider === 'claude-code') {
    const { runClaudeCli } = await import('@/lib/llm/claudeCode')
    return runClaudeCli(prompt)
  }

  const { generateText } = await import('ai')
  const { createModel } = await import('@/lib/llm/index')
  const { getProviderDef } = await import('@/lib/llm/providers')

  const providerDef = getProviderDef(config.provider)
  const model = createModel({
    def: providerDef,
    apiKey: config.apiKey,
    model: config.model,
    baseURL: config.baseURL,
  })

  const { text } = await generateText({
    model,
    messages: [{ role: 'user', content: prompt }],
    ...(maxOutputTokens ? { maxOutputTokens } : {}),
  })
  return text
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const signal = request.signal
  const { testCases, baseUrl, browser, headless, timeout, llmConfig, generateOnly } = body as {
    testCases: TestCase[]
    baseUrl: string
    browser?: 'chromium' | 'firefox' | 'webkit' | 'edge'
    headless?: boolean
    timeout?: number
    llmConfig: {
      provider: string
      model: string
      apiKey: string
      baseURL?: string
    }
    generateOnly?: boolean
  }

  if (!testCases?.length) {
    return new Response(JSON.stringify({ error: 'No test cases provided' }), { status: 400 })
  }

  const isClaudeCode = llmConfig?.provider === 'claude-code'
  if (!isClaudeCode && !llmConfig?.apiKey) {
    return new Response(JSON.stringify({ error: 'LLM API key is required' }), { status: 400 })
  }

  const decryptedApiKey = isClaudeCode ? '' : await decrypt(llmConfig.apiKey)
  const decryptedConfig = { ...llmConfig, apiKey: decryptedApiKey }

  // Generate-only mode: launches a real (throwaway) browser and resolves
  // each step against the live page — same AI-driven resolution used during
  // a real run — so the emitted script reflects real, working selectors
  // instead of a static "TODO: implement" placeholder.
  if (generateOnly) {
    const scripts: Record<string, string> = {}
    const targetUrl = baseUrl || 'http://localhost:3000'
    const noop = () => {}

    try {
      const { chromium, firefox, webkit } = await import('playwright')
      const browsers: Record<string, any> = { chromium, firefox, webkit }
      const browserType = browser === 'edge' ? 'chromium' : (browser || 'chromium')
      const browserEngine = browsers[browserType] || chromium

      const { LD_PRELOAD: _ldPreload, ...browserEnv } = process.env
      const browserInstance = await browserEngine.launch({ headless: true, env: browserEnv })
      const context = await browserInstance.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      })

      for (const tc of testCases) {
        const page = await context.newPage()
        let scriptLines: string[] = []
        try {
          await page.goto(targetUrl, { timeout: 30000, waitUntil: 'domcontentloaded' })
          await page.waitForTimeout(500)
          await dismissOverlays(page)

          let pageContext = await getPageContext(page)
          let lastResolved: LastResolved | null = null
          const steps = tc.steps.split('\n').filter(s => s.trim())

          for (const rawStep of steps) {
            const step = rawStep.replace(/^\d+[\.\)]\s*/, '').trim()
            if (!step) continue

            if (isAssumptionStep(step)) {
              scriptLines.push(`    // Precondition: ${step}`)
              continue
            }

            const stepType = classifyStep(step)
            const outcome = await resolveAndExecuteStep(page, decryptedConfig, step, stepType, pageContext, lastResolved, 10000, noop)
            scriptLines.push(`    ${outcome.scriptLine}`)
            if (outcome.status === 'pass') lastResolved = { description: outcome.description }

            try {
              pageContext = await getPageContext(page)
            } catch {}
          }
        } catch (err) {
          scriptLines.push(`    // Failed to generate: ${err instanceof Error ? err.message : String(err)}`)
        }
        await page.close()
        scripts[tc.id] = buildScriptFile(tc, targetUrl, scriptLines)
      }

      await browserInstance.close()
    } catch (err) {
      // Browser launch itself failed — fall back to static placeholders so
      // the UI still gets something instead of erroring out entirely.
      for (const tc of testCases) {
        if (!scripts[tc.id]) scripts[tc.id] = generatePlaceholderScript(tc, targetUrl)
      }
    }

    return Response.json({ scripts })
  }

  if (!baseUrl) {
    return new Response(JSON.stringify({ error: 'Base URL is required' }), { status: 400 })
  }

  const runConfig: E2ERunConfig = {
    baseUrl,
    browser: browser || 'chromium',
    headless: headless ?? true,
    timeout: timeout ?? 30000,
    screenshotOnFailure: true,
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let aborted = false

      const sendEvent = (data: any) => {
        if (aborted) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }

      signal.addEventListener('abort', () => {
        aborted = true
        sendEvent({ type: 'aborted', message: 'Test run stopped by user' })
        try { controller.close() } catch {}
      })

      try {
        sendEvent({ type: 'status', message: 'Initializing browser...' })
        const { chromium, firefox, webkit } = await import('playwright')

        const browsers: Record<string, any> = { chromium, firefox, webkit }
        const browserType = runConfig.browser === 'edge' ? 'chromium' : (runConfig.browser || 'chromium')
        const browserEngine = browsers[browserType] || chromium

        // Strip LD_PRELOAD: editor tooling (e.g. VS Code's Console Ninja) can
        // inject a Node-only native hook into this process's env, which
        // crashes the non-Node chrome-headless-shell child with an
        // "undefined symbol" error at launch if inherited.
        const { LD_PRELOAD: _ldPreload, ...browserEnv } = process.env
        const launchOptions: any = { headless: runConfig.headless ?? true, env: browserEnv }
        if (runConfig.browser === 'edge') {
          launchOptions.channel = 'msedge'
        }

        sendEvent({ type: 'status', message: `Launching ${browserType} browser...` })
        const browserInstance = await browserEngine.launch(launchOptions)
        const context = await browserInstance.newContext({
          viewport: { width: 1280, height: 720 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })

        sendEvent({ type: 'status', message: 'Browser ready. Starting tests...' })

        const results: E2ETestResult[] = []

        for (let i = 0; i < testCases.length; i++) {
          if (aborted || signal.aborted) break

          const testCase = testCases[i]
          const startTime = Date.now()

          // Rough placeholder shown before the test runs — replaced with the
          // real, resolved script (built from what actually executed) once
          // the test completes.
          let script = generatePlaceholderScript(testCase, runConfig.baseUrl)

          sendEvent({
            type: 'testStart',
            index: i + 1,
            total: testCases.length,
            testCaseId: testCase.id,
            title: testCase.title,
            code: testCase.code,
            script
          })

          const result: E2ETestResult = {
            testCaseId: testCase.id,
            status: 'pass',
            duration: 0,
            steps: [],
          }
          const scriptLines: string[] = []

          const page = await context.newPage()

          // Set up screenshot capture at key moments
          const captureScreenshot = async (label: string) => {
            try {
              const screenshot = await page.screenshot({ type: 'jpeg', quality: 60 })
              sendEvent({
                type: 'screenshot',
                image: screenshot.toString('base64'),
                label,
                testCaseId: testCase.id
              })
            } catch {}
          }

          try {
            sendEvent({ type: 'step', message: `Navigating to ${runConfig.baseUrl}...` })
            await page.goto(runConfig.baseUrl, {
              timeout: runConfig.timeout ?? 30000,
              waitUntil: 'domcontentloaded'
            })
            sendEvent({ type: 'step', message: 'Page loaded successfully' })
            await page.waitForTimeout(1000)
            await dismissOverlays(page)

            // Capture initial page screenshot
            await captureScreenshot('Page loaded')

            let pageContext = await getPageContext(page)
            const steps = testCase.steps.split('\n').filter(s => s.trim())
            let lastResolved: LastResolved | null = null

            for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
              if (aborted || signal.aborted) break

              const rawStep = steps[stepIdx]
              const step = rawStep.replace(/^\d+[\.\)]\s*/, '').trim()
              if (!step) continue

              sendEvent({
                type: 'step',
                message: `Step ${stepIdx + 1}/${steps.length}: ${step}`
              })

              if (isAssumptionStep(step)) {
                sendEvent({
                  type: 'stepResult',
                  status: 'pass',
                  message: 'Skipped (precondition/assumption)'
                })
                result.steps.push({ step, status: 'pass' })
                scriptLines.push(`    // Precondition: ${step}`)
                continue
              }

              const stepType = classifyStep(step)
              const outcome = await resolveAndExecuteStep(
                page, decryptedConfig, step, stepType, pageContext, lastResolved,
                runConfig.timeout ?? 10000, sendEvent, captureScreenshot,
              )
              scriptLines.push(`    ${outcome.scriptLine}`)

              const stepResult: StepResult = { step, status: outcome.status, error: outcome.error, healed: outcome.healed }
              if (outcome.status === 'fail' && runConfig.screenshotOnFailure) {
                try {
                  const screenshot = await page.screenshot({ type: 'png' })
                  stepResult.screenshot = screenshot.toString('base64')
                } catch {}
              }
              if (outcome.status === 'pass') lastResolved = { description: outcome.description }

              result.steps.push(stepResult)
              if (stepResult.status === 'fail') {
                result.status = 'fail'
                break
              }

              try {
                pageContext = await getPageContext(page)
              } catch {}
            }

            if (result.status === 'pass' && testCase.expected) {
              sendEvent({ type: 'step', message: 'Verifying expected result...' })
              try {
                const content = await page.textContent('body')
                const verification = await verifyExpectedWithAI(decryptedConfig, testCase.expected, content || '', page.url())

                if (!verification.passed) {
                  result.status = 'fail'
                  result.error = `Expected result not met: ${verification.reason}`
                  sendEvent({ type: 'stepResult', status: 'fail', message: result.error })
                } else {
                  sendEvent({ type: 'stepResult', status: 'pass', message: `Expected result verified: ${verification.evidence || verification.reason}` })
                }
              } catch (verifyError) {
                result.status = 'fail'
                result.error = verifyError instanceof Error ? verifyError.message : String(verifyError)
                sendEvent({ type: 'stepResult', status: 'fail', message: `Verification error: ${result.error}` })
              }
            }

            script = buildScriptFile(testCase, runConfig.baseUrl, scriptLines)

          } catch (executionError) {
            result.status = 'error'
            result.error = executionError instanceof Error ? executionError.message : String(executionError)
            sendEvent({ type: 'error', message: `Execution error: ${result.error}` })
          }

          await page.close()
          result.duration = Date.now() - startTime

          if (result.status === 'fail' || result.status === 'error') {
            sendEvent({ type: 'aiThinking', message: 'AI analyzing failure...' })
            try {
              result.aiAnalysis = await analyzeFailure(testCase, result.error || 'Unknown error', result.screenshot, decryptedConfig)
              sendEvent({ type: 'aiAnalysis', message: result.aiAnalysis })
            } catch {}
          }

          results.push(result)
          sendEvent({
            type: 'testComplete',
            index: i + 1,
            total: testCases.length,
            testCaseId: testCase.id,
            status: result.status,
            duration: result.duration,
            result,
            script
          })
        }

        await browserInstance.close()
        const healingReport = generateHealingReport(testCases, results)
        sendEvent({ type: 'healingReport', report: healingReport })
        sendEvent({ type: 'complete', results })
      } catch (error) {
        sendEvent({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
      }

      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// Static fallback template — used only as the pre-run preview (before we
// know what will actually be resolved) and as an emergency fallback if
// generate-only mode's browser launch fails outright.
function generatePlaceholderScript(testCase: TestCase, baseUrl: string): string {
  const steps = testCase.steps.split('\n').filter(s => s.trim())
  const stepLines = steps.map((step, i) => {
    const clean = step.replace(/^\d+[\.\)]\s*/, '').trim()
    if (isAssumptionStep(clean)) {
      return `    // Precondition: ${clean}`
    }
    return `    // Step ${i + 1}: ${clean}
    // TODO: Implement with proper selectors`
  }).join('\n')

  return buildScriptFile(testCase, baseUrl, [stepLines])
}

function buildScriptFile(testCase: TestCase, baseUrl: string, scriptLines: string[]): string {
  return `import { test, expect } from '@playwright/test';

test.describe('${testCase.code}: ${testCase.title.replace(/'/g, "\\'")}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${baseUrl}');
  });

  test('should execute test case', async ({ page }) => {
${scriptLines.join('\n')}

    // Expected: ${testCase.expected || 'Verify expected result'}
  });
});`
}

function isAssumptionStep(step: string): boolean {
  const patterns = [
    /^assume\b/i, /^given that\b/i, /^given the user\b/i,
    /^prerequisite/i, /^precondition/i, /^user is already/i,
    /^user has already/i, /^ensure that.*is/i, /^make sure.*is/i, /^suppose\b/i,
  ]
  return patterns.some(p => p.test(step.trim()))
}

// Extracts candidate interactive elements from the live page, prioritizing
// content inside <main> (what test steps almost always target) over
// <nav>/<header>/<footer> chrome. Content-heavy pages routinely have 30-40+
// nav links that appear before <main> in document order — a flat
// "first N in DOM order" extraction (the previous approach) lets that chrome
// crowd out the actual content, so the AI never even sees the elements a
// step is asking about. Every candidate is tagged with a stable
// data-e2e-idx attribute so the AI can target it by index instead of
// hand-writing a CSS selector (error-prone on sites with no semantic
// markup or dynamic classes/hrefs).
async function getPageContext(page: any): Promise<any> {
  return page.evaluate(() => {
    const isVisible = (el: Element) => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return false
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
      return true
    }

    const CANDIDATE_SELECTOR = 'a, button, input, select, textarea, [role="button"], [role="link"], [data-testid], [onclick]'
    const candidates = Array.from(document.querySelectorAll(CANDIDATE_SELECTOR)).filter(isVisible)

    const main = document.querySelector('main, [role="main"], #main, #content, .main-content')
    const isInMain = (el: Element) => !!main && main.contains(el)
    const isInChrome = (el: Element) => !!el.closest('nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"]')

    // Tag every visible candidate with a stable index so the AI can refer
    // to elements by index instead of hand-writing a CSS selector. This is
    // re-tagged fresh every time getPageContext runs, always reflecting the
    // current DOM state at the moment it's called.
    candidates.forEach((el, i) => el.setAttribute('data-e2e-idx', String(i)))

    const describe = (el: Element, i: number) => {
      const img = el.querySelector('img')
      return {
        idx: i,
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 60) || '',
        id: el.id || '',
        testId: el.getAttribute('data-testid') || '',
        href: (el as HTMLAnchorElement).href || '',
        type: (el as HTMLInputElement).type || '',
        placeholder: (el as HTMLInputElement).placeholder || '',
        role: el.getAttribute('role') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        hasImage: !!img,
        imageAlt: img?.getAttribute('alt')?.substring(0, 60) || '',
        inMain: isInMain(el),
        inChrome: isInChrome(el),
      }
    }

    const described = candidates.map(describe)
    const mainEls = described.filter(e => e.inMain || (!main && !e.inChrome))
    const chromeEls = described.filter(e => e.inChrome && !e.inMain)
    const otherEls = described.filter(e => !!main && !e.inMain && !e.inChrome)

    // Main-content elements first (what a step usually targets), then any
    // remaining body content, then a small tail of nav/header/footer chrome
    // — present but deprioritized rather than excluded, so a step that
    // genuinely targets navigation ("click login in the header") can still
    // resolve.
    const prioritized = [...mainEls, ...otherEls, ...chromeEls].slice(0, 60)

    return {
      url: window.location.href,
      title: document.title,
      visibleElements: prioritized,
      headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()).filter(Boolean).slice(0, 10),
    }
  })
}

// Brace-balanced extraction: scans from the first '{' to its matching '}',
// tracking string literals so braces inside quoted text (e.g. an "evidence"
// field quoting page content) don't throw off the count. A flat
// /\{[^{}]*\}/ regex (the previous approach) truncates or fails outright on
// any nested object/array, which the richer verification/healing prompts
// now rely on.
function parseAIJson(text: string): any {
  let clean = text.trim()
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const start = clean.indexOf('{')
  if (start === -1) throw new Error('No JSON found')

  let depth = 0
  let inString = false
  let escaped = false
  let end = -1
  for (let i = start; i < clean.length; i++) {
    const ch = clean[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }

  if (end === -1) throw new Error('No JSON found')
  return JSON.parse(clean.slice(start, end + 1))
}

function classifyStep(step: string): string {
  if (/navigate|go to|open|visit|browse to/i.test(step)) return 'navigate'
  if (/verify|check|assert|confirm|ensure|presence|visible|display|should be|should show|locate|find|identify|look for/i.test(step)) return 'verify'
  if (/click|tap|press|select|choose/i.test(step)) return 'click'
  if (/fill|enter|type|input|write/i.test(step)) return 'fill'
  if (/hover|mouse over/i.test(step)) return 'hover'
  if (/scroll|swipe/i.test(step)) return 'scroll'
  if (/wait|pause|delay/i.test(step)) return 'wait'
  return 'general'
}

async function getAIAction(
  config: any,
  step: string,
  url: string,
  title: string,
  pageContext: any,
  retryCount = 0,
  lastResolved: LastResolved | null = null,
): Promise<AIAction> {
  const stepType = classifyStep(step)

  const elements = pageContext.visibleElements || []
  const elementsList = elements.map((el: any) => {
    const attrs = []
    if (el.testId) attrs.push(`data-testid="${el.testId}"`)
    if (el.id) attrs.push(`id="${el.id}"`)
    if (el.role) attrs.push(`role="${el.role}"`)
    if (el.ariaLabel) attrs.push(`aria-label="${el.ariaLabel}"`)
    if (el.placeholder) attrs.push(`placeholder="${el.placeholder}"`)
    if (el.href) attrs.push(`href="${el.href}"`)
    if (el.hasImage) attrs.push('hasImage')
    if (el.imageAlt) attrs.push(`imgAlt="${el.imageAlt}"`)
    return `[${el.idx}] <${el.tag} ${attrs.join(' ')}>${el.text ? ` "${el.text}"` : ''}`
  }).join('\n') || 'No elements found'

  let guidance = ''
  switch (stepType) {
    case 'navigate':
      guidance = 'NAVIGATION: Extract URL from step. If already on that page, use action "wait" with value "500". Put URL in "value" field.'
      break
    case 'verify':
      guidance = 'VERIFY/LOCATE: Confirming something is present, not necessarily a strict interaction. Pick the most relevant element by idx if one clearly matches (action "assert"). Only skip if this is truly a precondition unrelated to any element — not merely because you are unsure which exact element matches. If nothing at all resembles what should be present, use action "not_found" rather than asserting on "body" as a fake pass.'
      break
    case 'click':
      guidance = 'CLICK: Find the target element in the list and set "idx" to its number. A reasonably confident match is fine even if not a perfect label match (e.g. a link containing an image for a "thumbnail"). But if NOTHING in the list plausibly represents this element, use action "not_found" instead of guessing a wrong one — a wrong guess that "succeeds" is worse than a correct failure.'
      break
    case 'fill':
      guidance = 'FILL: Find the input field and set "idx" to its number. Put the text to type in "value" field. If no input field matches, use action "not_found".'
      break
    case 'hover':
      guidance = 'HOVER: Find the element to hover over and set "idx" to its number. If nothing matches, use action "not_found".'
      break
    case 'scroll':
      guidance = 'SCROLL: Find the element to scroll into view and set "idx" to its number, or use action "wait" if scrolling the whole page. If a specific target is named but nothing matches, use action "not_found".'
      break
    case 'wait':
      guidance = 'WAIT: Usually just a timed pause — action "wait" with a value in ms (e.g. "1000"). Only set "idx" if waiting for a specific element to appear.'
      break
    default:
      guidance = 'GENERAL: Interpret the step\'s intent from the elements list. If it describes checking/locating something, treat it like VERIFY. Only skip if the step is clearly a precondition/assumption unrelated to any action. If it describes a real action but nothing matches, use action "not_found".'
  }

  const prompt = `Execute this E2E test step.

PAGE: ${url} (${title})
HEADINGS: ${pageContext.headings?.join(', ') || 'None'}
${lastResolved ? `PREVIOUS STEP TARGETED: ${lastResolved.description}` : ''}

ELEMENTS:
${elementsList}

STEP: "${step}"
TYPE: ${stepType}

${guidance}

RULES:
- Prefer targeting an element by its [idx] from the list above — set the "idx" field to that number. This is far more reliable than writing your own CSS selector.
- Only omit "idx" (set it to null) for steps that check general page state rather than a specific element, or for "navigate" steps.
- NEVER return an idx that isn't in the list above.
- For navigate, put the full URL in "value".
- "skip" is ONLY for steps that are preconditions/assumptions, not real actions (e.g. "assume the user is already logged in"). Do NOT use skip for a real action just because you're unsure which element matches.
- If the step describes a real action (click/fill/hover/scroll/select/check) but NO element in the list plausibly matches it, set action to "not_found". Do NOT substitute a loosely-related or wrong element just to avoid failing — a false pass is worse than an honest failure.
- Set "confidence" to a number 0-1 reflecting how sure you are that your chosen idx/action is correct. Use a low number (<0.4) if you're guessing. Use 0 for "skip" or "not_found".

Reply with ONLY this JSON (no markdown):
{"idx": <number or null>, "action":"click|fill|navigate|wait|assert|hover|not_found","value":"...","description":"...","skip":false,"confidence":<0-1>}`

  try {
    const text = await generateWithConfig(config, prompt, 300)

    const parsed = parseAIJson(text)

    // Resolve selector: prefer an explicit element index (robust — points
    // at the exact tagged DOM node) over an LLM-authored CSS selector,
    // which is error-prone on sites with no semantic markup or dynamic
    // hrefs/classes.
    if (typeof parsed.idx === 'number' && elements.some((el: any) => el.idx === parsed.idx)) {
      parsed.selector = `[data-e2e-idx="${parsed.idx}"]`
    }

    if (!parsed.selector || parsed.selector === '') {
      if (stepType === 'navigate') {
        const urlMatch = step.match(/https?:\/\/[^\s]+/)
        parsed.selector = urlMatch ? urlMatch[0] : url
        parsed.value = parsed.selector
        parsed.action = 'navigate'
      } else if (stepType === 'verify' && parsed.action !== 'not_found') {
        parsed.selector = 'body'
        parsed.action = 'assert'
      } else {
        parsed.selector = 'body'
      }
    }

    const validActions = ['click', 'fill', 'navigate', 'wait', 'assert', 'select', 'check', 'press', 'hover', 'scroll', 'skip', 'not_found']
    if (!validActions.includes(parsed.action)) {
      parsed.action = stepType === 'verify' ? 'assert' : 'wait'
    }

    return parsed
  } catch (error) {
    if (retryCount < 2) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)))
      return getAIAction(config, step, url, title, pageContext, retryCount + 1, lastResolved)
    }

    if (stepType === 'navigate') {
      const urlMatch = step.match(/https?:\/\/[^\s]+/)
      return { action: 'navigate', selector: urlMatch ? urlMatch[0] : url, value: url, description: step, skip: false }
    }
    // A real action step that the model couldn't even produce parseable
    // JSON for (after retries) must fail, not fall through to a "wait" that
    // trivially "succeeds" without ever touching the target element.
    if (ACTIONABLE_STEP_TYPES.includes(stepType)) {
      return { action: 'not_found', selector: 'body', description: `AI response could not be parsed after retries for step: ${step}`, skip: false, confidence: 0 }
    }
    if (stepType === 'verify') {
      return { action: 'assert', selector: 'body', description: step, skip: false }
    }
    return { action: 'wait', selector: 'body', value: '500', description: step, skip: false }
  }
}

// Generic, site-agnostic recovery for the two most common ways a
// human/AI-chosen (non-idx) selector can still fail to click cleanly:
// matching more than one equivalent-looking element (e.g. the same product
// listed in both a "featured" carousel and the full catalog), or being
// visually covered by something unrelated to the target — ad iframes, chat
// widgets, sticky headers, with completely arbitrary naming across sites.
// Neither recovery requires knowing anything about the specific page.
async function clickResilient(page: any, selector: string, timeout: number): Promise<void> {
  const isStrictViolation = (msg: string) => /strict mode violation/i.test(msg)
  const isIntercepted = (msg: string) => /intercepts pointer events/i.test(msg)

  let locator = page.locator(selector)
  try {
    await locator.click({ timeout })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (isStrictViolation(message)) {
      locator = locator.first()
      try {
        await locator.click({ timeout })
        return
      } catch (err2) {
        const message2 = err2 instanceof Error ? err2.message : String(err2)
        if (!isIntercepted(message2)) throw err2
      }
    } else if (!isIntercepted(message)) {
      throw err
    }
    await locator.click({ timeout, force: true })
  }
}

async function attemptHealing(
  page: any,
  config: any,
  step: string,
  error: Error,
  pageContext: any,
  sendEvent: (data: any) => void
): Promise<{ healed: boolean; action?: AIAction }> {
  const elements = pageContext.visibleElements || []
  const elementsList = elements.slice(0, 40).map((el: any) => {
    const attrs = []
    if (el.testId) attrs.push(`data-testid="${el.testId}"`)
    if (el.id) attrs.push(`id="${el.id}"`)
    if (el.ariaLabel) attrs.push(`aria-label="${el.ariaLabel}"`)
    if (el.href) attrs.push(`href="${el.href}"`)
    if (el.hasImage) attrs.push('hasImage')
    return `[${el.idx}] <${el.tag} ${attrs.join(' ')}>${el.text ? ` "${el.text}"` : ''}`
  }).join('\n') || 'No elements found'

  const prompt = `An E2E test step FAILED to execute. Decide whether it can be retried against a DIFFERENT element that is still the SAME intended target (e.g. the original selector drifted, or the element re-rendered under a new id/class) — this is about surviving selector drift, NOT about finding some other element that would make the step "pass".

STEP: "${step}"
ERROR: ${error.message}

ELEMENTS (current page state):
${elementsList}

Prefer "idx" (element index from the list) over "selector" when targeting a specific element — it's far more reliable.

RULES:
- Only propose a retry if an element in the list is clearly the SAME thing the step was originally trying to interact with (same purpose/label/meaning), just reachable differently now.
- Do NOT substitute a different-purpose element merely because it's clickable — that would hide a real failure, not fix one.
- If the feature/element the step needs appears to be genuinely missing, removed, or broken on this page, set shouldRetry to false and explain why in "reason" — this is the correct outcome when the app itself is broken, not a bug to work around.
- Your "reason" must justify WHY the chosen element is the same target, not just that it looked clickable.

Reply with ONLY this JSON (no markdown):
{"shouldRetry":true,"idx":<number or null>,"action":"click|assert|wait|skip","selector":"...","value":"...","reason":"..."}

If it cannot be fixed without changing what the step actually verifies:
{"shouldRetry":false,"reason":"..."}`

  try {
    const text = await generateWithConfig(config, prompt, 300)

    const fix = parseAIJson(text)
    if (!fix.shouldRetry) {
      sendEvent({ type: 'healingAction', message: `Cannot heal — target appears genuinely broken/missing: ${fix.reason || 'no equivalent element found'}` })
      return { healed: false }
    }

    if (typeof fix.idx === 'number' && elements.some((el: any) => el.idx === fix.idx)) {
      fix.selector = `[data-e2e-idx="${fix.idx}"]`
    }

    sendEvent({ type: 'healingAction', message: `Trying: ${fix.action} on "${fix.selector}" - ${fix.reason}` })

    const timeout = 5000
    const urlBeforeHeal = page.url()
    const healedAction: AIAction = { idx: fix.idx ?? null, action: fix.action, selector: fix.selector, value: fix.value, description: fix.reason || step }
    switch (fix.action) {
      case 'click':
        await clickResilient(page, fix.selector, timeout)
        await settleAfterAction(page, healedAction, urlBeforeHeal)
        return { healed: true, action: healedAction }
      case 'fill':
        await page.locator(fix.selector).fill(fix.value || '', { timeout })
        return { healed: true, action: healedAction }
      case 'assert':
        await page.locator(fix.selector).waitFor({ state: 'visible', timeout })
        return { healed: true, action: healedAction }
      case 'wait':
        await page.waitForTimeout(parseInt(fix.value) || 2000)
        return { healed: true, action: { ...healedAction, action: 'wait', selector: 'body' } }
      case 'skip':
        return { healed: true, action: { action: 'wait', selector: 'body', value: '0', description: 'Skipped after healing attempt' } }
      default:
        return { healed: false }
    }
  } catch (healError) {
    // Surface why the healing attempt itself failed instead of silently
    // discarding it — the caller falls back to the ORIGINAL error message
    // either way, but this at least gets logged for diagnosis.
    sendEvent({ type: 'error', message: `Healing attempt failed: ${healError instanceof Error ? healError.message : String(healError)}` })
    return { healed: false }
  }
}

// Ad/cookie/promo overlays are one of the most common causes of "click
// intercepted" failures on real sites and are largely independent of
// selector correctness — this runs proactively (before each action, so a
// step doesn't burn 10-30s retrying a doomed click) and reactively (right
// after a click fails) so most of these resolve without an AI healing
// round-trip at all. Only treats an overlay as "blocking" if it's actually
// visible and covers a meaningful chunk of the viewport, to avoid false
// positives on small inline banners.
async function dismissOverlays(page: any): Promise<boolean> {
  try {
    const result = await page.evaluate(() => {
      const isVisible = (el: Element) => {
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return false
        const style = window.getComputedStyle(el)
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
      }

      const OVERLAY_SELECTOR = '[role="dialog"][aria-modal="true"], [id*="popup" i], [class*="popup" i], [class*="modal" i], [class*="overlay" i], [class*="cookie" i], [id*="cookie" i]'
      const overlays = Array.from(document.querySelectorAll(OVERLAY_SELECTOR)).filter(isVisible)
      const viewportArea = window.innerWidth * window.innerHeight
      const blocking = overlays.find(el => {
        const rect = el.getBoundingClientRect()
        return (rect.width * rect.height) / viewportArea > 0.2
      })
      if (!blocking) return { foundOverlay: false, clicked: false }

      const CLOSE_SELECTOR = 'button[aria-label*="close" i], [aria-label*="dismiss" i], button[class*="close" i], [class*="close" i]'
      const closeBtn = Array.from(blocking.querySelectorAll(CLOSE_SELECTOR)).filter(isVisible)[0] as HTMLElement | undefined
      if (closeBtn) {
        closeBtn.click()
        return { foundOverlay: true, clicked: true }
      }
      return { foundOverlay: true, clicked: false }
    })

    if (result.foundOverlay && !result.clicked) {
      // Many modal libraries close on Escape even without a reliably
      // findable close button.
      await page.keyboard.press('Escape').catch(() => {})
    }
    if (result.foundOverlay) {
      await page.waitForTimeout(300)
    }
    return result.foundOverlay
  } catch {
    return false
  }
}

// A click/navigate resolving successfully doesn't mean the resulting page
// has actually settled. domcontentloaded only fires for a full browser
// navigation — a client-side (SPA-style) route change (e.g. Next.js
// <Link>, recognizable by its target="_self" rel="" attributes) updates
// the URL via the History API with no such event at all, so a flat delay
// either races a fast full navigation or gives up too early on a slower
// client-side one. Polling for an actual URL change handles both: it
// resolves as soon as the URL moves, and only falls back to a fixed wait
// when the action wasn't navigational in the first place (e.g. clicking a
// filter/tab that doesn't change the URL).
async function settleAfterAction(page: any, action: AIAction, urlBefore?: string): Promise<void> {
  if (action.action !== 'click' && action.action !== 'navigate') return
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 })
  } catch {}
  if (urlBefore) {
    const deadline = Date.now() + 3000
    while (Date.now() < deadline && page.url() === urlBefore) {
      await page.waitForTimeout(150)
    }
  }
  await page.waitForTimeout(500)
}

interface StepExecutionOutcome {
  status: 'pass' | 'fail'
  scriptLine: string
  error?: string
  description: string
  // True when this step only passed after some form of recovery (overlay
  // dismissal, AI healing) rather than resolving and executing cleanly on
  // the first try. Surfaced so a "pass" doesn't silently hide that the app
  // needed help — a human should still review it.
  healed?: boolean
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '\\"')
}

// Translates a resolved element descriptor into a durable selector for use
// in an exported script — the transient data-e2e-idx attribute only exists
// during this run, so the exported code needs something that will still
// match the element on a future page load.
function toPortableSelector(el: any): string {
  if (!el) return 'body'
  if (el.testId) return `[data-testid="${escapeAttr(el.testId)}"]`
  if (el.id) return `#${el.id}`
  if (el.ariaLabel) return `[aria-label="${escapeAttr(el.ariaLabel)}"]`
  if (el.href) return `a[href="${escapeAttr(el.href)}"]`
  if (el.text) return `${el.tag}:has-text(${JSON.stringify(el.text)})`
  return el.tag || 'body'
}

function actionToScriptLine(action: AIAction, resolvedEl: any | null): string {
  const selector = resolvedEl ? toPortableSelector(resolvedEl) : action.selector
  switch (action.action) {
    case 'click': return `await page.locator('${selector}').click();`
    case 'fill': return `await page.locator('${selector}').fill(${JSON.stringify(action.value || '')});`
    case 'navigate': return `await page.goto(${JSON.stringify(action.value || action.selector)});`
    case 'wait':
      return selector && selector !== 'body'
        ? `await page.locator('${selector}').waitFor({ state: 'visible' });`
        : `await page.waitForTimeout(${parseInt(action.value || '1000') || 1000});`
    case 'assert': return `await expect(page.locator('${selector}')).toBeVisible();`
    case 'select': return `await page.locator('${selector}').selectOption(${JSON.stringify(action.value || '')});`
    case 'check': return `await page.locator('${selector}').check();`
    case 'press': return `await page.keyboard.press(${JSON.stringify(action.value || 'Enter')});`
    case 'hover': return `await page.locator('${selector}').hover();`
    case 'scroll': return `await page.locator('${selector}').scrollIntoViewIfNeeded();`
    default: return `// Unhandled action: ${action.action}`
  }
}

// Shared step-resolution core used by both the live "Run Tests" flow and
// "Generate Scripts" (a real dry-run through the page). Resolves one step
// to a concrete action, executes it for real, attempts healing on failure,
// and always returns a genuine Playwright code line reflecting what
// actually happened (or a TODO comment if nothing could be resolved).
async function resolveAndExecuteStep(
  page: any,
  config: any,
  step: string,
  stepType: string,
  pageContext: any,
  lastResolved: LastResolved | null,
  timeout: number,
  sendEvent: (data: any) => void,
  captureScreenshot?: (label: string) => Promise<void>,
): Promise<StepExecutionOutcome> {
  let action: AIAction | null = null
  const urlBeforeAction = page.url()
  try {
    sendEvent({ type: 'aiThinking', message: 'AI analyzing step...' })
    action = await getAIAction(config, step, page.url(), await page.title(), pageContext, 0, lastResolved)

    const isActionable = ACTIONABLE_STEP_TYPES.includes(stepType)
    if (action.skip && isActionable) {
      throw new Error(`AI could not identify a target element for this step: ${action.description || step}`)
    }

    if (action.skip) {
      sendEvent({ type: 'stepResult', status: 'pass', message: `Skipped: ${action.description}` })
      return { status: 'pass', scriptLine: `// Skipped: ${action.description}`, description: action.description || step }
    }

    // CORRECTNESS signals — never healed away silently. A missing target or
    // a low-confidence guess must fail here; the healing path below only
    // gets one honest chance to prove it's the same target under drift, not
    // a chance to paper over a genuinely broken feature.
    if (action.action === 'not_found') {
      throw new Error(`AI could not find a matching element for this step: ${action.description || step}`)
    }
    if (isActionable && typeof action.confidence === 'number' && action.confidence < 0.4) {
      throw new Error(`AI has low confidence (${action.confidence.toFixed(2)}) in the chosen element for this step: ${action.description || step}`)
    }

    sendEvent({
      type: 'aiAction',
      message: `AI suggests: ${action.action} on "${action.selector}"${action.value ? ` with value "${action.value}"` : ''}`,
      action,
    })
    // Proactively clear common ad/cookie/promo overlays before acting —
    // cheap no-op if nothing is blocking, but avoids burning 10-30s on a
    // click that's doomed to be intercepted.
    await dismissOverlays(page)
    await executePlaywrightAction(page, action, step, timeout)
    await settleAfterAction(page, action, urlBeforeAction)
    await captureScreenshot?.(`After: ${step.substring(0, 40)}`)

    const resolvedEl = pageContext.visibleElements?.find((e: any) => e.idx === action!.idx) || null
    sendEvent({ type: 'stepResult', status: 'pass', message: 'Step completed' })
    return { status: 'pass', scriptLine: actionToScriptLine(action, resolvedEl), description: action.description || step }
  } catch (stepError) {
    await captureScreenshot?.(`Failed: ${step.substring(0, 40)}`)

    // Fast path: if an overlay appeared/was missed and is the actual cause,
    // dismiss it and retry the SAME action once before spending an AI call
    // on full healing.
    if (action && !action.skip) {
      const dismissed = await dismissOverlays(page)
      if (dismissed) {
        try {
          await executePlaywrightAction(page, action, step, timeout)
          await settleAfterAction(page, action, urlBeforeAction)
          await captureScreenshot?.(`After: ${step.substring(0, 40)}`)
          sendEvent({ type: 'stepResult', status: 'pass', message: 'Step completed (after dismissing an overlay)', healed: true })
          const resolvedEl = pageContext.visibleElements?.find((e: any) => e.idx === action!.idx) || null
          return { status: 'pass', scriptLine: actionToScriptLine(action, resolvedEl), description: action.description || step, healed: true }
        } catch {
          // fall through to full AI healing below
        }
      }
    }

    sendEvent({ type: 'healing', message: 'Step failed. Attempting to heal...' })
    const healResult = await attemptHealing(page, config, step, stepError as Error, pageContext, sendEvent)

    if (healResult.healed && healResult.action) {
      await captureScreenshot?.(`Healed: ${step.substring(0, 40)}`)
      sendEvent({ type: 'healed', message: 'Step healed successfully!' })
      const resolvedEl = pageContext.visibleElements?.find((e: any) => e.idx === healResult.action!.idx) || null
      return {
        status: 'pass',
        scriptLine: actionToScriptLine(healResult.action, resolvedEl),
        description: healResult.action.description || step,
        healed: true,
      }
    }

    const message = stepError instanceof Error ? stepError.message : String(stepError)
    sendEvent({ type: 'stepResult', status: 'fail', message: `Step failed: ${message}` })
    return { status: 'fail', scriptLine: `// TODO: could not resolve — ${message}`, error: message, description: step }
  }
}

// Deliberately biased toward FAIL: this is the last checkpoint before a test
// is reported as green, so ambiguity, silence, or an error must never
// resolve to "passed". A verifier that can't run is not the same as a
// verifier that confirmed nothing went wrong.
async function verifyExpectedWithAI(
  config: any,
  expected: string,
  content: string,
  url: string
): Promise<{ passed: boolean; reason: string; evidence?: string }> {
  const prompt = `You are a strict QA verifier. Decide whether the EXPECTED outcome actually occurred on the page, based ONLY on the CONTENT and URL below — no assumptions, no benefit of the doubt.

EXPECTED: "${expected}"
URL: ${url}
CONTENT: ${content.substring(0, 1500)}

DEFAULT TO FAIL. Only return passed:true if you can quote the EXACT text (or the URL) from above that concretely proves the expected outcome happened.
- Ambiguous, unrelated, or unchanged content = fail.
- Any visible error/warning message on the page = fail, even if it seems unrelated to EXPECTED.
- Absence of a failure signal is NOT evidence of success — you need positive proof.
- If EXPECTED is about navigating somewhere, the URL only counts as evidence if it concretely matches the destination described.

Reply with ONLY this JSON (no markdown):
{"passed": true|false, "reason": "...", "evidence": "<exact quoted text or URL proving it, or empty string if failing>"}`

  try {
    const text = await generateWithConfig(config, prompt, 300)
    const parsed = parseAIJson(text)
    // A "pass" with no cited evidence is an unsupported claim, not proof —
    // treat it the same as a fail rather than trusting it at face value.
    if (parsed.passed && !String(parsed.evidence || '').trim()) {
      return { passed: false, reason: `Model claimed pass without citing evidence: ${parsed.reason || 'no reason given'}`, evidence: '' }
    }
    return { passed: !!parsed.passed, reason: parsed.reason || '', evidence: parsed.evidence }
  } catch (err) {
    // A verifier that fails to run must NEVER be recorded as a pass — that
    // is exactly the silent-green failure mode this function exists to
    // prevent.
    return { passed: false, reason: `Verification failed to run: ${err instanceof Error ? err.message : String(err)}` }
  }
}

function generateHealingReport(testCases: TestCase[], results: E2ETestResult[]): string {
  const failed = results.filter(r => r.status === 'fail' || r.status === 'error')
  const healedButPassed = results.filter(r => r.status === 'pass' && r.steps.some(s => s.healed))

  if (failed.length === 0 && healedButPassed.length === 0) {
    return 'All tests passed cleanly! No healing needed.'
  }

  let report = '## Test Healing Report\n\n'

  if (failed.length > 0) {
    report += `${failed.length} test(s) failed.\n\n`
    for (const result of failed) {
      const tc = testCases.find(t => t.id === result.testCaseId)
      if (!tc) continue

      report += `### ${tc.code}: ${tc.title}\n`
      report += `**Status:** ${result.status.toUpperCase()}\n`
      report += `**Error:** ${result.error || 'Unknown'}\n\n`
      report += result.aiAnalysis
        ? `**AI Analysis:**\n${result.aiAnalysis}\n\n`
        : `**AI Analysis:** Not available.\n\n`
      report += `---\n\n`
    }
  }

  // Passed, but only after some form of recovery — worth a human's eyes
  // even though the overall status is green, since it means the resolved
  // element/action wasn't obvious on the first, honest attempt.
  if (healedButPassed.length > 0) {
    report += `${healedButPassed.length} test(s) passed but required self-healing — review before trusting these as clean passes.\n\n`
    for (const result of healedButPassed) {
      const tc = testCases.find(t => t.id === result.testCaseId)
      if (!tc) continue

      report += `### ${tc.code}: ${tc.title} (passed with healing)\n`
      for (const s of result.steps.filter(s => s.healed)) {
        report += `- Healed: "${s.step}"\n`
      }
      report += `\n---\n\n`
    }
  }

  return report
}

async function executePlaywrightAction(page: any, action: AIAction, step: string, timeout: number) {
  // Sites overlay their real content with all kinds of things we have no
  // way to know about in advance — ad iframes, chat widgets, sticky
  // headers, hover-triggered interstitials with arbitrary vendor naming.
  // Rather than trying to recognize any of that, the LAST attempt simply
  // force-clicks: it skips Playwright's actionability/interception check
  // and clicks at the target's coordinates regardless of what's currently
  // rendered on top. This works the same way on every site, without
  // needing to know anything about what's blocking the click.
  const maxRetries = 1

  if (action.action === 'navigate') {
    const url = action.value || action.selector
    if (!url || !url.startsWith('http')) return
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const forceClick = action.action === 'click' && attempt === maxRetries
    try {
      switch (action.action) {
        case 'click':
          await page.locator(action.selector).click({ timeout, force: forceClick })
          break
        case 'fill':
          await page.locator(action.selector).fill(action.value || '', { timeout })
          break
        case 'navigate':
          const navUrl = action.value || action.selector
          if (navUrl && navUrl.startsWith('http')) {
            await page.goto(navUrl, { timeout, waitUntil: 'domcontentloaded' })
          }
          break
        case 'wait':
          if (action.selector && action.selector !== 'body') {
            await page.locator(action.selector).waitFor({ state: 'visible', timeout })
          } else {
            await page.waitForTimeout(parseInt(action.value || '1000') || 1000)
          }
          break
        case 'assert':
          await page.locator(action.selector).waitFor({ state: 'visible', timeout })
          break
        case 'select':
          await page.locator(action.selector).selectOption(action.value || '', { timeout })
          break
        case 'check':
          await page.locator(action.selector).check({ timeout })
          break
        case 'press':
          await page.keyboard.press(action.value || 'Enter')
          break
        case 'hover':
          await page.locator(action.selector).hover({ timeout })
          break
        case 'scroll':
          await page.locator(action.selector).scrollIntoViewIfNeeded({ timeout })
          break
        default:
          return
      }
      return
    } catch (error) {
      if (attempt === maxRetries) throw error
      await page.waitForTimeout(500)
    }
  }
}
