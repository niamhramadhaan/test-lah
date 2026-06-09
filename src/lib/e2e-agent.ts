'use server'

import { generateText } from 'ai'
import { createModel, type ProviderConfig } from '@/lib/llm/index'
import { getProviderDef } from '@/lib/llm/providers'
import type { TestCase } from '@/types'

export interface E2ETestResult {
  testCaseId: string
  status: 'pass' | 'fail' | 'skip' | 'error'
  error?: string
  screenshot?: string
  duration: number
  steps: StepResult[]
  aiAnalysis?: string
}

export interface StepResult {
  step: string
  status: 'pass' | 'fail' | 'skip'
  error?: string
  screenshot?: string
}

export interface E2ERunConfig {
  baseUrl: string
  headless?: boolean
  timeout?: number
  screenshotOnFailure?: boolean
}

interface E2ELLMConfig {
  provider: string
  model: string
  apiKey: string
  baseURL?: string
}

/**
 * Create a model from E2E LLM config
 */
function createE2EModel(config: E2ELLMConfig) {
  const providerDef = getProviderDef(config.provider)
  
  return createModel({
    def: providerDef,
    apiKey: config.apiKey,
    model: config.model,
    baseURL: config.baseURL,
  })
}

/**
 * Generate Playwright test code from a test case using AI
 */
export async function generateTestCode(
  testCase: TestCase,
  config: E2ELLMConfig
): Promise<string> {
  const model = createE2EModel(config)

  const prompt = `You are an expert E2E test engineer. Generate Playwright test code for the following test case.

Test Case Title: ${testCase.title}
Test Steps:
${testCase.steps}
Expected Result:
${testCase.expected}

Requirements:
1. Use @playwright/test imports
2. Use test.describe and test functions
3. Add proper assertions
4. Use data-testid, role, or text selectors when possible
5. Add comments for each step
6. Handle waits properly (no hard-coded sleeps)
7. The test should be self-contained and robust

Return ONLY the TypeScript code, no explanations.`

  const messages: any[] = [
    { role: 'user', content: prompt }
  ]

  const { text } = await generateText({
    model,
    messages,
    maxOutputTokens: 2000,
  })

  // Extract code from response
  const codeMatch = text.match(/```(?:typescript|ts)?\n([\s\S]*?)```/)
  return codeMatch ? codeMatch[1].trim() : text.trim()
}

/**
 * Analyze test failure using AI
 */
export async function analyzeFailure(
  testCase: TestCase,
  error: string,
  screenshot: string | undefined,
  config: E2ELLMConfig
): Promise<string> {
  const model = createE2EModel(config)

  const prompt = `You are an expert QA engineer analyzing an E2E test failure.

Test Case: ${testCase.title}
Steps: ${testCase.steps}
Expected: ${testCase.expected}
Error: ${error}

Provide a brief analysis:
1. Root cause (likely)
2. Whether this is a test issue or application bug
3. Suggested fix or next steps`

  const messages: any[] = [
    { role: 'user', content: prompt }
  ]

  const { text } = await generateText({
    model,
    messages,
    maxOutputTokens: 500,
  })

  return text
}

/**
 * Execute a single test case using Playwright
 */
export async function executeTestCase(
  testCase: TestCase,
  runConfig: E2ERunConfig,
  llmConfig: E2ELLMConfig
): Promise<E2ETestResult> {
  const startTime = Date.now()
  const result: E2ETestResult = {
    testCaseId: testCase.id,
    status: 'pass',
    duration: 0,
    steps: [],
  }

  try {
    // Use dynamic import for Playwright in Node.js context
    const { chromium } = await import('playwright')
    
    const browser = await chromium.launch({ 
      headless: runConfig.headless ?? true 
    })
    const context = await browser.newContext()
    const page = await context.newPage()
    
    // Parse steps and execute them
    const steps = testCase.steps.split('\n').filter(s => s.trim())
    const stepResults: StepResult[] = []
    let currentStep = ''
    
    try {
      // Navigate to base URL
      await page.goto(runConfig.baseUrl, { 
        timeout: runConfig.timeout ?? 30000 
      })
      
      // Execute each step with AI guidance
      for (const step of steps) {
        currentStep = step.replace(/^\d+[\.\)]\s*/, '').trim()
        if (!currentStep) continue
        
        const stepResult: StepResult = {
          step: currentStep,
          status: 'pass',
        }
        
        try {
          // Use AI to interpret and execute the step
          await executeStep(page, currentStep, llmConfig)
          stepResult.status = 'pass'
        } catch (stepError) {
          stepResult.status = 'fail'
          stepResult.error = stepError instanceof Error ? stepError.message : String(stepError)
          
          if (runConfig.screenshotOnFailure) {
            const screenshot = await page.screenshot({ type: 'png' })
            stepResult.screenshot = screenshot.toString('base64')
          }
        }
        
        stepResults.push(stepResult)
        
        // Stop on first failure
        if (stepResult.status === 'fail') {
          result.status = 'fail'
          break
        }
      }
      
      // Verify expected result if all steps passed
      if (result.status === 'pass' && testCase.expected) {
        try {
          await verifyExpected(page, testCase.expected, llmConfig)
          result.status = 'pass'
        } catch (verifyError) {
          result.status = 'fail'
          result.error = verifyError instanceof Error ? verifyError.message : String(verifyError)
          
          if (runConfig.screenshotOnFailure) {
            const screenshot = await page.screenshot({ type: 'png' })
            result.screenshot = screenshot.toString('base64')
          }
        }
      }
      
    } catch (executionError) {
      result.status = 'error'
      result.error = executionError instanceof Error ? executionError.message : String(executionError)
    }
    
    await browser.close()
    
    result.steps = stepResults
    result.duration = Date.now() - startTime
    
    // Analyze failure with AI if test failed
    if (result.status === 'fail' || result.status === 'error') {
      result.aiAnalysis = await analyzeFailure(
        testCase,
        result.error || 'Unknown error',
        result.screenshot,
        llmConfig
      )
    }
    
  } catch (error) {
    result.status = 'error'
    result.error = error instanceof Error ? error.message : String(error)
    result.duration = Date.now() - startTime
  }

  return result
}

/**
 * Execute a single step using AI to interpret the action
 */
async function executeStep(
  page: any, // Playwright Page
  step: string,
  config: E2ELLMConfig
): Promise<void> {
  const model = createE2EModel(config)
  
  // Get page context
  const url = page.url()
  const title = await page.title()
  
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

  const messages: any[] = [
    { role: 'user', content: prompt }
  ]

  const { text } = await generateText({
    model,
    messages,
    maxOutputTokens: 200,
  })

  let action: any
  try {
    // Try to parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    action = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    throw new Error(`Failed to parse AI response for step: ${step}`)
  }

  const timeout = 10000
  
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
        // Simple visibility check
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
        // Try to click on text matching the step
        await page.getByText(step, { exact: false }).click({ timeout })
    }
  } catch (error) {
    throw new Error(`Failed to execute step "${step}": ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Verify expected result using AI
 */
async function verifyExpected(
  page: any,
  expected: string,
  config: E2ELLMConfig
): Promise<void> {
  const model = createE2EModel(config)
  
  // Get page content for verification
  const content = await page.textContent('body')
  const url = page.url()
  
  const prompt = `Verify if the expected result is met based on the current page state.

Expected Result: "${expected}"
Current URL: ${url}
Page Content (truncated): ${content?.substring(0, 2000)}

Respond with ONLY a JSON object (no code block):
{
  "passed": true/false,
  "reason": "brief explanation"
}`

  const messages: any[] = [
    { role: 'user', content: prompt }
  ]

  const { text } = await generateText({
    model,
    messages,
    maxOutputTokens: 200,
  })

  let verification: any
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    verification = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    throw new Error('Failed to parse verification result')
  }

  if (!verification.passed) {
    throw new Error(`Expected result not met: ${verification.reason}`)
  }
}

/**
 * Run multiple test cases and return results
 */
export async function runE2ETests(
  testCases: TestCase[],
  runConfig: E2ERunConfig,
  llmConfig: E2ELLMConfig,
  onProgress?: (testCaseId: string, result: E2ETestResult) => void
): Promise<E2ETestResult[]> {
  const results: E2ETestResult[] = []
  
  for (const testCase of testCases) {
    const result = await executeTestCase(testCase, runConfig, llmConfig)
    results.push(result)
    onProgress?.(testCase.id, result)
  }
  
  return results
}
