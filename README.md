# Test Lah!

> Your Boss's Favorite QA Tool

A lightweight, fully client-side QA management tool with an interactive mindmap for organizing test flows, structured test case tracking, and AI-powered test case generation.

![Test Lah!](https://via.placeholder.com/900x400/F7F5F1/1A1A1A?text=Test+Lah%21+Screenshot)

## Screenshots

<!-- Replace these with actual screenshots -->
| Login | Mindmap | Test Cases |
|-------|---------|------------|
| ![Login](https://via.placeholder.com/300x200/F7F5F1/A8A49E?text=Login) | ![Mindmap](https://via.placeholder.com/300x200/F7F5F1/A8A49E?text=Mindmap) | ![Test Cases](https://via.placeholder.com/300x200/F7F5F1/A8A49E?text=Test+Cases) |

| AI Generation | Integrations | Projects |
|---------------|--------------|----------|
| ![AI Gen](https://via.placeholder.com/300x200/F7F5F1/A8A49E?text=AI+Generate) | ![Integrations](https://via.placeholder.com/300x200/F7F5F1/A8A49E?text=Integrations) | ![Projects](https://via.placeholder.com/300x200/F7F5F1/A8A49E?text=Projects) |

## Features

- **Mindmap Editor** — Build flow maps with drag, pan, inline editing, horizontal/vertical node directions, and Bezier connectors
- **Test Case Table** — Add, edit, reorder, and track status (pass/fail/skip/untested) with expandable cells
- **AI Test Generation** — Generate test cases from natural language descriptions using Gemini, OpenAI, or DeepSeek
- **Multi-Provider AI** — Switch between AI providers with test connection, model selection, and fallback support
- **Multi-Language** — Generate test cases in English or Bahasa Indonesia
- **Multi-Project** — Create, switch, rename, and delete projects with fun random icons
- **Export** — Download as Markdown (formatted tables) or JSON (full backup)
- **Responsive** — Stacked layout with tab bar on mobile
- **Weather Integration** — Jakarta weather on login page
- **Lottie Animations** — Smooth, playful animations throughout

## Quick Start

```bash
# Clone the repo
git clone https://github.com/niamhramadhaan/test-lah.git
cd test-lah

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Login

Enter any name containing **"ayu"** (case-insensitive) to access the dashboard.

### AI Features

1. Go to **Integrations** from the sidebar
2. Choose a provider (Gemini, OpenAI, or DeepSeek)
3. Enter your API key and click **Test**
4. Click **Connect** to save
5. Select your default model
6. Go to any node's test cases → click **Generate** in the dock

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + CSS custom properties
- **Animations:** Motion (Framer Motion), Lottie, Canvas Confetti
- **AI SDKs:** `@google/generative-ai`, `openai`
- **Persistence:** localStorage (client-side, no database)
- **Auth:** sessionStorage (name-based gate, no passwords)

## Project Structure

```
src/
├── app/
│   ├── api/              # Server API routes
│   │   ├── generate/     # AI test case generation
│   │   ├── llm/          # LLM connection test
│   │   └── weather/      # Weather proxy (Open-Meteo)
│   ├── (dashboard)/      # Dashboard layout + pages
│   │   ├── integrations/ # AI provider config
│   │   ├── projects/     # Project list + detail
│   │   └── summary/      # Project summary
│   └── login/            # Login page
├── components/
│   ├── layout/           # Header, profile
│   ├── mindmap/          # Canvas, nodes, layout
│   ├── testcase/         # Table, rows, generation
│   ├── shared/           # Modal, EmptyState, etc.
│   └── ui/               # Reusable UI primitives
├── context/              # Dashboard context provider
├── hooks/                # useAuth, useMindmap, useTestCases, etc.
├── lib/                  # Utilities, export, LLM wrapper
└── types/                # TypeScript interfaces
```

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/niamhramadhaan/test-lah)

Or manually:

```bash
npm i -g vercel
vercel
```

Vercel auto-detects Next.js and deploys with zero configuration.

### Other Platforms

This is a standard Next.js app. It can be deployed to any platform that supports Next.js:
- **Netlify** — `npm run build` + deploy `/out`
- **Railway** — Connect repo, auto-deploy
- **Docker** — Use the official Next.js Dockerfile

## Environment Variables

None required! All configuration (API keys, model selection) is stored in the user's browser via localStorage.

## License

[MIT](LICENSE)

## Credits

Built by [Qois Ramadhani](https://github.com/niamhramadhaan)

Duck logo — [Duck PNGs by Vecteezy](https://www.vecteezy.com/free-png/duck)
