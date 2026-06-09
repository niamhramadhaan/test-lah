import { NextRequest } from 'next/server'
import type { E2ERunConfig, E2ETestResult, StepResult } from '@/lib/e2e-agent'
import { analyzeFailure } from '@/lib/e2e-agent'
import { decrypt } from '@/lib/crypto'
import type { TestCase } from '@/types'

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

  // Decrypt API key if encrypted
  const decryptedApiKey = await decrypt(llmConfig.apiKey)
  const decryptedConfig = {
    ...llmConfig,
    apiKey: decryptedApiKey,
  }

  const runConfig: E2ERunConfig = {
    baseUrl,
    browser: browser || 'chromium',
    headless: headless ?? true,
    timeout: timeout ?? 30000,
    screenshotOnFailure: true,
  }

  // Create a ReadableStream for SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // Import Playwright
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
        const context = await browserInstance.newContext()
        
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
              timeout: runConfig.timeout ?? 30000 
            })
            sendEvent({ type: 'step', message: 'Page loaded successfully' })

            // Parse and execute steps
            const steps = testCase.steps.split('\n').filter(s => s.trim())
            
            for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
              const step = steps[stepIdx].replace(/^\d+[\.\)]\s*/, '').trim()
              if (!step) continue

              sendEvent({ 
                type: 'step', 
                message: `Step ${stepIdx + 1}/${steps.length}: ${step}` 
              })

              const stepResult: StepResult = {
                step,
                status: 'pass',
              }

              try {
                // Get page context for AI
                const url = page.url()
                const title = await page.title()
                
                sendEvent({ type: 'aiThinking', message: 'AI analyzing step...' })
                
                // Execute step with AI
                const action = await getAIAction(decryptedConfig, step, url, title)
                
                sendEvent({ 
                  type: 'aiAction', 
                  message: `AI suggests: ${action.action} on "${action.selector}"${action.value ? ` with value "${action.value}"` : ''}` 
                })

                // Execute the action
                await executePlaywrightAction(page, action, step, runConfig.timeout ?? 10000)
                
                sendEvent({ type: 'stepResult', status: 'pass', message: `Step completed` })
                stepResult.status = 'pass'
              } catch (stepError) {
                stepResult.status = 'fail'
                stepResult.error = stepError instanceof Error ? stepError.message : String(stepError)
                
                sendEvent({ 
                  type: 'stepResult', 
                  status: 'fail', 
                  message: `Step failed: ${stepResult.error}` 
                })

                if (runConfig.screenshotOnFailure) {
                  const screenshot = await page.screenshot({ type: 'png' })
                  stepResult.screenshot = screenshot.toString('base64')
                }
              }

              result.steps.push(stepResult)

              if (stepResult.status === 'fail') {
                result.status = 'fail'
                break
              }
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

          // Analyze failure with AI
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
            } catch (e) {
              // Ignore analysis errors
            }
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

// Helper functions
async function getAIAction(config: any, step: string, url: string, title: string) {
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

  const prompt = `You are executing an E2E test step. Based on the step description, determine what Playwright action to perform.

Current URL: ${url}
Page Title: ${title}
Step: "${step}"

Respond with ONLY a JSON object (no code block) in this format:
{
  "action": "click|fill|navigate|wait|assert|select|check|press",
  "selector": "CSS selector or Playwright locator",
  "value": "value for fill/select actions (optional)",
  "description": "brief description of what this does"
}

Use robust selectors: [data-testid], role=, text=, or CSS. Avoid fragile selectors.`

  const { text } = await generateText({
    model,
    messages: [{ role: 'user', content: prompt }],
    maxOutputTokens: 200,
  })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch ? jsonMatch[0] : text)
}

async function executePlaywrightAction(page: any, action: any, step: string, timeout: number) {
  try {
    switch (action.action) {
      case 'click':
        await page.locator(action.selector).click({ timeout })
        break
      case 'fill':
        await page.locator(action.selector).fill(action.value || '', { timeout })
        break
      case 'navigate':
        await page.goto(action.selector, { timeout })
        break
      case 'wait':
        if (action.selector) {
          await page.locator(action.selector).waitFor({ timeout })
        } else {
          await page.waitForTimeout(parseInt(action.value) || 1000)
        }
        break
      case 'assert':
        const isVisible = await page.locator(action.selector).isVisible({ timeout })
        if (!isVisible) {
          throw new Error(`Element ${action.selector} is not visible`)
        }
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
      default:
        await page.getByText(step, { exact: false }).click({ timeout })
    }
  } catch (error) {
    throw new Error(`Failed to execute step "${step}": ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function verifyExpectedWithAI(config: any, expected: string, content: string, url: string) {
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

  const prompt = `Verify if the expected result is met based on the current page state.

Expected Result: "${expected}"
Current URL: ${url}
Page Content (truncated): ${content.substring(0, 2000)}

Respond with ONLY a JSON object (no code block):
{
  "passed": true/false,
  "reason": "brief explanation"
}`

  const { text } = await generateText({
    model,
    messages: [{ role: 'user', content: prompt }],
    maxOutputTokens: 200,
  })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch ? jsonMatch[0] : text)
}
