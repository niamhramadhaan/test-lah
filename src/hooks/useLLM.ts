'use client'

import { useMutation } from '@tanstack/react-query'

export interface TestLLMConnectionInput {
  provider: string
  apiKey?: string
  baseURL?: string
  model?: string
}

export interface TestLLMConnectionResult {
  ok: boolean
  error?: string
}

async function testLLMConnection(input: TestLLMConnectionInput): Promise<TestLLMConnectionResult> {
  try {
    const res = await fetch('/api/llm/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    return await res.json()
  } catch {
    return { ok: false, error: 'Network error' }
  }
}

export function useTestLLMConnection() {
  return useMutation({ mutationFn: testLLMConnection })
}

export interface EncryptSecretResult {
  encrypted?: string
}

async function encryptSecret(value: string): Promise<EncryptSecretResult> {
  try {
    const res = await fetch('/api/llm/encrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
    return await res.json()
  } catch {
    return {}
  }
}

export function useEncryptSecret() {
  return useMutation({ mutationFn: encryptSecret })
}
