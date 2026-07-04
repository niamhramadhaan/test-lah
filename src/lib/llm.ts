import type { GeneratedTestCase } from '@/lib/llm/index'
export type { GeneratedTestCase }
export { testConnection } from '@/lib/llm/index'

export interface GenerateTestCasesInput {
  title: string
  prompt: string
  apiKey: string
  provider?: string
  model?: string
  language?: string
  baseURL?: string
  images?: string[]
  projectName?: string
  projectType?: string
  projectNotes?: string
  nodeNotes?: string
  githubIssuesContext?: string
}

/**
 * Client-side function — sends request to the /api/generate route.
 */
export async function generateTestCases(input: GenerateTestCasesInput): Promise<GeneratedTestCase[]> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.testCases as GeneratedTestCase[]
}

export async function refineNotes(
  projectName: string,
  notes: string,
  apiKey: string,
  provider: string = 'google',
  model: string = '',
  baseURL?: string,
): Promise<string> {
  const res = await fetch('/api/refine-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectName, notes, apiKey, provider, model, baseURL }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.refined as string
}
