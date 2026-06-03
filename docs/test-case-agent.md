# Test Case Generation Agent

AI-powered test case generation integrated into the QA Dashboard.

## Overview

The test case agent generates structured test cases from natural language descriptions. It supports multiple AI providers, two languages, and produces concise, non-repetitive test cases covering happy paths, edge cases, and error scenarios.

## Supported Providers

| Provider | SDK | Models | API Key Source |
|----------|-----|--------|----------------|
| Google Gemini | `@google/generative-ai` | gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash, etc. | [Google AI Studio](https://aistudio.google.com/apikey) |
| OpenAI | `openai` | gpt-4o, gpt-4o-mini, gpt-4-turbo, etc. | [OpenAI Platform](https://platform.openai.com/api-keys) |
| DeepSeek | `openai` (compatible) | deepseek-chat, deepseek-reasoner | [DeepSeek Platform](https://platform.deepseek.com/api_keys) |

## Setup

1. Navigate to **Integrations** from the sidebar
2. Expand the desired AI provider accordion
3. Enter your API key
4. Click **Test** to verify the connection
5. Click **Connect** to save and activate
6. Select default and fallback models from the dropdowns
7. Click **Set Active** to choose the primary provider

### Provider Configuration

Each provider stores:
- `apiKey` — Authentication key
- `defaultModel` — Primary model for generation
- `secondaryModel` — Fallback model (used if primary fails)
- `models` — Available models fetched from the API
- `connected` — Connection status

Configuration is persisted in `localStorage` under key `qa-llm-config`.

## Generating Test Cases

1. Select a node in the mindmap
2. Open the test case panel
3. Click the **Generate** button in the dock
4. Fill in:
   - **Title** — Feature or test case name (pre-filled from node label)
   - **Language** — `EN` (English) or `ID` (Bahasa Indonesia)
   - **Description** — Acceptance criteria, DoD, or ticket description
5. Click **Generate Test Cases**
6. Wait for generation (cat images displayed during loading)
7. Generated cases are added to the node's test case list

### Language Support

- **EN** — All generated content in English
- **ID** — All generated content in Bahasa Indonesia

The language flag is passed to the system prompt. The LLM writes titles, steps, and expected results in the selected language.

### Anti-Repetition

The system prompt includes rules to prevent repetitive steps:

- Steps are specific to each scenario, not generic navigation
- Setup steps shared across tests appear only once per test
- Each step describes a unique action
- 2-5 steps per test case
- Assumes user is already on the relevant page

## API Routes

### `POST /api/generate`

Generates test cases from a description.

**Request body:**
```json
{
  "title": "Login Page",
  "prompt": "User can log in with valid credentials...",
  "apiKey": "sk-...",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "language": "en"
}
```

**Response:**
```json
{
  "testCases": [
    {
      "title": "Successful login with valid credentials",
      "steps": "1. Enter valid email\n2. Enter valid password\n3. Click Login",
      "expected": "User is redirected to dashboard"
    }
  ]
}
```

### `POST /api/llm/test`

Tests an API key and returns available models.

**Request body:**
```json
{
  "provider": "gemini",
  "apiKey": "AIza..."
}
```

**Response:**
```json
{
  "ok": true,
  "models": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"]
}
```

## Generation Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `temperature` | `0.4` | Low randomness for consistent, structured output |
| `responseMimeType` | `application/json` | Gemini: forces JSON output |
| `response_format` | `{ type: 'json_object' }` | OpenAI/DeepSeek: forces JSON output |

## System Prompt

The core system prompt (English variant):

```
You are a QA engineer. Generate test cases for the given feature.
Write ALL test case content (title, steps, expected result) in English.

Return ONLY a valid JSON array, no markdown fences, no explanation.
Each item must have: "title" (string), "steps" (string with numbered steps
separated by newlines), "expected" (string).

RULES FOR STEPS:
- Each test case's steps must be specific to THAT scenario. Do NOT repeat
  generic navigation steps.
- Assume the user is already on the relevant page unless the test specifically
  requires navigation.
- Each step should describe a UNIQUE action. If two test cases share setup,
  mention it only in the first step of that test.
- Be concise: 2-5 steps per test case.
- Focus on the action being tested, not boilerplate.

Generate 3-8 test cases covering happy path, edge cases, and error scenarios.
```

For Indonesian (`language: 'id'`), the language instruction changes to:
```
Write ALL test case content (title, steps, expected result) in Bahasa Indonesia.
```

### User Prompt Template

The user's input is formatted as:

```
Feature: {title}

Description / DoD / Acceptance Criteria:
{prompt}
```

### Output Format

The LLM returns a JSON array. For OpenAI/DeepSeek with `json_object` format, the response may be wrapped in `{ "testCases": [...] }` which is unwrapped by the parser.

```json
[
  {
    "title": "Successful login with valid credentials",
    "steps": "1. Enter valid email in the email field\n2. Enter valid password in the password field\n3. Click the Login button",
    "expected": "User is redirected to the dashboard and sees the welcome message"
  },
  {
    "title": "Login fails with invalid password",
    "steps": "1. Enter a valid email\n2. Enter an incorrect password\n3. Click Login",
    "expected": "Error message 'Invalid credentials' is displayed below the password field"
  }
]
```

### Response Parsing

The parser handles three formats:
1. **Direct JSON array** — `[ {...}, {...} ]`
2. **Wrapped object** — `{ "testCases": [ {...}, {...} ] }` (OpenAI json_object mode)
3. **Markdown-embedded JSON** — Extracts first `[...]` match from response text

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/
│   │   │   └── route.ts          # Multi-provider generation endpoint
│   │   └── llm/
│   │       └── test/
│   │           └── route.ts      # Connection test + model fetch
│   └── (dashboard)/
│       └── integrations/
│           └── page.tsx          # Provider accordion UI
├── components/
│   └── testcase/
│       └── GenerateTestModal.tsx  # Generation modal with language + cat panel
├── hooks/
│   └── useLLMConfig.ts           # Multi-provider config hook
└── lib/
    └── llm.ts                    # Client-side generation wrapper
```

## Data Model

### LLMConfig (localStorage)

```ts
{
  activeProvider: 'gemini' | 'openai' | 'deepseek',
  providers: {
    gemini: {
      apiKey: string,
      defaultModel: string,
      secondaryModel: string,
      models: string[],
      connected: boolean
    },
    openai: { ... },
    deepseek: { ... }
  }
}
```

### GeneratedTestCase

```ts
{
  title: string,    // Test case name
  steps: string,    // Numbered steps separated by newlines
  expected: string  // Expected result
}
```

## Loading Experience

While waiting for generation:

- Modal expands from 512px to 720px
- A cat image panel slides in from the right
- Random cat images from [The Cat API](https://thecatapi.com)
- Images auto-rotate every 5 seconds
- "New cat" button for manual refresh
- Fun text messages displayed with each image

## Dependencies

- `@google/generative-ai` — Gemini SDK
- `openai` — OpenAI SDK (also used for DeepSeek)
