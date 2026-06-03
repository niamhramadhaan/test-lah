import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

const DEEPSEEK_MODELS = [
  'deepseek-chat',
  'deepseek-reasoner',
]

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'API key required' }, { status: 400 })
    }

    if (provider === 'gemini') {
      return await testGemini(apiKey)
    } else if (provider === 'openai') {
      return await testOpenAI(apiKey)
    } else if (provider === 'deepseek') {
      return await testDeepSeek(apiKey)
    }

    return NextResponse.json({ ok: false, error: 'Unknown provider' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

async function testGemini(apiKey: string) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    await model.generateContent('Say "ok" in one word.')

    // Try to list models
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    let models = GEMINI_MODELS
    if (res.ok) {
      const data = await res.json()
      if (data.models) {
        models = data.models
          .map((m: { name: string }) => m.name.replace('models/', ''))
          .filter((n: string) => n.startsWith('gemini-'))
          .sort()
      }
    }

    return NextResponse.json({ ok: true, models })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({ ok: false, error: message })
  }
}

async function testOpenAI(apiKey: string) {
  try {
    const openai = new OpenAI({ apiKey })
    const res = await openai.models.list()
    const models = res.data
      .map(m => m.id)
      .filter(id => id.startsWith('gpt-'))
      .sort()

    return NextResponse.json({ ok: true, models: models.length > 0 ? models : ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({ ok: false, error: message })
  }
}

async function testDeepSeek(apiKey: string) {
  try {
    const openai = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' })
    const res = await openai.models.list()
    const models = res.data.map(m => m.id).sort()

    return NextResponse.json({ ok: true, models: models.length > 0 ? models : DEEPSEEK_MODELS })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({ ok: false, error: message })
  }
}
