import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState } from '@/lib/store/fileStore'
import type { AppState } from '@/types'

export async function GET() {
  return NextResponse.json(readState())
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body || typeof body !== 'object' || typeof body.projects !== 'object') {
      return NextResponse.json({ error: 'Invalid AppState payload' }, { status: 400 })
    }
    writeState(body as AppState)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
