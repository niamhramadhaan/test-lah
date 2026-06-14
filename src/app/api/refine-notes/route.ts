import { NextRequest, NextResponse } from 'next/server'
import { refineNotes } from '@/lib/llm/index'
import { getProviderDef } from '@/lib/llm/providers'
import { decrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  try {
    const { projectName, notes, apiKey, provider, model, baseURL } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    const def = getProviderDef(provider || 'google')
    const decryptedKey = decrypt(apiKey)

    const refined = await refineNotes(
      { def, apiKey: decryptedKey, model: model || '', baseURL },
      projectName || 'Project',
      notes || '',
    )

    return NextResponse.json({ refined })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
