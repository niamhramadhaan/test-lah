export interface GeneratedTestCase {
  title: string
  steps: string
  expected: string
}

export async function generateTestCases(
  title: string,
  prompt: string,
  apiKey: string,
  provider: string = 'gemini',
  model: string = '',
  language: string = 'en',
): Promise<GeneratedTestCase[]> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, prompt, apiKey, provider, model, language }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.testCases as GeneratedTestCase[]
}
