import { NextRequest, NextResponse } from 'next/server'
import { executeTestCase, E2ERunConfig, E2ETestResult } from '@/lib/e2e-agent'
import { decrypt } from '@/lib/crypto'
import type { TestCase } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testCases, baseUrl, headless, timeout, llmConfig } = body as {
      testCases: TestCase[]
      baseUrl: string
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
      return NextResponse.json(
        { error: 'No test cases provided' },
        { status: 400 }
      )
    }

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Base URL is required' },
        { status: 400 }
      )
    }

    if (!llmConfig?.apiKey) {
      return NextResponse.json(
        { error: 'LLM API key is required' },
        { status: 400 }
      )
    }

    // Decrypt API key if encrypted
    const decryptedApiKey = await decrypt(llmConfig.apiKey)
    const decryptedConfig = {
      ...llmConfig,
      apiKey: decryptedApiKey,
    }

    const runConfig: E2ERunConfig = {
      baseUrl,
      headless: headless ?? true,
      timeout: timeout ?? 30000,
      screenshotOnFailure: true,
    }

    // Run tests and collect results
    const results: E2ETestResult[] = []
    
    for (const testCase of testCases) {
      try {
        const result = await executeTestCase(testCase, runConfig, decryptedConfig)
        results.push(result)
      } catch (error) {
        results.push({
          testCaseId: testCase.id,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          duration: 0,
          steps: [],
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('E2E test error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
