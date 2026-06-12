# Test Lah!

> Just, Test lah!

A fully client-side QA management tool with interactive mindmaps, test case tracking, and AI-powered test case generation.

<img width="1667" height="1106" alt="Screenshot 2026-06-03 232015" src="https://github.com/user-attachments/assets/ab0cc5ee-90c3-4d73-a053-568ee8333b92" />

## Features

- **Mindmap Editor** — Drag-and-drop flow maps with horizontal/vertical directions and conditional edges
- **Test Case Table** — Track pass/fail/skip/untested with expandable cells, custom columns, and bulk expand
- **AI Generation** — Generate test cases from descriptions using Gemini, OpenAI, or DeepSeek
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

Open [http://localhost:3000](http://localhost:3000). Enter any name containing **"ayu"** to login.

### AI Setup

<img width="1427" height="1024" alt="image" src="https://github.com/user-attachments/assets/26840fcf-35ee-4bed-b666-d882064cbbb7" />

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

Open the app. Type your name (make sure it contains **"ayu"** ). You're in.

<img width="400" height="248" alt="cursorful-video-1780634327507" src="https://github.com/user-attachments/assets/fe2077c5-7f13-4218-b938-a76c10d32e87" />

### Step 2: Create a Project

Hit **"+ New Project"** and name it something like `"Project Yang Jelas"`. Your PM will be impressed by the naming convention.

![Create Project]<img width="2218" height="916" alt="image" src="https://github.com/user-attachments/assets/1cd1a948-0188-4619-bdd1-a5f80903556d" />


### Step 3: Build Your Mindmap

Click into the project. Start adding nodes to map out the user flow:

- **Login** → **Browse Products** → **Add to Cart** → **Checkout** → **Payment**
- Add conditional edges: Payment **pass** → Confirmation, Payment **fail** → Error page

Drag nodes around. Right-click to add children. This is the fun part — enjoy it while it lasts.

<img width="400" height="238" alt="cursorful-video-1780634587900" src="https://github.com/user-attachments/assets/be2aa7c5-792e-4560-a2a1-04e75b00c327" />


### Step 4: Generate Test Cases

Click on a node (say, "Checkout"). Hit the **Generate** button in the dock. Paste your ticket description or acceptance criteria. Pick your AI provider (Gemini, OpenAI, or DeepSeek).

Watch the cat pictures while AI does the heavy lifting. In seconds, you have a full set of test cases.

<img width="400" height="240" alt="cursorful-video-1780634832516" src="https://github.com/user-attachments/assets/8e56ad2a-445e-4dc0-870e-d3d7b55a94bd" />


### Step 5: Review & Update Status

Go through each test case. Run them. Mark them as **Pass**, **Fail**, or **Skip**. Add notes for the ones that failed (blame the FE team, obviously).

<img width="2217" height="1004" alt="image" src="https://github.com/user-attachments/assets/36fe61af-7ce7-4e21-a4e0-cb89e0f0d42f" />

### Step 6: Export & Share

Click the export button. Download as **Markdown** for the wiki or **JSON** for the automation pipeline.

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
