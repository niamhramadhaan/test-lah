import { NextRequest } from 'next/server'
import type { E2ERunConfig, E2ETestResult, StepResult } from '@/lib/e2e-agent'
import { analyzeFailure } from '@/lib/e2e-agent'
import { decrypt } from '@/lib/crypto'
import type { TestCase } from '@/types'

interface AIAction {
  action: string
  selector: string
  value?: string
  description: string
  skip?: boolean
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

  if (!llmConfig?.apiKey) {
    return new Response(JSON.stringify({ error: 'LLM API key is required' }), { status: 400 })
  }

  const decryptedApiKey = await decrypt(llmConfig.apiKey)
  const decryptedConfig = { ...llmConfig, apiKey: decryptedApiKey }

  // Generate-only mode: just return generated scripts without executing
  if (generateOnly) {
    const scripts: Record<string, string> = {}
    for (const tc of testCases) {
      scripts[tc.id] = generatePlaywrightScript(tc, baseUrl || 'http://localhost:3000')
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
        
        const launchOptions: any = { headless: runConfig.headless ?? true }
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
          
          // Generate the test script
          const script = generatePlaywrightScript(testCase, runConfig.baseUrl)
          
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
            
            // Capture initial page screenshot
            await captureScreenshot('Page loaded')

            const pageContext = await getPageContext(page)
            const steps = testCase.steps.split('\n').filter(s => s.trim())
            
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
                continue
              }

              const stepResult: StepResult = { step, status: 'pass' }

              try {
                sendEvent({ type: 'aiThinking', message: 'AI analyzing step...' })
                const action = await getAIAction(decryptedConfig, step, page.url(), await page.title(), pageContext)
                
                if (action.skip) {
                  sendEvent({ type: 'stepResult', status: 'pass', message: `Skipped: ${action.description}` })
                  stepResult.status = 'pass'
                } else {
                  sendEvent({ 
                    type: 'aiAction', 
                    message: `AI suggests: ${action.action} on "${action.selector}"${action.value ? ` with value "${action.value}"` : ''}`,
                    action
                  })
                  
                  await executePlaywrightAction(page, action, step, runConfig.timeout ?? 10000)
                  
                  // Capture screenshot after action
                  await captureScreenshot(`After: ${step.substring(0, 40)}`)
                  
                  sendEvent({ type: 'stepResult', status: 'pass', message: 'Step completed' })
                  stepResult.status = 'pass'
                }
              } catch (stepError) {
                // Capture failure screenshot
                await captureScreenshot(`Failed: ${step.substring(0, 40)}`)
                
                sendEvent({ type: 'healing', message: 'Step failed. Attempting to heal...' })
                const healed = await attemptHealing(page, decryptedConfig, step, stepError as Error, pageContext, sendEvent)
                
                if (healed) {
                  await captureScreenshot(`Healed: ${step.substring(0, 40)}`)
                  sendEvent({ type: 'healed', message: 'Step healed successfully!' })
                  stepResult.status = 'pass'
                } else {
                  stepResult.status = 'fail'
                  stepResult.error = stepError instanceof Error ? stepError.message : String(stepError)
                  sendEvent({ type: 'stepResult', status: 'fail', message: `Step failed: ${stepResult.error}` })
                }

                if (runConfig.screenshotOnFailure && stepResult.status === 'fail') {
                  const screenshot = await page.screenshot({ type: 'png' })
                  stepResult.screenshot = screenshot.toString('base64')
                }
              }

              result.steps.push(stepResult)
              if (stepResult.status === 'fail') {
                result.status = 'fail'
                break
              }
              
              try {
                const newContext = await getPageContext(page)
                Object.assign(pageContext, newContext)
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
                  sendEvent({ type: 'stepResult', status: 'pass', message: 'Expected result verified' })
                }
              } catch (verifyError) {
                result.status = 'fail'
                result.error = verifyError instanceof Error ? verifyError.message : String(verifyError)
                sendEvent({ type: 'stepResult', status: 'fail', message: `Verification error: ${result.error}` })
              }
            }

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

// Generate Playwright test script from test case
function generatePlaywrightScript(testCase: TestCase, baseUrl: string): string {
  const steps = testCase.steps.split('\n').filter(s => s.trim())
  const stepLines = steps.map((step, i) => {
    const clean = step.replace(/^\d+[\.\)]\s*/, '').trim()
    if (isAssumptionStep(clean)) {
      return `    // Precondition: ${clean}`
    }
    return `    // Step ${i + 1}: ${clean}
    // TODO: Implement with proper selectors`
  }).join('\n')

  return `import { test, expect } from '@playwright/test';

test.describe('${testCase.code}: ${testCase.title.replace(/'/g, "\\'")}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${baseUrl}');
  });

  test('should execute test case', async ({ page }) => {
${stepLines}

    // Expected: ${testCase.expected || 'Verify expected result'}
    // TODO: Add assertion
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

async function getPageContext(page: any): Promise<any> {
  return page.evaluate(() => {
    const getVisibleElements = () => {
      const els = document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"], [data-testid], h1, h2, h3, nav, header, main, footer')
      return Array.from(els).slice(0, 50).map(el => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 50) || '',
        id: el.id || '',
        testId: el.getAttribute('data-testid') || '',
        className: el.className?.toString().substring(0, 50) || '',
        href: (el as HTMLAnchorElement).href || '',
        type: (el as HTMLInputElement).type || '',
        placeholder: (el as HTMLInputElement).placeholder || '',
        role: el.getAttribute('role') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
      }))
    }
    return {
      url: window.location.href,
      title: document.title,
      visibleElements: getVisibleElements(),
      headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()).filter(Boolean).slice(0, 10),
    }
  })
}

function parseAIJson(text: string): any {
  let clean = text.trim()
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  const match = clean.match(/\{[^{}]*\}/)
  if (!match) throw new Error('No JSON found')
  return JSON.parse(match[0])
}

function classifyStep(step: string): string {
  if (/navigate|go to|open|visit|browse to/i.test(step)) return 'navigate'
  if (/verify|check|assert|confirm|ensure|presence|visible|display|should be|should show/i.test(step)) return 'verify'
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
  retryCount = 0
): Promise<AIAction> {
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

  const stepType = classifyStep(step)
  
  const elements = pageContext.visibleElements?.slice(0, 40) || []
  const elementsList = elements.map((el: any, i: number) => {
    const attrs = []
    if (el.testId) attrs.push(`data-testid="${el.testId}"`)
    if (el.id) attrs.push(`id="${el.id}"`)
    if (el.role) attrs.push(`role="${el.role}"`)
    if (el.ariaLabel) attrs.push(`aria-label="${el.ariaLabel}"`)
    if (el.placeholder) attrs.push(`placeholder="${el.placeholder}"`)
    if (el.href) attrs.push(`href="${el.href}"`)
    return `[${i}] <${el.tag} ${attrs.join(' ')}>${el.text ? ` "${el.text}"` : ''}`
  }).join('\n') || 'No elements found'

  let guidance = ''
  switch (stepType) {
    case 'navigate':
      guidance = 'NAVIGATION: Extract URL from step. If already on that page, use action "wait" with value "500". Put URL in "value" field.'
      break
    case 'verify':
      guidance = 'VERIFY: Find an element that should be visible. Use action "assert" with a specific selector. Check the element list above.'
      break
    case 'click':
      guidance = 'CLICK: Find the target element in the list. Use the most specific selector available.'
      break
    case 'fill':
      guidance = 'FILL: Find the input field. Put the text to type in "value" field.'
      break
  }

  const prompt = `Execute this E2E test step.

PAGE: ${url} (${title})
HEADINGS: ${pageContext.headings?.join(', ') || 'None'}

ELEMENTS:
${elementsList}

STEP: "${step}"
TYPE: ${stepType}

${guidance}

RULES:
- Use specific selectors: data-testid, id, aria-label
- NEVER return empty selector
- For navigate, put full URL in "value"
- If step cannot be automated, set skip=true

Reply with ONLY this JSON (no markdown):
{"action":"click|fill|navigate|wait|assert|hover","selector":"...","value":"...","description":"...","skip":false}`

  try {
    const { text } = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 300,
    })

    const parsed = parseAIJson(text)
    
    if (!parsed.selector || parsed.selector === '') {
      if (stepType === 'navigate') {
        const urlMatch = step.match(/https?:\/\/[^\s]+/)
        parsed.selector = urlMatch ? urlMatch[0] : url
        parsed.value = parsed.selector
        parsed.action = 'navigate'
      } else if (stepType === 'verify') {
        parsed.selector = 'body'
        parsed.action = 'assert'
      } else {
        parsed.selector = 'body'
      }
    }
    
    const validActions = ['click', 'fill', 'navigate', 'wait', 'assert', 'select', 'check', 'press', 'hover', 'scroll', 'skip']
    if (!validActions.includes(parsed.action)) {
      parsed.action = stepType === 'verify' ? 'assert' : 'wait'
    }
    
    return parsed
  } catch (error) {
    if (retryCount < 2) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)))
      return getAIAction(config, step, url, title, pageContext, retryCount + 1)
    }
    
    if (stepType === 'navigate') {
      const urlMatch = step.match(/https?:\/\/[^\s]+/)
      return { action: 'navigate', selector: urlMatch ? urlMatch[0] : url, value: url, description: step, skip: false }
    }
    if (stepType === 'verify') {
      return { action: 'assert', selector: 'body', description: step, skip: false }
    }
    return { action: 'wait', selector: 'body', value: '500', description: step, skip: false }
  }
}

async function attemptHealing(
  page: any,
  config: any,
  step: string,
  error: Error,
  pageContext: any,
  sendEvent: (data: any) => void
): Promise<boolean> {
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

  const elements = pageContext.visibleElements?.slice(0, 20).map((e: any) => 
    `${e.tag}[${e.testId || e.id || e.text?.substring(0, 20)}]`
  ).join(', ') || 'Unknown'

  const prompt = `Fix failed E2E step.

STEP: "${step}"
ERROR: ${error.message}
ELEMENTS: ${elements}

Reply with ONLY this JSON:
{"shouldRetry":true,"action":"click|assert|wait|skip","selector":"...","value":"...","reason":"..."}

If cannot fix: {"shouldRetry":false}`

  try {
    const { text } = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 200,
    })

    const fix = parseAIJson(text)
    if (!fix.shouldRetry) return false
    
    sendEvent({ type: 'healingAction', message: `Trying: ${fix.action} on "${fix.selector}" - ${fix.reason}` })
    
    const timeout = 5000
    switch (fix.action) {
      case 'click':
        await page.locator(fix.selector).click({ timeout })
        return true
      case 'fill':
        await page.locator(fix.selector).fill(fix.value || '', { timeout })
        return true
      case 'assert':
        await page.locator(fix.selector).waitFor({ state: 'visible', timeout })
        return true
      case 'wait':
        await page.waitForTimeout(parseInt(fix.value) || 2000)
        return true
      case 'skip':
        return true
      default:
        return false
    }
  } catch {
    return false
  }
}

async function verifyExpectedWithAI(
  config: any, 
  expected: string, 
  content: string, 
  url: string
): Promise<{ passed: boolean; reason: string }> {
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

  const prompt = `Verify E2E test result.

EXPECTED: "${expected}"
URL: ${url}
CONTENT: ${content.substring(0, 1500)}

Reply with ONLY JSON:
{"passed":true,"reason":"..."}`

  try {
    const { text } = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 200,
    })
    return parseAIJson(text)
  } catch {
    return { passed: true, reason: 'Verification skipped' }
  }
}

function generateHealingReport(testCases: TestCase[], results: E2ETestResult[]): string {
  const failed = results.filter(r => r.status === 'fail' || r.status === 'error')
  if (failed.length === 0) return 'All tests passed! No healing needed.'

  let report = '## Test Healing Report\n\n'
  report += `${failed.length} test(s) failed.\n\n`

  for (const result of failed) {
    const tc = testCases.find(t => t.id === result.testCaseId)
    if (!tc) continue

    report += `### ${tc.code}: ${tc.title}\n`
    report += `**Status:** ${result.status.toUpperCase()}\n`
    report += `**Error:** ${result.error || 'Unknown'}\n\n`
    report += `**Suggested Fixes:**\n`
    report += `1. Add data-testid attributes to elements\n`
    report += `2. Convert assumption steps to explicit navigation\n`
    report += `3. Add explicit waits for dynamic content\n\n`
    report += `---\n\n`
  }

  return report
}

async function executePlaywrightAction(page: any, action: AIAction, step: string, timeout: number) {
  const maxRetries = 2
  
  if (action.action === 'navigate') {
    const url = action.value || action.selector
    if (!url || !url.startsWith('http')) return
  }
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      switch (action.action) {
        case 'click':
          await page.locator(action.selector).click({ timeout, strict: true })
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
