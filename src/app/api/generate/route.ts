import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { generateText, createGateway } from 'ai'

function getSystemPrompt(language: string = 'en'): string {
  const langInstruction = language === 'id'
    ? 'Write ALL test case content (title, steps, expected result) in Bahasa Indonesia.'
    : 'Write ALL test case content (title, steps, expected result) in English.'

  return `You are a QA engineer. Generate test cases for the given feature.
${langInstruction}

Return ONLY a valid JSON array, no markdown fences, no explanation.
Each item must have: "title" (string), "steps" (string with numbered steps separated by newlines), "expected" (string).

RULES FOR STEPS:
- Each test case's steps must be specific to THAT scenario. Do NOT repeat generic navigation steps.
- Assume the user is already on the relevant page unless the test specifically requires navigation.
- Each step should describe a UNIQUE action. If two test cases share setup, mention it only in the first step of that test.
- Be concise: 2-5 steps per test case.
- Focus on the action being tested, not boilerplate.

Generate 3-8 test cases covering happy path, edge cases, and error scenarios.`
}

export async function POST(req: NextRequest) {
  try {
    const { title, prompt, apiKey, provider, model, language } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }
    if (!title && !prompt) {
      return NextResponse.json({ error: 'Title or prompt required' }, { status: 400 })
    }

    const systemPrompt = getSystemPrompt(language)
    const userPrompt = `Feature: ${title}\n\nDescription / DoD / Acceptance Criteria:\n${prompt || '(no additional description provided)'}`

    let testCases: Array<{ title: string; steps: string; expected: string }>

    if (provider === 'openai') {
      testCases = await generateOpenAI(apiKey, model || 'gpt-4o-mini', systemPrompt, userPrompt)
    } else if (provider === 'deepseek') {
      testCases = await generateDeepSeek(apiKey, model || 'deepseek-chat', systemPrompt, userPrompt)
    } else if (provider === 'mimo') {
      testCases = await generateMiMo(apiKey, model || 'xiaomi/mimo-v2.5-pro', systemPrompt, userPrompt)
    } else {
      testCases = await generateGemini(apiKey, model || 'gemini-2.5-flash', systemPrompt, userPrompt)
    }

    return NextResponse.json({ testCases })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function generateGemini(apiKey: string, modelName: string, systemPrompt: string, userPrompt: string) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: modelName })

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
    },
  })

  const text = result.response.text()
  return parseTestCases(text)
}

async function generateOpenAI(apiKey: string, modelName: string, systemPrompt: string, userPrompt: string) {
  const openai = new OpenAI({ apiKey })

  const result = await openai.chat.completions.create({
    model: modelName,
    temperature: 0.4,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  })

  const text = result.choices[0]?.message?.content || '[]'
  return parseTestCases(text)
}

async function generateDeepSeek(apiKey: string, modelName: string, systemPrompt: string, userPrompt: string) {
  const openai = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' })

  const result = await openai.chat.completions.create({
    model: modelName,
    temperature: 0.4,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  })

  const text = result.choices[0]?.message?.content || '[]'
  return parseTestCases(text)
}

async function generateMiMo(apiKey: string, modelName: string, systemPrompt: string, userPrompt: string) {
  const gateway = createGateway({
    apiKey,
    baseURL: 'https://ai-gateway.vercel.sh/v1/ai',
  })

  const { text } = await generateText({
    model: gateway(modelName),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.4,
  })

  return parseTestCases(text)
}

function parseTestCases(text: string): Array<{ title: string; steps: string; expected: string }> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      parsed = JSON.parse(match[0])
    } else {
      throw new Error('Failed to parse LLM response')
    }
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'testCases' in parsed) {
    parsed = (parsed as { testCases: unknown }).testCases
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid response format')
  }

  return parsed as Array<{ title: string; steps: string; expected: string }>
}
