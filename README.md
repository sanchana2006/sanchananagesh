# SymptomSense — Local, Private Medical Symptom Assistant

A polished Next.js (App Router) chatbot that helps users describe symptoms and receive structured, safety‑first guidance — entirely local via Ollama. Designed with a soothing, trustworthy UI in teal/green/blue with subtle hazelnut accents, glassmorphism, smooth gradients, and rich micro‑interactions.

> Disclaimer: This project is for educational purposes only and is not a medical device. It does not provide diagnoses. Always consult a qualified clinician.

## ✨ Highlights

- Local LLM via Ollama (default model: `llama3`)
- Structured responses (diagnosis possibilities, next steps, clarifying questions, severity, quick‑reply chips)
- Clean, luxurious UI/UX:
  - Centered branding banner (SymptomSense) with gradient
  - Smooth, layered gradients (background + chat surface)
  - Role‑styled bubbles, avatars, animated typing, slide‑in cards, heartbeat indicators
  - Sidebar with Common Symptoms and an Emergency Guide
  - “Did you know?” rotating flashcard tips
  - Print‑ready doctor report (HTML → print dialog) with opt‑in confetti
- Strong safety orientation (non‑diagnostic, encourages care for red‑flags)

## 🧱 Tech Stack

- Next.js 15 (App Router, Turbopack) + TypeScript
- React 19
- Tailwind CSS 4 (via PostCSS)
- Ollama (local LLM runtime)

## 📦 Project Structure (key files)

```
nextjs-app/
  src/app/
    api/symptom-checker/route.ts   # API: talks to Ollama, returns structured JSON or HTML fallback
    layout.tsx                     # App chrome, branding banner, footer
    page.tsx                       # Chat UI, sidebar, tips, printing, confetti
    globals.css                    # Theme variables, gradients, glass, animations
  public/                          # Icons (favicon, apple touch)
  lib/ollama.ts                    # (Optional) Chat helper for Ollama
  next.config.ts                   # Turbopack root, Next config
  package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm/npm/yarn
- Ollama installed and running (`ollama serve`), with a local model:

```bash
ollama pull llama3
```

### Install & Run (dev)

```bash
cd nextjs-app
npm install
npm run dev
```

Then open `http://localhost:3000`.

If port 3000 is busy, Next will use the next available port (e.g., 3001).

### Build & Start (prod)

```bash
npm run build
npm run start
```

## ⚙️ Configuration

Environment variables (optional):

- `OLLAMA_BASE_URL` (default `http://localhost:11434`)
- `OLLAMA_MODEL` (default `llama3`)

Create `nextjs-app/.env.local` (optional):

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

## 🧠 How It Works

- The API (`src/app/api/symptom-checker/route.ts`) calls Ollama’s `generate` endpoint with `format: "json"` and a constrained schema:

```json
{
  "possibilities": [{"title": "string", "description": "string", "risk": "low|medium|high"}],
  "nextSteps": ["string"],
  "clarifyingQuestions": ["string"],
  "severity": 0,
  "chips": ["string"]
}
```

- If the model fails JSON mode, the API falls back to HTML (using `marked`), and the UI renders it.
- The UI (`page.tsx`) section‑renders possibilities, next steps, and questions; shows a severity bar; offers chips; and animates typing and card delivery.

## 🖼️ UI/UX Notes

- Theme variables live in `src/app/globals.css` (`:root`), including teal, green, blue, hazelnut (brown), and ivory.
- Background and chat surface use layered linear + radial gradients for smooth transitions.
- Bubbles:
  - User: teal→aqua gradient (`.bubble-user`).
  - Assistant: soft ivory→white gradient (`.bubble-ai`).
- Sidebar: quick symptom shortcuts + Emergency Guide.
- Tips: rotating “Did you know?” flashcard fixed at the bottom.
- Printing: the latest assistant response becomes a clean report (`#print-area`). A post‑print confirmation gates confetti (no confetti on cancel).

## 🧪 API

- `POST /api/symptom-checker`
  - Body: `{ "message": string }`
  - Success: `{ structured: {...} }` or `{ reply: string /* HTML */ }`
  - Error: `{ error: string }` (500)

Example:

```bash
curl -X POST http://localhost:3000/api/symptom-checker \
  -H 'Content-Type: application/json' \
  -d '{"message":"I have a sore throat and mild fever"}'
```

## 🔐 Safety & Security

- Non‑diagnostic UX copy, prompts encourage seeking professional care for red‑flags.
- Rendering uses `dangerouslySetInnerHTML` for formatted content from the model. If you plan to ingest untrusted HTML, add sanitization (e.g., DOMPurify or sanitize‑html) and a stricter policy.

## 🎨 Customization

- Colors/gradients: `src/app/globals.css`
  - `:root` tone variables
  - `.app-bg-soft` (page background), `.chat-surface` (chat card), `.bubble-user`, `.bubble-ai`
- Fonts: `src/app/layout.tsx` (Inter + Merriweather via `next/font`)
- Sidebar entries: `src/app/page.tsx` (Common Symptoms array)
- Model/options: `src/app/api/symptom-checker/route.ts` or `lib/ollama.ts`

## 🧰 Troubleshooting

- 500 from API: ensure Ollama is running and `llama3` is pulled. Check `OLLAMA_BASE_URL`.
- Port already in use: Next selects a free port automatically.
- iOS touch icon 404s: repo includes `apple-touch-icon.svg` and head links.
- Empty print: ensure at least one assistant reply exists (we generate `#print-area` on print).
- Confetti on cancel: avoided via confirmation modal.

## 🗺️ Roadmap Ideas

- Streaming responses (SSE) with token‑level typing
- Server‑side sanitization
- Voice input (Web Speech API) and TTS
- Server‑generated PDFs for reports
- Session persistence (SQLite)

## 📄 License

MIT © 2025 — Your Name

## 🙏 Acknowledgements

- Ollama (local LLM runtime)
- Next.js
- Tailwind CSS

---

If you use SymptomSense, stars and PRs are welcome!
