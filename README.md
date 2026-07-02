# Test Lah!

> Just, Test lah!

A fully client-side QA management tool with interactive mindmaps, test case tracking, and AI-powered test case generation.

<img width="1667" height="1106" alt="Screenshot 2026-06-03 232015" src="https://github.com/user-attachments/assets/ab0cc5ee-90c3-4d73-a053-568ee8333b92" />

## Features

- **Mindmap Editor** — Drag-and-drop flow maps with horizontal/vertical directions and conditional edges
- **Test Case Table** — Track pass/fail/skip/untested with expandable cells, custom columns, and bulk expand
- **AI Generation** — Generate test cases from descriptions using Gemini, OpenAI, or DeepSeek
- **E2E Agentic Testing** — AI-powered end-to-end test execution with Playwright, live browser preview, self-healing, and run history
- **Multi-Provider AI** — Choose from Gemini, OpenAI, DeepSeek, Groq, OpenRouter, or bring your own custom provider
- **Multi-Project** — Manage multiple projects with per-node column configs
- **Export** — Download as Markdown or JSON
- **Duplicate Projects** — Clone any project with one click
- **Profile Card** — Your personal QA stats at a glance

## Quick Start

### Option 1: Global Install (Recommended)

**From npmjs.com:**
```bash
npm install -g test-lah
test-lah
```

**From GitHub Packages:**
```bash
# One-time setup
npm login --registry=https://npm.pkg.github.com

npm install -g @niamhramadhaan/test-lah
test-lah
```

This starts the server and opens your browser automatically.

```bash
test-lah --port 8080    # Custom port
test-lah --no-open      # Don't auto-open browser
test-lah --help         # Show help
```

### Option 2: Development

```bash
git clone https://github.com/niamhramadhaan/test-lah.git
cd test-lah
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter any name to login.

### AI Setup

<img width="1425" height="1076" alt="Screenshot 2026-06-28 143556" src="https://github.com/user-attachments/assets/b475e08d-0299-461a-afd1-bf96b1cfc38a" />


1. Go to **Integrations** → choose a provider
2. Enter API key → click **Test** → click **Connect**
3. Select default model
4. In any node's test cases → click **Generate** in the dock

---

## Test Flow

> _It's 3 PM on a Friday. Your annoying manager just Slacked you: "Hey, can you have the test case report ready before EOD? The client wants to see it Monday morning."_
>
> _Great. Another last-minute request. Now, Test Lah!_

### Step 1: Login

Open the app. Type your name. You're in.

<img width="540" height="336" alt="cursorful-video-1780634327507 (1)" src="https://github.com/user-attachments/assets/68276b5e-2e66-4806-948b-5abbcf5dfe20" />

### Step 2: Create a Project

Hit **"+ New Project"** and name it something like `"Project Yang Jelas"`. Your PM will be impressed by the naming convention.

![Create Project]<img width="2218" height="916" alt="image" src="https://github.com/user-attachments/assets/1cd1a948-0188-4619-bdd1-a5f80903556d" />


### Step 3: Build Your Mindmap

Click into the project. Start adding nodes to map out the user flow:

- **Login** → **Browse Products** → **Add to Cart** → **Checkout** → **Payment**
- Add conditional edges: Payment **pass** → Confirmation, Payment **fail** → Error page

Drag nodes around. Right-click to add children. This is the fun part — enjoy it while it lasts.

<img width="540" height="512" alt="Recording 2026-06-28 143736" src="https://github.com/user-attachments/assets/1c33c626-4733-433a-86c3-1a06a742619f" />

### Step 4: Generate Test Cases

Click on a node (say, "Checkout"). Hit the **Generate** button in the dock. Paste your ticket description or acceptance criteria. Pick your AI provider (Gemini, OpenAI, or DeepSeek).

Watch the cat pictures while AI does the heavy lifting. In seconds, you have a full set of test cases.

<img width="540" height="324" alt="cursorful-video-1780634832516 (1)" src="https://github.com/user-attachments/assets/5e2b0cfa-e08d-4390-b467-f64e00356f4a" />

### Step 5: Run E2E Tests

Click on a node. Hit the **E2E** button in the dock. Pick your browser — Chromium, Firefox, WebKit, or Edge. Hit **Run**.

The AI takes over: clicking buttons, filling forms, navigating pages — all while you watch a live browser preview. If a step breaks, it tries to fix itself. Because debugging on a Friday afternoon is nobody's idea of fun.

### Step 6: Switch AI Provider

Go to **Integrations**. Pick from 6 providers:

- **Gemini** — Google's finest
- **OpenAI** — The classic
- **DeepSeek** — Budget-friendly reasoning
- **Groq** — Blazing fast LPU inference
- **OpenRouter** — Gateway to 200+ models, some free
- **Custom** — Ollama, LM Studio, vLLM, anything OpenAI-compatible

Your API keys are encrypted with AES-256-GCM before hitting localStorage. Security first.

### Step 7: Review & Update Status

Go through each test case. Run them. Mark them as **Pass**, **Fail**, or **Skip**. Add notes for the ones that failed (blame the FE team, obviously).

<img width="540" height="270" alt="Recording 2026-06-28 144018" src="https://github.com/user-attachments/assets/6a115413-c7e3-4df9-8d49-d84cc9163117" />


### Step 8: Export & Share

Click the export button. Download as **Markdown** for the wiki or **JSON** for the automation pipeline.

<img width="540" height="212" alt="Recording 2026-06-28 143828" src="https://github.com/user-attachments/assets/418ddba8-651f-45da-9f9a-eee11b2bca0a" />

<img width="589" height="715" alt="Screenshot 2026-06-28 143925" src="https://github.com/user-attachments/assets/d0aa0b85-03c1-40d9-94d9-34d8278eb14c" />

\
---

## Tech Stack

Next.js 14 · TypeScript · Tailwind CSS · Motion · Lottie · Playwright · `@google/generative-ai` · `openai` · `@ai-sdk/groq` · OpenRouter · AES-256-GCM encryption · `@modelcontextprotocol/sdk`

Project/test-case data is kept in browser localStorage and mirrored to a local JSON file (`.ayu-data/state.json`) so the MCP server below can read and write it too. No external database.

## MCP Server (Claude Code integration)

While running the app locally (`npm run dev` or `test-lah`), it also exposes an MCP endpoint at `/api/mcp` so [Claude Code](https://claude.com/product/claude-code) can read and write your projects, nodes, and test cases directly.

```bash
claude mcp add --transport http ayu-tools http://localhost:3000/api/mcp
```

Available tools: `list_projects`, `get_project`, `list_nodes`, `get_node`, `add_test_case`, `update_test_case`, `delete_test_case`, and `generate_test_cases` (optional — calls a pay-per-token LLM provider with a caller-supplied API key).

To generate test cases using your own Claude subscription rather than a pay-per-token API key, just ask Claude Code directly in a session connected to this server — e.g. "read node X via MCP and add relevant test cases" — Claude Code does the reasoning itself and writes results back with `add_test_case`.

There's also an in-app **"Claude (Local CLI)"** option in the provider dropdown (Integrations page / Generate modal) that shells out to your locally installed, logged-in `claude` CLI — no API key needed in the app for that path, as long as `claude` is installed and authenticated on the machine running the server.

> **Note:** `/api/mcp` and `/api/state` have no authentication, matching the rest of the app — intended for local/self-hosted use. Don't expose this server beyond localhost without adding your own auth layer in front of it.

## Brand

| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#F7F5F1` | Page background |
| Card | `#FFFFFF` | Cards, panels |
| Text Primary | `#1A1A1A` | Headings, body |
| Text Secondary | `#7A7872` | Labels, hints |
| Accent | `#1A1A1A` | Buttons, links |
| Brown | `#6F4E37` | Coffee, highlights |
| Pass | `#3B6011` | Pass status |
| Fail | `#8B1A1A` | Fail status |

Full brand guideline: [docs/brand-guideline.md](docs/brand-guideline.md)

## License

[MIT](LICENSE)

## Credits

Built by [Qois Ramadhani](https://github.com/niamhramadhaan)

Duck logo — [Duck PNGs by Vecteezy](https://www.vecteezy.com/free-png/duck)
