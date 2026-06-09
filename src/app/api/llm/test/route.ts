import { NextRequest, NextResponse } from 'next/server'
import { testConnection } from '@/lib/llm/index'
import { getProviderDef } from '@/lib/llm/providers'
import { decrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, baseURL } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'API key required' }, { status: 400 })
    }

    const def = getProviderDef(provider)
    const decryptedKey = decrypt(apiKey)
    const result = await testConnection({ def, apiKey: decryptedKey, model: def.defaultModel, baseURL })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
