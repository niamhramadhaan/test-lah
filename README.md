# Test Lah!

> Just, Test lah!

A fully client-side QA management tool with interactive mindmaps, test case tracking, and AI-powered test case generation.

![Test Lah!](https://via.placeholder.com/900x400/F7F5F1/1A1A1A?text=Test+Lah%21+Screenshot)

## Features

- **Mindmap Editor** — Drag-and-drop flow maps with horizontal/vertical directions and conditional edges
- **Test Case Table** — Track pass/fail/skip/untested with expandable cells, custom columns, and bulk expand
- **AI Generation** — Generate test cases from descriptions using Gemini, OpenAI, or DeepSeek
- **Multi-Project** — Manage multiple projects with per-node column configs
- **Export** — Download as Markdown or JSON

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
