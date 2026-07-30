# Atlas — AI Science Tutor for Singapore Secondary Schools

> Adaptive Tutoring & Learning for Applied Science · Biology & Chemistry (G3 first)

A personal Biology & Chemistry tutor that knows the SEAB syllabus, marks like an
examiner, and turns every mistake into an adaptive study plan. This repo is the
first runnable slice of the [product blueprint](#whats-in-this-slice).

Built with **Next.js 16 · React 19 · Tailwind v4 · Supabase · Google Gemini**.

---

## What's in this slice

| Area | Status |
|---|---|
| Apple-minimalist / premium design system (light + dark, no Duolingo green) | ✅ |
| Landing + pricing pages | ✅ |
| Email + password auth (3 roles: student / tutor / admin), 2FA-ready | ✅ |
| Student dashboard — mastery ring, predicted grade, **streaks**, daily goal | ✅ |
| Duolingo-style study plan (Fix This First / High Priority / Low-Hanging Fruit) | ✅ |
| Lessons (overview → misconceptions → examiner tips) | ✅ |
| Practice + **AI marking against the SEAB mark scheme** (Gemini) | ✅ |
| AI tutor chat (Socratic, grounded, quick actions) | ✅ |
| **Admin analytics dashboard** (usage, mastery by topic, hardest outcomes, AI cost) | ✅ |
| Temporary subscription / checkout page (monthly + annual) | ✅ (preview, no real Stripe) |
| Postgres schema + Row-Level Security + streak/demo RPCs | ✅ |

Deferred (blueprint V2/V3): OCR/scan pipeline, RAG over uploaded past papers,
tutor classrooms, mock-exam modes, real Stripe billing, 2FA.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

Without keys the app still runs in **preview mode** (fallback data, AI returns a
setup message) so you can browse the UI. Add the keys below to make it live.

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. **Settings → API** → copy into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional for this slice)
3. **SQL Editor** → run these files **in order** (each is re-runnable):
   1. `supabase/migrations/0001_init.sql` (core schema + RLS + triggers)
   2. `supabase/migrations/0002_demo_progress.sql` (demo-progress RPC)
   3. `supabase/migrations/0003_resources.sql` (uploads table + storage bucket)
   4. `supabase/migrations/0004_classrooms_visibility.sql` (classrooms + resource visibility)
   5. `supabase/migrations/0005_extracted_questions.sql` (OCR output table)
   6. `supabase/migrations/0006_assignments.sql` (assignments + join-class RPC)
   7. `supabase/seed.sql` (SEAB Biology 6093 + Chemistry 6092 content)
4. **Auth → Providers → Email**: for easy testing, turn **off** "Confirm email"
   so signup logs you straight in.

### 2. Gemini

1. Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Put it in `.env.local` as `GEMINI_API_KEY`. Defaults (use the `-latest`
   aliases — versioned ids like `gemini-2.5-flash` get retired for new keys):
   - `GEMINI_MODEL=gemini-flash-latest` (chat / bulk / extraction)
   - `GEMINI_MARKING_MODEL=gemini-flash-latest` (marking; use `gemini-pro-latest` on billing)

Restart `npm run dev` after editing `.env.local`.

### 3. Try it

- Sign up as a **student** → open Home → **Load sample progress** to populate the
  dashboard, streak, and study plan instantly.
- Go to **Practice** → answer the osmosis question → Atlas marks it like an examiner.
- Sign up (separately) as an **admin** to see the analytics dashboard.

---

## Design language

Apple-minimalist, premium, restrained. Ink + a single refined **indigo** accent;
warm amber reserved for streaks; **never** Duolingo green. Generous whitespace,
soft layered shadows, SF Pro on Apple devices (Inter fallback), full light/dark.
Tokens live in [`src/app/globals.css`](src/app/globals.css).

Duolingo-style *mechanics* (XP, streaks, daily goal, progress rings, a "next
thing to do" plan) rendered in that premium visual language.

## Architecture notes

- **Model-agnostic AI** wrapper in [`src/lib/gemini.ts`](src/lib/gemini.ts) — swap
  models per task via env. Marking uses a JSON schema for structured, examiner-style output.
- **RLS everywhere** — students see only their own rows; admins can read aggregates.
  Enforced in Postgres, not just the app (see `0001_init.sql`).
- **Streaks** are computed atomically in the `touch_streak` RPC (Asia/Singapore day
  boundary) and called after each marked answer.
- `src/middleware.ts` guards protected routes. Next 16 prefers the `proxy` convention;
  the current `middleware` file still works (you'll see a deprecation warning).

## Project layout

```
src/
  app/
    (auth)/        login, signup, auth server actions
    (app)/         authenticated shell: learn, practice, tutor, plan, admin
    api/           tutor + mark route handlers (Gemini)
    checkout/      temporary subscription flow
    pricing/, page.tsx
  components/      ui primitives, dashboard, tutor, practice, pricing
  lib/             supabase clients, data access, gemini, plans, utils
supabase/
  migrations/      0001_init.sql, 0002_demo_progress.sql
  seed.sql
```

## Roadmap

See the founder blueprint for the full plan. Next up: RAG over uploaded past
papers, the OCR scan-and-mark pipeline, tutor classrooms, and real Stripe billing.
