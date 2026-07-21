# Agent Playbook — how to work on this repo

This is the *method* companion to `ARCHITECTURE.md`. `ARCHITECTURE.md` tells you
what the code **is**; this file tells you how to **change it** without breaking
things or wasting the user's time. It's written from experience shipping many
features on this exact project. Read both before your first edit.

The owner is a boutique operator, not an engineer. They describe outcomes
("remove the rating", "videos aren't uploading"), often with a screenshot and
terse text. Your job is to translate that into safe, verified changes and to be
honest about anything you can't fully guarantee.

---

## 0. The core loop (do this every task)

```
UNDERSTAND → PLAN → CHANGE → VERIFY (build + browser) → COMMIT+PUSH → REPORT
```

Never skip VERIFY, and never skip REPORT. A change that isn't built, checked,
and pushed doesn't exist for the user — they only see the live site.

---

## 1. UNDERSTAND before touching anything

- **Read the request literally, then translate.** A screenshot with "remove
  this" means: find the exact component, confirm it's the thing shown, check
  what else references it.
- **Grep first, read second.** Locate every occurrence before editing:
  ```
  grep -rn "HANDLOOMED\|rating\|SORT" src --include="*.tsx"
  ```
- **Trace the data end to end.** Before removing a "Collections" tab, I grepped
  for where `collections` was *rendered* on the public site — found it never
  was, which changed the recommendation from "wire it up" to "it's dead, remove
  it." Always ask: *is this even used?*
- **Distinguish the three similarly-named things** (this repo is full of them):
  the nav "COLLECTIONS" (= shop), the "Featured Collection" (homepage row), and
  the dead `collections` table are unrelated. Confirm which one the user means.

## 2. PLAN with the user only when it changes what you build

- Act on sensible defaults; don't over-ask. But when scope is genuinely
  ambiguous **and the answer changes the work**, ask one tight multiple-choice
  question (e.g. "which of these preview sections do you want removed?"). One
  round-trip beats building the wrong thing.
- State the decisions you're making unilaterally in your final report
  ("I kept `price` in the model at 0 so the DB `NOT NULL` doesn't break"), so
  the user can veto.

## 3. CHANGE — the house rules

- **Reuse the established pattern; never write a second uploader.** Images go
  through `imageOptimizer.ts` + `imgbb.ts` + `ImageUploadField`. Videos mirror
  that exactly: `videoOptimizer.ts` + `videoUpload.ts` + `VideoUploadField`. New
  media features extend these; they don't reinvent them.
- **Match the surrounding code.** Tailwind tokens (`maroon-900`, `gold-500`)
  plus the admin's literal hex (`#1A0508`, `#D4AF37`). Optimistic mutations.
  `crypto.randomUUID()` for ids. `formatDateDDMonYYYY()` for dates.
- **Mutations are optimistic**: write to Supabase *and* update local state, so
  the admin never has to refresh.
- **Fail gracefully.** A missing table/bucket/env var should degrade (fall back
  to samples, show an actionable message), not white-screen. See the marquee
  falling back to sample testimonials, and the hero `onError` fallback.
- **Big mechanical edits:** small Python/`sed` scripts are fine for repetitive
  replacements, but re-`grep` afterwards to confirm — a `replace` that expects a
  trailing comma will silently miss the last destructured prop. (That exact bug
  happened; the build caught it.)

## 4. VERIFY — this is non-negotiable

Two gates, in order:

**a) Static:** `npx tsc --noEmit && npm run build`. `tsconfig` is loose (no
`strict`, no `noUnusedLocals`), so lean on the build to catch JSX/type breakage.
For a security-sensitive change, add a bundle grep, e.g. confirm a secret is
**not** shipped:
```
grep -rl "$SECRET" dist/ && echo "LEAKED" || echo "clean"
```

**b) Runtime (browser):** start the dev server, then **verify with DOM queries,
not screenshots.**
- The in-app browser's screenshots frequently render **blank even when the DOM
  is correct** — do not trust them for pass/fail. Use `javascript_tool` to
  assert real state: element counts, computed values, network calls.
- Examples that actually caught/proved things this project:
  - opened a product, read `scrollY` before/after close to prove the
    "jumps to top" fix (`preserved: true`)
  - counted `[id^=product-card-]` and checked `opacity` to prove cards render
  - asserted **0** `/rest/v1/(bookings|orders)` requests as an anonymous visitor
    to prove PII isn't leaked
- **Known harness quirk:** a plain `.click()` on the featured card doesn't open
  the modal *even on the deployed old build*. Proving it fails identically on
  production is how you distinguish "my change broke it" from "the tool can't
  drive it." When automation can't exercise a path, say so and fall back to code
  reasoning — don't claim it works and don't claim it's broken.
- Start servers only via the preview tooling (never a raw `npm run dev` in bash)
  and **stop the server** when done so the port is freed.

## 5. COMMIT + PUSH after each logical unit

- One coherent change = one commit. Descriptive body: the *why*, the user-facing
  effect, and any follow-up the user must do.
- Always end the commit body with the project's `Co-Authored-By` trailer.
- Push to `main` (the user watches the deploy). Confirm the push succeeded.
- The user's Vercel auto-deploys `main`; **code being pushed ≠ live** — always
  remind them a redeploy is needed when env/`vercel.json`/build-time values
  changed.

## 6. REPORT honestly

- Lead with what changed and what you verified ("scroll preserved at 1369px",
  "key not in `dist/`").
- **Separate "done" from "needs you."** Anything requiring a Supabase/Vercel
  click is the user's step — spell out the exact clicks.
- Never overstate. If you couldn't test something, say which part and why.
- Surface risks you notice even if unasked (the ImgBB key exposure, the
  `authenticated ≠ admin` RLS flaw) — but frame urgency accurately.

---

## 7. Hard constraints specific to this project

These are the ones that will bite you if you forget them:

1. **You cannot reach the app's live database.** The Supabase project reachable
   via MCP tooling is a *different* project than the one the app uses. So you
   **cannot run migrations yourself** — you hand the user SQL and they run it in
   their SQL Editor. Everything DB-shaped is: write the SQL, put it in
   `migrations.sql` / `security-policies.sql`, and give paste-ready steps.
2. **Secrets ship in the client bundle.** `VITE_*` vars are inlined into public
   JS. The Supabase anon key is *meant* to be public (guarded by RLS). The ImgBB
   key is **not** — it's proxied through `api/upload-image.js`. Never introduce a
   new secret as `VITE_*`; use an `api/` function instead.
3. **The database is the security boundary, not the UI.** The admin login gates
   *rendering*, nothing more. Real protection is RLS scoped to the admin email
   via `public.is_admin()` — never plain `authenticated` (anyone can sign up and
   satisfy that role).
4. **RLS SQL is dangerous to re-run.** `security-policies.sql` starts with
   `create or replace function public.is_admin()` containing a placeholder
   email. Re-running it blindly **resets the admin email and locks the owner
   out.** New tables' policies go in `migrations.sql`, reusing (or conditionally
   creating) `is_admin()` — do **not** tell the user to re-run the whole
   security file.
5. **Idempotency.** Every migration must be safe to run twice
   (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`, guarded function creation).
6. **ffmpeg.wasm must stay single-threaded.** The multithreaded core needs
   cross-origin isolation (COOP/COEP), which would break every ImgBB-hosted
   image site-wide. It's also lazy-loaded — don't import it eagerly.
7. **Never persist a build-specific asset path to the DB.** Vite hashes asset
   filenames per build; a stored `/src/assets/x.jpg` 404s in production.

---

## 8. A worked example (the shape of a good task)

> User: "videos are not uploading" + screenshot of a Supabase error.

1. **Understand:** read the error text in the screenshot ("Bucket not found",
   later "row-level security"). Grep the upload handler; confirm the bucket name
   and that it's a Supabase Storage call.
2. **Diagnose the real cause:** the bucket/policy doesn't exist — a
   *configuration* problem on the user's side, not a code bug. But also improve
   the code so the error is *actionable*.
3. **Change:** detect that specific error and alert the exact fix steps; document
   the bucket + policies in `security-policies.sql`.
4. **Verify:** build; confirm the new message path compiles.
5. **Commit + push.**
6. **Report:** "code side handles it; here are the 3 clicks in Supabase you must
   do; it's a config step I can't do for you because I can't reach your project."

That's the whole method: understand deeply, change minimally and in-pattern,
prove it, push it, and be honest about the seams.
