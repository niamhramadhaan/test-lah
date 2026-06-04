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
> _Great. Another last-minute request. Noq, Test Lah!_

### Step 1: Login

Open the app. Type your name (make sure it contains **"ayu"** ). You're in.

<img width="938" height="897" alt="Screenshot 2026-06-03 095308" src="https://github.com/user-attachments/assets/1609f175-d94f-447d-b334-1f787530176a" />

### Step 2: Create a Project

Hit **"+ New Project"** and name it something like `"Sprint 42 - Checkout Flow"`. Your PM will be impressed by the naming convention.

![Create Project]<img width="2218" height="916" alt="image" src="https://github.com/user-attachments/assets/1cd1a948-0188-4619-bdd1-a5f80903556d" />


### Step 3: Build Your Mindmap

Click into the project. Start adding nodes to map out the user flow:

- **Login** → **Browse Products** → **Add to Cart** → **Checkout** → **Payment**
- Add conditional edges: Payment **pass** → Confirmation, Payment **fail** → Error page

Drag nodes around. Right-click to add children. This is the fun part — enjoy it while it lasts.

<img width="1110" height="1103" alt="image" src="https://github.com/user-attachments/assets/2173efb3-cd85-4e3b-9bb0-e4120059dfcd" />


### Step 4: Generate Test Cases (The AI Magic)

Click on a node (say, "Checkout"). Hit the **Generate** button in the dock. Paste your ticket description or acceptance criteria. Pick your AI provider (Gemini, OpenAI, or DeepSeek).

Watch the cat pictures while AI does the heavy lifting. In seconds, you have a full set of test cases.

<img width="1082" height="788" alt="image" src="https://github.com/user-attachments/assets/f16b4c36-95ea-456d-83a8-553f2cb639d4" />


### Step 5: Review & Update Status

Go through each test case. Run them. Mark them as **Pass**, **Fail**, or **Skip**. Add notes for the ones that failed (blame the backend team, obviously).

<img width="2217" height="1004" alt="image" src="https://github.com/user-attachments/assets/36fe61af-7ce7-4e21-a4e0-cb89e0f0d42f" />


### Step 6: Export & Share

Click the export button. Download as **Markdown** for the wiki or **JSON** for the automation pipeline. Send it to your PM at 4:58 PM. Two minutes to spare.

<img width="585" height="446" alt="image" src="https://github.com/user-attachments/assets/abb7c331-a006-4617-af7a-6c8d9449b3c9" />


### Step 7: Logout (If You Must)

Click the logout button. A friendly modal asks for Donation. because the developer would appreciate a coffee. You can either bail or buy them one.

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
