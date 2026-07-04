import { NextRequest, NextResponse } from 'next/server'
import { listIssues } from '@/lib/github/client'
import { decrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  try {
    const { token, owner, repo, state, q, page } = await req.json()
    if (!token || !owner || !repo) {
      return NextResponse.json({ error: 'token, owner and repo are required' }, { status: 400 })
    }
    const decrypted = decrypt(token)

    const result = await listIssues(decrypted, owner, repo, { state, q, page })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
