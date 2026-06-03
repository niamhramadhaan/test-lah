# Test Lah! — Brand Guideline

## Brand Identity

**Name:** Test Lah!

**Tagline:** Just, Test lah!

**Description:** A fully client-side QA management tool with interactive mindmaps, test case tracking, and AI-powered test case generation.

**Personality:** Playful, approachable, efficient. The duck mascot adds a lighthearted touch to a professional QA workflow.

---

## Logo

**Primary Logo:** Cute duck meme sticker

**Source:** [Vecteezy — Duck PNGs](https://www.vecteezy.com/free-png/duck)

**Usage:**
- Favicon (browser tab)
- Navbar watermark (centered, low opacity)
- Login page logo (prominent)
- Project card covers (watermark)
- Dashboard header

**Minimum size:** 28×28px

**Clear space:** At least 4px on all sides

---

## Color Palette

### Backgrounds

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#F7F5F1` | Page background |
| `--bg-secondary` | `#EDEAE3` | Hover states, secondary areas |
| `--bg-card` | `#FFFFFF` | Cards, modals, panels |
| `--bg-highlight` | `#F0EDD8` | Selection highlight |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#1A1A1A` | Headings, body text |
| `--text-secondary` | `#7A7872` | Labels, descriptions |
| `--text-tertiary` | `#A8A49E` | Hints, placeholders |

### Accent

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#1A1A1A` | Buttons, active states, links |
| Brown | `#6F4E37` | Coffee theme, donate, highlights |

### Status Colors

| Status | Background | Text | Usage |
|--------|------------|------|-------|
| Pass | `#E8F0E0` | `#3B6011` | Passed test cases |
| Fail | `#FCEAEA` | `#8B1A1A` | Failed test cases |
| Skip | `#FDF3DC` | `#7A5000` | Skipped test cases |
| Untested | `#EFEFED` | `#5A5A56` | Untested test cases |

### Border

| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `rgba(0,0,0,0.08)` | Default borders |
| `--border-hover` | `rgba(0,0,0,0.16)` | Hover borders |

---

## Typography

**Font:** Inter (Google Fonts), system-ui fallback

**Sizes:**
| Size | Usage |
|------|-------|
| `text-lg` (18px) | Page titles |
| `text-base` (16px) | Section headings |
| `text-sm` (14px) | Card titles, buttons |
| `text-xs` (12px) | Body text, table cells |
| `text-[11px]` | Small labels |
| `text-[10px]` | Metadata, badges |
| `text-[9px]` | Micro labels |

**Weights:**
| Weight | Usage |
|--------|-------|
| 600 (semibold) | Headings, active states |
| 500 (medium) | Buttons, labels |
| 400 (regular) | Body text |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Small elements, tags |
| `--radius-md` | `10px` | Cards, inputs |
| `--radius-lg` | `16px` | Modals, large cards |
| `--radius-pill` | `99px` | Pills, badges |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 4px rgba(0,0,0,0.06)` | Subtle elevation |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | Cards on hover |
| `--shadow-lg` | `0 8px 30px rgba(0,0,0,0.12)` | Modals, dropdowns |
| `--shadow-xl` | `0 12px 40px rgba(0,0,0,0.16)` | Top-level overlays |

---

## Icons

**Style:** Lucide React (consistent stroke-based icons)

**Size conventions:**
| Size | Usage |
|------|-------|
| 12px | Inline icons, small buttons |
| 14px | Button icons |
| 16px | Dock icons, section icons |
| 20px | Card icons, feature icons |

---

## Animations

| Name | Duration | Usage |
|------|----------|-------|
| `fadeIn` | 150ms | Modals, overlays |
| `fadeInUp` | 200ms | Cards appearing |
| `shimmer` | 3s linear | Header gradient |
| `shimmerText` | 3s ease-in-out | "Test Lah!" title |
| `beamFlow` | 3s ease-in-out | Divider beam |
| `glowPulse` | 2s ease-in-out | Donate button |

**Spring config (dock magnification):**
```
mass: 0.15
stiffness: 120
damping: 25
```

---

## Component Patterns

### Cards
- White background (`--bg-card`)
- 1px border (`--border`)
- `border-radius: var(--radius-md)`
- Hover: shadow-lg + border-hover
- Content padding: `p-4` to `p-6`

### Buttons
- **Primary:** `background: var(--accent)`, white text, pill radius
- **Secondary:** transparent, border, `--text-secondary`
- **Danger:** `--status-fail-text` color/border
- Hover: opacity 80-90%
- Active: scale 0.98

### Modals
- Overlay: `rgba(0,0,0,0.3)` + backdrop blur
- Card: `--bg-card`, `--radius-lg`, `--shadow-lg`
- Animation: `fadeIn` overlay + `fadeInUp` card

### Inputs
- Background: `--bg-secondary` (idle), `--bg-card` (focused)
- Border: `--border` (idle), `--accent` (focused)
- Focus ring: `0 0 0 3px rgba(26,26,26,0.06)`

---

## Watermark

The duck logo is used as a subtle watermark in:

1. **Navbar** — Centered, 9% opacity, hovers to 15% with scale 1.1
2. **Project cards** — Centered in header area, 8% opacity

Both use `pointer-events-none` and `select-none`.

---

## Mascot

**Duck** — The cute duck meme sticker serves as the brand mascot. It appears as:
- Favicon
- Login page logo
- Navbar watermark
- Project card watermark
- Dashboard header logo

The duck adds personality and approachability to the QA tool.

---

## Motion Principles

1. **Purposeful** — Animations guide attention, not distract
2. **Fast** — Most transitions are 150-300ms
3. **Smooth** — Use ease-out for entrances, ease-in-out for loops
4. **Playful** — Confetti on login success, duck hover interaction

---

## Voice & Tone

- **Concise** — Short labels, minimal text
- **Friendly** — "Just, Test lah!" not "Execute Quality Assurance Procedures"
- **Professional** — Status tracking, structured data, export formats
- **Playful** — Duck mascot, fun project icons, coffee donation
