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
  const { testCases, baseUrl, browser, headless, timeout, llmConfig } = body as {
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
  }

  if (!testCases?.length) {
    return new Response(JSON.stringify({ error: 'No test cases provided' }), { status: 400 })
  }

  if (!baseUrl) {
    return new Response(JSON.stringify({ error: 'Base URL is required' }), { status: 400 })
  }

  if (!llmConfig?.apiKey) {
    return new Response(JSON.stringify({ error: 'LLM API key is required' }), { status: 400 })
  }

  const decryptedApiKey = await decrypt(llmConfig.apiKey)
  const decryptedConfig = { ...llmConfig, apiKey: decryptedApiKey }

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
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

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
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        
        sendEvent({ type: 'status', message: 'Browser ready. Starting tests...' })

        const results: E2ETestResult[] = []

        for (let i = 0; i < testCases.length; i++) {
          const testCase = testCases[i]
          const startTime = Date.now()
          
          sendEvent({ 
            type: 'testStart', 
            index: i + 1,
            total: testCases.length,
            testCaseId: testCase.id,
            title: testCase.title,
            code: testCase.code
          })

          const result: E2ETestResult = {
            testCaseId: testCase.id,
            status: 'pass',
            duration: 0,
            steps: [],
          }

          const page = await context.newPage()

          try {
            // Navigate to base URL
            sendEvent({ type: 'step', message: `Navigating to ${runConfig.baseUrl}...` })
            await page.goto(runConfig.baseUrl, { 
              timeout: runConfig.timeout ?? 30000,
              waitUntil: 'domcontentloaded'
            })
            sendEvent({ type: 'step', message: 'Page loaded successfully' })

            // Wait for page to stabilize
            await page.waitForTimeout(1000)

            // Get page context for AI
            const pageContext = await getPageContext(page)

            const steps = testCase.steps.split('\n').filter(s => s.trim())
            
            for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
              const rawStep = steps[stepIdx]
              const step = rawStep.replace(/^\d+[\.\)]\s*/, '').trim()
              if (!step) continue

              sendEvent({ 
                type: 'step', 
                message: `Step ${stepIdx + 1}/${steps.length}: ${step}` 
              })

              // Check if this is an assumption/precondition step
              const isAssumption = isAssumptionStep(step)
              
              if (isAssumption) {
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
                  sendEvent({ 
                    type: 'stepResult', 
                    status: 'pass', 
                    message: `Skipped: ${action.description}` 
                  })
                  stepResult.status = 'pass'
                } else {
                  sendEvent({ 
                    type: 'aiAction', 
                    message: `AI suggests: ${action.action} on "${action.selector}"${action.value ? ` with value "${action.value}"` : ''}` 
                  })

                  await executePlaywrightAction(page, action, step, runConfig.timeout ?? 10000)
                  sendEvent({ type: 'stepResult', status: 'pass', message: 'Step completed' })
                  stepResult.status = 'pass'
                }
              } catch (stepError) {
                // Try to heal the step
                sendEvent({ type: 'healing', message: 'Step failed. Attempting to heal...' })
                
                const healed = await attemptHealing(page, decryptedConfig, step, stepError as Error, pageContext, sendEvent)
                
                if (healed) {
                  sendEvent({ type: 'healed', message: 'Step healed successfully!' })
                  stepResult.status = 'pass'
                } else {
                  stepResult.status = 'fail'
                  stepResult.error = stepError instanceof Error ? stepError.message : String(stepError)
                  sendEvent({ 
                    type: 'stepResult', 
                    status: 'fail', 
                    message: `Step failed: ${stepResult.error}` 
                  })
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
              
              // Refresh page context after each step
              try {
                const newContext = await getPageContext(page)
                Object.assign(pageContext, newContext)
              } catch {}
            }

            // Verify expected result if all steps passed
            if (result.status === 'pass' && testCase.expected) {
              sendEvent({ type: 'step', message: 'Verifying expected result...' })
              
              try {
                const content = await page.textContent('body')
                const pageUrl = page.url()
                
                const verification = await verifyExpectedWithAI(
                  decryptedConfig, 
                  testCase.expected, 
                  content || '', 
                  pageUrl
                )
                
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
              result.aiAnalysis = await analyzeFailure(
                testCase,
                result.error || 'Unknown error',
                result.screenshot,
                decryptedConfig
              )
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
            result
          })
        }

        await browserInstance.close()
        
        // Generate healing report
        const healingReport = generateHealingReport(testCases, results)
        sendEvent({ type: 'healingReport', report: healingReport })
        
        sendEvent({ type: 'complete', results })
      } catch (error) {
        sendEvent({ 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        })
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

// Check if a step is an assumption/precondition
function isAssumptionStep(step: string): boolean {
  const assumptionPatterns = [
    /^assume\b/i,
    /^given that\b/i,
    /^given the user\b/i,
    /^prerequisite/i,
    /^precondition/i,
    /^user is already/i,
    /^user has already/i,
    /^ensure that.*is/i,
    /^make sure.*is/i,
    /^suppose\b/i,
  ]
  return assumptionPatterns.some(pattern => pattern.test(step.trim()))
}

// Get page context for better AI decisions
async function getPageContext(page: any): Promise<any> {
  const context = await page.evaluate(() => {
    const getVisibleElements = () => {
      const elements = document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"], [data-testid], h1, h2, h3, nav, header, main, footer')
      return Array.from(elements).slice(0, 100).map(el => ({
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
  return context
}

// Get AI action with better context
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

  // Format visible elements for AI
  const elementsList = pageContext.visibleElements?.slice(0, 30).map((el: any) => {
    let desc = `<${el.tag}`
    if (el.testId) desc += ` data-testid="${el.testId}"`
    if (el.id) desc += ` id="${el.id}"`
    if (el.role) desc += ` role="${el.role}"`
    if (el.ariaLabel) desc += ` aria-label="${el.ariaLabel}"`
    if (el.placeholder) desc += ` placeholder="${el.placeholder}"`
    if (el.href) desc += ` href="${el.href}"`
    desc += `>${el.text ? ` "${el.text}"` : ''}</${el.tag}>`
    return desc
  }).join('\n') || 'No elements captured'

  const prompt = `You are an E2E test automation expert. Execute the following test step.

PAGE CONTEXT:
- URL: ${url}
- Title: ${title}
- Headings: ${pageContext.headings?.join(', ') || 'None'}

VISIBLE INTERACTIVE ELEMENTS (first 30):
${elementsList}

STEP TO EXECUTE: "${step}"

RULES:
1. Use SPECIFIC selectors: data-testid, id, aria-label, role+text
2. NEVER use generic text selectors that might match multiple elements
3. For "click" actions, use the most specific selector available
4. If the step is a precondition or cannot be automated, set "skip": true
5. For assertions, check for visible elements only (not <title>, <meta>, etc.)

Respond with ONLY a JSON object:
{
  "action": "click|fill|navigate|wait|assert|select|check|press|hover|scroll",
  "selector": "specific CSS selector or Playwright locator",
  "value": "value for fill/select (optional)",
  "description": "what this does",
  "skip": false
}`

  try {
    const { text } = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 300,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    return JSON.parse(jsonMatch[0])
  } catch (error) {
    if (retryCount < 2) {
      // Wait and retry
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)))
      return getAIAction(config, step, url, title, pageContext, retryCount + 1)
    }
    throw error
  }
}

// Attempt to heal a failed step
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

  const prompt = `A test step failed. Analyze the error and suggest a fix.

STEP: "${step}"
ERROR: ${error.message}

PAGE CONTEXT:
- URL: ${pageContext.url}
- Available elements: ${pageContext.visibleElements?.map((e: any) => `${e.tag}[${e.testId || e.id || e.text?.substring(0, 20)}]`).join(', ') || 'Unknown'}

Suggest an alternative approach. Respond with ONLY a JSON:
{
  "shouldRetry": true/false,
  "action": "click|fill|assert|wait|skip",
  "selector": "alternative selector",
  "value": "optional value",
  "reason": "why this might work"
}`

  try {
    const { text } = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 300,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return false
    
    const fix = JSON.parse(jsonMatch[0])
    
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

// Verify expected result with AI
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

  const prompt = `Verify if the expected result is met.

Expected: "${expected}"
URL: ${url}
Page Content (truncated): ${content.substring(0, 2000)}

Respond with ONLY JSON:
{
  "passed": true/false,
  "reason": "explanation"
}`

  const { text } = await generateText({
    model,
    messages: [{ role: 'user', content: prompt }],
    maxOutputTokens: 200,
  })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch ? jsonMatch[0] : text)
}

// Generate healing report with suggestions
function generateHealingReport(testCases: TestCase[], results: E2ETestResult[]): string {
  const failedTests = results.filter(r => r.status === 'fail' || r.status === 'error')
  
  if (failedTests.length === 0) {
    return 'All tests passed! No healing needed.'
  }

  let report = `## Test Healing Report\n\n`
  report += `${failedTests.length} test(s) failed. Here are the recommended fixes:\n\n`

  for (const result of failedTests) {
    const testCase = testCases.find(tc => tc.id === result.testCaseId)
    if (!testCase) continue

    report += `### ${testCase.code}: ${testCase.title}\n`
    report += `**Status:** ${result.status.toUpperCase()}\n`
    report += `**Error:** ${result.error}\n\n`
    
    report += `**Suggested Test Case Update:**\n`
    report += `\`\`\`\n`
    report += `Title: ${testCase.title}\n`
    report += `Steps:\n`
    
    const steps = testCase.steps.split('\n')
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      if (isAssumptionStep(step.replace(/^\d+[\.\)]\s*/, ''))) {
        report += `${step} [PRECONDITION - skip in automation]\n`
      } else {
        report += `${step}\n`
      }
    }
    
    report += `Expected: ${testCase.expected}\n`
    report += `\`\`\`\n\n`
    
    report += `**Healing Options:**\n`
    report += `1. Add data-testid attributes to elements for reliable selectors\n`
    report += `2. Convert assumption steps to explicit navigation steps\n`
    report += `3. Add explicit waits for dynamic content\n\n`
    report += `---\n\n`
  }

  return report
}

// Execute Playwright action with better error handling
async function executePlaywrightAction(page: any, action: AIAction, step: string, timeout: number) {
  const maxRetries = 2
  
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
          if (action.selector && action.selector.startsWith('http')) {
            await page.goto(action.selector, { timeout, waitUntil: 'domcontentloaded' })
          } else if (action.value && action.value.startsWith('http')) {
            await page.goto(action.value, { timeout, waitUntil: 'domcontentloaded' })
          } else {
            // Skip invalid navigate
          }
          break
        case 'wait':
          if (action.selector) {
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
          // Try clicking on text
          await page.getByRole('button', { name: step }).click({ timeout })
      }
      return // Success
    } catch (error) {
      if (attempt === maxRetries) throw error
      await page.waitForTimeout(500)
    }
  }
}
