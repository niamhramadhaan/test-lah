import { NextRequest, NextResponse } from 'next/server'
import { generateTestCases } from '@/lib/llm/index'
import { getProviderDef } from '@/lib/llm/providers'
import { decrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  try {
    const { title, prompt, apiKey, provider, model, language, baseURL, images } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }
    if (!title && !prompt && (!images || images.length === 0)) {
      return NextResponse.json({ error: 'Title, prompt, or image required' }, { status: 400 })
    }

    const def = getProviderDef(provider || 'google')
    const decryptedKey = decrypt(apiKey)

    const testCases = await generateTestCases(
      { def, apiKey: decryptedKey, model: model || '', baseURL },
      title,
      prompt,
      language,
      images,
    )

    return NextResponse.json({ testCases })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
