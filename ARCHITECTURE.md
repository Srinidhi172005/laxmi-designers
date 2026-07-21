# Laxmi Designers — Project Guide

A boutique fashion-studio website (Machilipatnam, India) with a built-in admin
panel. **There is no cart or checkout** — customers browse the catalogue and
enquire over WhatsApp, or book a consultation.

This document is written for a developer or coding agent picking the project up
cold. Read it before changing anything.

> **Working on this repo as an AI agent?** Read
> [`AGENT_PLAYBOOK.md`](AGENT_PLAYBOOK.md) too — it's the *method* companion:
> the change loop, the verify-with-DOM-not-screenshots rule, the "you can't
> reach the live DB" constraint, and the RLS/secret pitfalls that will bite you.

---

## 1. Stack

| Concern | Choice |
|---|---|
| UI | React 19 + TypeScript, single-page app |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Animation | `motion` (Framer Motion) |
| Icons | `lucide-react` |
| Database + Auth + video storage | Supabase |
| Image hosting | ImgBB |
| Video transcoding | `@ffmpeg/ffmpeg` (ffmpeg.wasm), lazily loaded |
| HEIC decoding | `heic2any`, lazily loaded |
| Hosting | Vercel |

Commands: `npm run dev` (port 3000) · `npm run build` · `npm run lint` (`tsc --noEmit`).

---

## 2. The one thing that surprises people

**`src/App.tsx` is the whole website.** It is ~1600 lines and holds every
public page, all data fetching, and every mutation handler. Pages are not
routed with a router — they are conditional blocks keyed off a `currentView`
string:

```tsx
{currentView === "home"    && ( … )}
{currentView === "shop"    && ( … )}   // labelled "COLLECTIONS" in the nav
{currentView === "journal" && ( … )}
{currentView === "about"   && ( … )}
{currentView === "services"&& ( … )}
{currentView === "contact" && ( … )}
{currentView === "admin"   && ( … )}
```

`currentView` is synced to the URL with `history.pushState`, and read back from
`window.location.pathname` on load and on `popstate`. That is why
**`vercel.json` needs the SPA rewrite** — without it, loading `/admin`
directly returns Vercel's 404 before the app ever boots.

### Layout rule that is easy to break
The product preview modal is rendered as a **fixed overlay _next to_ `<main>`**,
never as a ternary alternative to the page:

```tsx
<main> …page… </main>
{selectedProduct && <ProductDetailModal … />}
```

If you "simplify" this back into `selectedProduct ? <Modal/> : <page/>`, the
whole page unmounts when the preview opens and remounts on close — which resets
the scroll position to the top. That bug has been fixed once already.

---

## 3. File map

```
src/
├── App.tsx                  ← all pages, all data fetching, all mutations
├── types.ts                 ← shared domain types (start here)
├── supabase.ts              ← Supabase client (falls back to a mock if env is missing)
├── data.ts                  ← SAMPLE_PRODUCTS + STORIES (seed/fallback content)
├── components/
│   ├── Header.tsx           ← nav, mobile mega-menu, search overlay
│   ├── ProductCard.tsx      ← catalogue card
│   ├── ProductDetailModal.tsx ← the "preview" overlay
│   ├── ConciergeModal.tsx   ← consultation booking form (writes `bookings`)
│   ├── AdminLogin.tsx       ← Supabase Auth email/password sign-in
│   ├── AdminPanel.tsx       ← the entire admin (~1400 lines, code-split via lazy())
│   ├── ImageUploadField.tsx ← reusable image upload (optimize → ImgBB)
│   ├── VideoUploadField.tsx ← reusable video upload (optimize → Supabase Storage)
│   └── …marquees, toasts, skeletons
└── utils/
    ├── imageOptimizer.ts    ← resize → WebP → compress
    ├── imgbb.ts             ← ImgBB upload + retry
    ├── videoOptimizer.ts    ← validate → MP4/H.264/AAC → poster frame
    ├── videoUpload.ts       ← Supabase Storage upload + retry
    ├── date.ts              ← the DD/MON/YYYY format used everywhere
    └── safeUrl.ts           ← blocks `javascript:` URIs in href/src
```

Root: `schema.sql` (full DDL) · `migrations.sql` (pending ALTERs) ·
`security-policies.sql` (RLS — **must be run**) · `vercel.json` (SPA rewrite +
security headers).

---

## 4. Data model

Types live in `src/types.ts`. Tables (`schema.sql`):

`products` · `categories` · `subcategories` · `homepage_banners` · `videos` ·
`settings` (single row, id `boutique_config`) · `bookings` (enquiries) ·
`orders` (legacy, unused by the UI) · `collections` (**dead — see §8**).

### Naming gotcha: DB is snake_case, the app is camelCase
The mapping happens by hand in `App.tsx`'s `fetchData()`. Notably:

| DB column | App field |
|---|---|
| `category_id` | `product.category` |
| `subcategory_id` | `product.subcategory` |
| `discount_price` | `product.originalPrice` |
| `image_urls[0]` / `[1]` | `primaryImage` / `secondaryImage` |
| `is_featured` | `product.isFeatured` |

`product.category` holds a **category id**, not a name. `src/App.tsx`'s
`resolveCatId()` tolerates either, so filtering never silently hides an item.

### Fields kept but deliberately not shown
`price` / `originalPrice` still exist (schema requires `price NOT NULL`) but the
boutique shows **no prices anywhere**; new products save `price: 0`. Likewise
`sizes` is `[]` and `rating` is a constant. Don't "restore" these — their
removal was requested.

---

## 5. Media pipelines (both are reusable — do not write new upload code)

### Images → `ImageUploadField`
`optimizeImage()` decodes (HEIC via lazy `heic2any`), downscales (never
upscales), converts to **WebP**, compresses, then `uploadToImgBB()` uploads with
retry. Only the optimized WebP is uploaded. Presets in `IMAGE_PRESETS`:

| Preset | Max | Quality |
|---|---|---|
| category | 800×800 | 0.80 |
| product / collection | 1200×1200 | 0.85 |
| banner | 1920×900 | 0.90 |
| logo | 512×512 | 0.90 |

### Videos → `VideoUploadField`
`optimizeVideo()` validates, transcodes to **MP4 / H.264 / AAC**, caps at
**1920×1080** and **30fps**, compresses with `-crf 23` and a bitrate ceiling by
height (1080p 5 Mbps · 720p 2.5 Mbps · 480p 1 Mbps), adds `+faststart` for
progressive streaming, and captures a **WebP poster** at ~2.5s. Then
`uploadOptimizedVideo()` puts the MP4 in the Supabase `videos` bucket and the
poster on ImgBB.

Two behaviours worth knowing:
- **Fast path** — a file that is already an MP4 within limits is passed through
  untouched, so ffmpeg never loads.
- **Lazy engine** — ffmpeg.wasm (~32 MB, single-threaded so it does *not* need
  `SharedArrayBuffer`/COOP-COEP) is fetched from unpkg only when a file actually
  needs converting. If it can't load and the file is already web-playable, the
  upload proceeds unoptimized rather than failing.

> Do **not** switch to the multithreaded ffmpeg core. It requires cross-origin
> isolation, which would block the ImgBB-hosted product images site-wide.

---

## 6. Auth & security model — read before touching

- The admin is a **real Supabase Auth user**. `AdminLogin` calls
  `signInWithPassword`; the session is restored via `getSession()` and kept in
  sync with `onAuthStateChange`.
- **Customers never sign in.** They browse anonymously with the public anon key.
- The Supabase **anon key ships in the browser bundle** — unavoidable, and by
  design (it is meant to be public). Therefore *the database, not the UI, is the
  security boundary*: `security-policies.sql` is what actually protects data.
- The **ImgBB key does NOT ship to the browser.** It is an unscoped bearer
  credential, so uploads are proxied through `api/upload-image.js`, which holds
  the key server-side and verifies the caller's Supabase session + admin email.
  Never reintroduce `VITE_IMGBB_API_KEY` in production — a `VITE_*` variable is
  inlined into the public bundle. (It is still used in `npm run dev`, where no
  serverless runtime exists; that branch is dead code in a prod build.)
- RLS shape: `anon` may **read the catalogue** and **insert one booking**;
  everything else requires the admin. Admin policies are scoped to a **specific
  email** via `public.is_admin()`, not merely the `authenticated` role — because
  with public signups enabled, anyone could mint an `authenticated` session.
- Customer PII (`bookings`, `orders`) is fetched **only when `adminAuthed`**, and
  the realtime channel subscribes to catalogue tables only, so PII never rides
  the websocket.
- Any DB-sourced URL rendered into `href`/`src` goes through
  `safeUrl.ts` to block `javascript:` payloads.

### Serverless functions
`api/upload-image.js` is the only backend code. Vercel auto-deploys anything in
`/api`. It requires the server-side env vars `IMGBB_API_KEY` and `ADMIN_EMAIL`
(see `.env.example`). Note `/api/*` does **not** run under `npm run dev`, which
is why `utils/imgbb.ts` has a dev-only direct path.

---

## 7. Setup from scratch

1. `.env` (see `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_IMGBB_API_KEY`. **Vite inlines these at build time** — changing them in
   Vercel requires a **redeploy**, not just a save.
2. Supabase → SQL Editor → run `schema.sql` (new project) or `migrations.sql`
   (existing), then `security-policies.sql` (edit the admin email at the top).
3. Supabase → Authentication → Users → add the admin user.
   Then Providers → Email → **turn off "Enable sign ups"**.
4. Supabase → Storage → New bucket named exactly `videos`, "Public bucket" on.
5. Deploy to Vercel. `vercel.json` supplies the SPA rewrite and security headers.

---

## 8. Traps and history

- **`collections` is dead.** The table and admin tab were removed because
  nothing ever rendered them. The table may still exist in the DB. Homepage
  curation is now the **Featured** tab (`products.is_featured`).
- **Two different "collections".** The nav item labelled *COLLECTIONS* is the
  **shop** view; the *Featured Collection* is the homepage product row. Unrelated.
- **Never persist a bundled asset path.** A previous bug stored Vite's
  `/src/assets/hero.jpeg` into `homepage_banners.image_url`; that path 404s in a
  production build. The hero now has an `onError` fallback to the bundled image,
  and the default banner saves an empty `image_url`.
- **Cards must not use `whileInView`.** Product cards animate with `animate`, not
  `whileInView` — the latter left cards stuck at `opacity: 0` on mobile and when
  data arrived after the viewport check.
- **Dates** are `DD/MON/YYYY` everywhere via `formatDateDDMonYYYY()`.
- **Screenshot flakiness:** the in-app browser preview sometimes renders blank
  even when the DOM is correct. Verify with DOM queries, not screenshots.
- The Supabase project reachable via MCP tooling is **not** the project this app
  uses. Schema changes must be handed to the owner as SQL.

---

## 9. Conventions

- Colours are Tailwind theme tokens (`maroon-900`, `gold-500`, `cream-100`,
  `espresso`) plus literal hex in the admin (`#1A0508`, `#D4AF37`). Match
  surrounding code.
- Mutations are optimistic: every add/update/delete writes to Supabase **and**
  updates local state immediately, so the admin never needs to refresh.
- User-facing copy is Title Case or UPPERCASE with wide tracking; keep the
  existing tone.
- `tsconfig` is loose (no `strict`, no `noUnusedLocals`) — unused vars won't
  fail the build, so clean up deliberately.
