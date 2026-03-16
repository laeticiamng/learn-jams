# COGNITIO — learn-jams

AI-powered pedagogical content platform that transforms course documents into interactive learning experiences: dynamic sheets, animated stories, escape games, music, and video.

## Architecture

**Frontend:** Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui

**Backend:** Supabase (Auth, Database, Storage, Edge Functions)

**External providers:**

| Provider  | Purpose                        |
|-----------|--------------------------------|
| Supabase  | Auth, database, storage        |
| OpenAI    | LLM, TTS, image, video (Sora) |
| Suno      | Music generation               |
| Stripe    | Billing                        |
| Resend    | Email                          |
| Twilio    | SMS                            |

## Local Setup

### Prerequisites

- Node.js 18+
- npm

### Steps

```sh
git clone <repo-url>
cd learn-jams
cp .env.example .env
# Fill in your Supabase values in .env
npm install --legacy-peer-deps
npm run dev
```

> **Note:** `--legacy-peer-deps` is required due to a React 18/19 peer dependency conflict with `@react-three/drei`.

## Environment Variables

| Variable                         | Description                    |
|----------------------------------|--------------------------------|
| `VITE_SUPABASE_PROJECT_ID`      | Supabase project ID            |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon (public) key     |
| `VITE_SUPABASE_URL`             | Supabase project URL           |

## Build & Test Commands

| Command              | Description                  |
|----------------------|------------------------------|
| `npm run dev`        | Start dev server             |
| `npm run build`      | Production build             |
| `npm run test`       | Run tests                    |
| `npm run lint`       | Lint the codebase            |
| `npx tsc --noEmit`  | Type-check without emitting  |

## Pipeline Overview

The content generation pipeline follows eight modules:

1. **M1 — Ingestion** — Upload and parse course documents
2. **M2 — Analysis** — Extract structure and key concepts
3. **M3 — Memory Architecture** — Build learner memory model
4. **M4 — Format Selection** — Choose output format (sheet, story, game, etc.)
5. **M5 — Generation** — Produce the learning content
6. **M6 — Recall** — Generate recall/review activities
7. **M7 — QA** — Quality assurance checks
8. **M8 — Memory Update** — Update the learner memory model

**Direct generation paths:**
- **Music:** lyrics generation then Suno API
- **Video:** OpenAI Sora (async)

## Supabase Notes

- **38 edge functions** deployed
- **47 database migrations**
- Webhook handlers for both Stripe and Suno (note: both have legacy + newer handler variants)

## Known Async Flows

- **Suno music generation** — callback/polling pattern; generation is not instant
- **Video generation** — async via OpenAI; results are polled or awaited
- **Stripe webhooks** — async payment and subscription events

## Troubleshooting

**`npm install` fails with peer dependency errors**
Run `npm install --legacy-peer-deps`. This is caused by `@react-three/drei` expecting React 19 while the project uses React 18.

**Tests fail with missing `@testing-library/dom`**
Install it explicitly: `npm install -D @testing-library/dom`
