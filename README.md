# Test Lah!

> Just, Test lah!

A fully client-side QA management tool with interactive mindmaps, test case tracking, and AI-powered test case generation.

![Test Lah! Dashboard](./docs/screenshots/dashboard.png)

## Features

- **Mindmap Editor** — Drag-and-drop flow maps with horizontal/vertical directions and conditional edges
- **Test Case Table** — Track pass/fail/skip/untested with expandable cells, custom columns, and bulk expand
- **AI Generation** — Generate test cases from descriptions using Gemini, OpenAI, or DeepSeek
- **Multi-Project** — Manage multiple projects with per-node column configs
- **Export** — Download as Markdown or JSON
- **Duplicate Projects** — Clone any project with one click
- **Profile Card** — Your personal QA stats at a glance

## Screenshots

### Login

![Login Page](./docs/screenshots/login.png)

### Projects Dashboard

![Projects Dashboard](./docs/screenshots/projects.png)

### Mindmap Editor

![Mindmap Editor](./docs/screenshots/mindmap.png)

### Test Case Table

![Test Case Table](./docs/screenshots/test-cases.png)

### AI Generation

![AI Generate](./docs/screenshots/ai-generate.png)

### Integrations

![Integrations](./docs/screenshots/integrations.png)

## Quick Start

```bash
git clone https://github.com/niamhramadhaan/test-lah.git
cd test-lah
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter any name containing **"ayu"** to login.

### AI Setup

1. Go to **Integrations** → choose a provider
2. Enter API key → click **Test** → click **Connect**
3. Select default model
4. In any node's test cases → click **Generate** in the dock

---

## Test Flow: A Friday Afternoon Survival Story

> _It's 3 PM on a Friday. Your product manager just Slacked you: "Hey, can you have the test case report ready before EOD? The client wants to see it Monday morning."_
>
> _Great. Another last-minute request. Good thing you have Test Lah!_

### Step 1: Login

Open the app. Type your name (make sure it contains **"ayu"** — that's the magic word). You're in.

![Login](./docs/screenshots/login.png)

### Step 2: Create a Project

Hit **"+ New Project"** and name it something like `"Sprint 42 - Checkout Flow"`. Your PM will be impressed by the naming convention.

![Create Project](./docs/screenshots/create-project.png)

### Step 3: Build Your Mindmap

Click into the project. Start adding nodes to map out the user flow:

- **Login** → **Browse Products** → **Add to Cart** → **Checkout** → **Payment**
- Add conditional edges: Payment **pass** → Confirmation, Payment **fail** → Error page

Drag nodes around. Right-click to add children. This is the fun part — enjoy it while it lasts.

![Mindmap](./docs/screenshots/mindmap.png)

### Step 4: Generate Test Cases (The AI Magic)

Click on a node (say, "Checkout"). Hit the **Generate** button in the dock. Paste your ticket description or acceptance criteria. Pick your AI provider (Gemini, OpenAI, or DeepSeek).

Watch the cat pictures while AI does the heavy lifting. In seconds, you have a full set of test cases.

![Generate](./docs/screenshots/ai-generate.png)

### Step 5: Review & Update Status

Go through each test case. Run them. Mark them as **Pass**, **Fail**, or **Skip**. Add notes for the ones that failed (blame the backend team, obviously).

![Test Cases](./docs/screenshots/test-cases.png)

### Step 6: Export & Share

Click the export button. Download as **Markdown** for the wiki or **JSON** for the automation pipeline. Send it to your PM at 4:58 PM. Two minutes to spare.

![Export](./docs/screenshots/export.png)

### Step 7: Logout (If You Must)

Click the logout button. A friendly modal asks: **"Mau Keluar? Sedekahnya mana??"** — because the developer would appreciate a coffee. You can either bail or buy them one.

![Logout](./docs/screenshots/logout.png)

---

## Tech Stack

Next.js 14 · TypeScript · Tailwind CSS · Motion · Lottie · `@google/generative-ai` · `openai`

Data stored in browser localStorage. No backend required.

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
