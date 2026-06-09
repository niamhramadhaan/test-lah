import type { GeneratedTestCase } from '@/lib/llm/index'
export type { GeneratedTestCase }
export { testConnection } from '@/lib/llm/index'

/**
 * Client-side function — sends request to the /api/generate route.
 */
export async function generateTestCases(
  title: string,
  prompt: string,
  apiKey: string,
  provider: string = 'google',
  model: string = '',
  language: string = 'en',
  baseURL?: string,
): Promise<GeneratedTestCase[]> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, prompt, apiKey, provider, model, language, baseURL }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.testCases as GeneratedTestCase[]
}
