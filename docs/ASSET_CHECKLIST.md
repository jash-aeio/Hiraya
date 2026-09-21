# Hiraya — Asset Checklist

**Status:** Approved for Phase 0 · **Version:** 1.1 · **Last updated:** 2026-09-21

Everything that must exist before Hiraya can be demoed, piloted, and shipped to app stores. Tiered by
**what each asset blocks**, so nothing is produced earlier than it is needed.

---

## How these get made

**Custom art is authored as hand-written SVG.** Not generated raster, not commissioned — written
directly as markup. For this project that is the right call rather than a compromise: SVG is free, a few
hundred bytes per asset against a 500 KB budget, recolors straight from design tokens, and stays crisp on
every screen density. Generated raster art would look richer and cost the performance budget the product
depends on.

**Everything else comes from vetted free libraries**, chosen for license clarity and SVG output:

| Library | License | Used for |
|---|---|---|
| [Lucide](https://lucide.dev) | ISC | All UI icons. Tree-shaken, never a whole icon font |
| [unDraw](https://undraw.co) | Open, no attribution required | Empty states, hero illustration — recolored to `--primary` |
| [Storyset](https://storyset.com) | Free with attribution | Alternative illustration source if unDraw does not fit |
| [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | SIL OFL | Typeface, self-hosted |

**Review point.** Everything in Tier 1 is produced during Phase 0. Look at it in the real UI, on a real
phone, before Phase 1 begins. If the authored style works, it stays for the life of the project; if it
does not, that is the cheapest possible moment to change direction.

**Where the files live.** There is no separate `assets/` source tree, and the earlier plan for one was
dropped when the art was authored (2026-09-21): a hand-written SVG *is* its own editable source, so a
second copy under `assets/` would have been two files to keep in step with nothing gained. Static art —
avatars, empty states, hero, the demo crest — sits in `public/` and is fetched lazily, off the JavaScript
budget entirely. Art that must be recolored by a token or sized by a caller — the logomark, wordmark,
category marks, level badges, XP mark, podium — is authored as SVG inside components in
`src/design/art/`, which is also what lets the category marks paint in `currentColor`.

**Raster is generated, never committed.** The PWA, Apple and OG images are produced at build time by
`ImageResponse` from the same logomark drawing (`src/design/art/logomarkDataUri.ts`), so a raster icon
cannot drift from the vector it came from and no binary enters the repository.

---

## Tier 1 — Blocks the demo (Phase 0)

Without these there is nothing to show the school, and the pitch is where this project lives or dies.

### 1.1 Brand

| Asset | Format | Spec | Status |
|---|---|---|---|
| Wordmark `hiraya.` | Component | Logomark + real type in `--font-sans`; amber full stop | [x] `src/design/art/Wordmark.tsx` (2026-09-21) |
| Logomark | SVG | 1:1, rising chevron under an amber point, legible at 24px | [x] `src/app/icon.svg` + `Logomark.tsx` (2026-09-21) |
| Browser icon | SVG | `sizes="any"` — supersedes `favicon.ico` | [x] `src/app/icon.svg` (2026-09-21) |
| `pwa-192.png` | PNG | 192×192 | [x] generated, `/icons/pwa-192.png` (2026-09-21) |
| `pwa-512.png` | PNG | 512×512 | [x] generated, `/icons/pwa-512.png` (2026-09-21) |
| `maskable-512.png` | PNG | 512×512, mark at 60% for the adaptive-icon crop | [x] generated (2026-09-21) |
| Apple touch icon | PNG | 180×180, opaque | [x] `src/app/apple-icon.tsx` (2026-09-21) |
| OG share image | PNG | 1200×630 | [x] `src/app/opengraph-image.tsx` (2026-09-21) — see the caveat below |
| Web manifest | JSON | name, colors, the four icons | [x] `src/app/manifest.ts` (2026-09-21) |

> **The wordmark is a component, not a file.** A wordmark baked into SVG either traces the glyphs —
> unmaintainable, and a second copy of the licence question — or carries `<text>` that silently falls
> back to a system font whenever the file is loaded through `<img>`, where no stylesheet reaches it.
>
> **`favicon.ico` is deliberately absent.** `icon.svg` covers every browser that matters on a budget
> Android, at a fraction of the bytes, and Next emits `sizes="any"` for it.
>
> **Open: the OG card's typeface.** It renders in `ImageResponse`'s bundled default, not Plus Jakarta
> Sans, because `next/font` hands us a hashed build artefact and Satori needs a real TTF. Fixing it
> means vendoring a ~200 KB font file — a decision worth taking deliberately rather than quietly. The
> mark and the palette carry the brand until then, and the card is legible and on-colour as it stands.

### 1.2 Typography

- [x] Plus Jakarta Sans — shipped as the **variable** font covering 400-800 in one file, rather than five
      static weights. Fewer bytes, one request (2026-09-21)
- [x] Latin subset, self-hosted via `next/font` — **no runtime font CDN**. Costs a build that needs
      network access once, and caches after (2026-09-21)

### 1.3 Icons

- [x] Lucide wired up, tree-shaken — `lucide-react`, imported per icon (2026-09-21)
- [x] **6 org-category icons — authored** in `src/design/art/CategoryIcon.tsx`, drawn to Lucide's grid
      and painting in `currentColor` so the caller applies the token (2026-09-21):

| Category | Motif | Token |
|---|---|---|
| Academic | Open book | `--cat-academic` |
| Arts | Palette / musical note | `--cat-arts` |
| Sports | Ball / whistle | `--cat-sports` |
| Service | Hands / heart | `--cat-service` |
| Faith-based | Sunrise (deliberately non-denominational) | `--cat-faith` |
| Special interest | Sparkle / puzzle piece | `--cat-interest` |

### 1.4 Gamification art

| Asset | Count | Spec | Status |
|---|---|---|---|
| **Level badges — authored** | 4 | Kasapi, Lingkod, Tagapagtaguyod, Bayani. Layered SVG: ribbon, disc, star, pips. Palette per `docs/DESIGN_SYSTEM.md` §9 | [x] `LevelBadge.tsx` (2026-09-21) |
| XP coin | 1 | Small amber mark for XP values | [x] `XpCoin.tsx` (2026-09-21) |
| Podium frame | 1 | Top-three leaderboard, 1st raised | [x] `XpCoin.tsx` (2026-09-21) |
| Rank rings | — | CSS, not an asset — token-colored border by level tier | — |

> **The tier number is drawn, not only coloured.** Each badge carries its tier as pips beneath the
> star. DESIGN_SYSTEM.md §9 asks the progression to survive greyscale and colour-blind viewers, and a
> cool-to-warm ramp alone does not do that — it makes Bayani read as *yellow* rather than as *fourth*.
> The Bayani star is deep brown rather than white for the same reason: white on amber is about 1.9:1.

> **No streak icons.** FR-5.10 bans daily login streaks. If an asset request for one ever appears, the
> request is wrong, not the checklist.

### 1.5 Avatars (D13)

| Asset | Count | Spec | Status |
|---|---|---|---|
| **Avatar set — authored** | 12–16 | Geometric, non-photographic, non-figurative enough to avoid implying ethnicity or gender. Each ≤2 KB | [x] 14 in `public/avatars/`, 273–430 bytes each (2026-09-21) |
| Unlock frames | 4 | Decorative rings tied to level tiers — the zero-cost reward FR-5 already asks for | [x] `UnlockFrame` in `LevelBadge.tsx` (2026-09-21) |

No photo uploads exist. That is a privacy decision (CLAUDE.md §6), not an asset shortfall.

### 1.6 Empty states

Five. Authored rather than recolored from unDraw in the end — at this size the token palette and a flat
geometric style read better than a recolored illustration, and each file came out under a kilobyte. All
in `public/empty/` (2026-09-21):

- [x] No events yet — `no-events.svg`
- [x] No organizations joined — `no-orgs.svg`
- [x] No check-ins yet — `no-checkins.svg`
- [x] No announcements — `no-announcements.svg`
- [x] Offline / no connection — `offline.svg`. *Deliberately calm: no red, no warning triangle, no
      severed cable. It appears at the worst moment of the worst day — a scanner at a gate with no
      signal — and its whole job is to say "held safely, will send".*

### 1.7 Hero illustration

- [x] One landing illustration at `public/hero/hero.svg` (2026-09-21), `--primary` + `--xp`. Abstract
      rather than figurative, for the same reason the avatars are: three ascending columns under a
      rising chevron. Hidden below 480px per the performance rules.

### 1.8 Demo seed data

Committed under `/seed/demo-*`, loaded by `npm run db:seed:demo`.

| Asset | Spec |
|---|---|
| Fake school | Name + authored SVG logo. **Must not resemble a real school** |
| 6 organizations | One per category, with logos, missions, officer lists |
| 12 events | Across categories, spread over past and future dates |
| 40 learners | Obviously fictional names across all grade levels |
| 3 advisers, 2 SSLG officers, 1 admin | Full role coverage for the walkthrough |
| Pre-computed ledger + leaderboard | So the demo opens with a populated board, not an empty one |
| **DEMO DATA marker** | Persistent UI banner, driven by `schools.is_demo`. Non-dismissible |

The marker is not decoration. It is what stops a screenshot of the demo from ever being mistaken for real
learner records.

**Landed 2026-09-21.** The tenant is seeded and re-runnable: 1 school, 44 profiles, 6 organizations,
12 events, 74 check-ins and 90 ledger rows, from hand-authored JSON under `seed/` (see
`seed/README.md`). Two deviations from the table above, both deliberate:

- **No `leaderboard_snapshots` row.** The board is computed from the ledger. A seeded snapshot is the
  one thing in the demo capable of disagreeing with the points it claims to summarise.
- **No `profile_identifiers` rows.** Synthetic learners have no LRN, and seeding fake hashes would put
  a privacy-sensitive shape in the demo in exchange for nothing.

**The DEMO DATA marker landed 2026-09-21**, with the persona switcher (D23) and for the reason the
previous note gave: `/demo` is the first screen in the repository to render a seeded learner's name, so
the marker became due the moment it existed. It is `src/features/demo/components/DemoBar.tsx`, rendered
in the **root layout** rather than on each screen - a marker each screen has to remember is a marker one
screen will forget, and that screen is the one in the deck. It names the persona and the synthetic
school, carries the word as well as the colour, and is not dismissible. It renders nothing at all when
there is no demo session, so it cannot mark a real tenant by accident.

Two limits worth knowing. It resolves on the **server** from the session cookie, so it is in the first
HTML painted and cannot be photographed missing - but a Capacitor static export has no server render,
and Phase 5 needs a client variant of this component. And it marks a *session*, not a *page*: the
`/demo` persona list itself renders synthetic names before any session exists and therefore carries no
bar. That is defensible only because the page says "Demo tenant" and names the school in its own
heading; a screen that lists learner data outside the demo route must not rely on it.

The school **logo SVG** landed at `public/brand/demo-school.svg` (2026-09-21): a generic crest for
"Halimbawa" — Filipino for "example". A demo logo resembling a real school's seal would put that
school's identity on a screen full of invented learners.

### 1.9 Pitch kit

| Asset | Format | Notes |
|---|---|---|
| One-page summary | PDF | Problem, solution, what the school gets, what it costs them (nearly nothing) |
| Slide deck | 5 slides | Problem → demo → privacy and consent → what we need → timeline |
| **Phone demo script** | Markdown | Exact 3-minute click path. Rehearse it — a demo that stalls is worse than no demo |
| Privacy one-pager | PDF | Anticipates the DPO's questions before they are asked. Bring it to the first meeting |

---

## Tier 2 — Blocks the real pilot (Gate B)

None of these are design assets. All of them are Gate B blockers, and they are the reason a personal
project can lawfully hold a thousand minors' records.

### 2.1 Legal and privacy

- [ ] **Privacy notice** — English and Filipino, written for learners, not lawyers
- [ ] **Guardian consent form** — printable, Filipino, one page
- [ ] **Data processing agreement** — school as controller, developer as processor; names purpose,
      retention, security measures, deletion obligations, and the transfer at Gate B
- [ ] Retention and deletion policy — including the honest explanation that ledger rows survive
      anonymized deletion (`docs/DATA_FLOW.md` §5)
- [ ] Community guidelines — accepted at first login *(Phase 2, with the forum)*
- [ ] Child-protection escalation flowchart — who is told, in what order, within what time

### 2.2 Operations

- [ ] CSV learner-import template + column spec
- [ ] Admin manual — import, activation codes, **password resets** (the D4 operational load), point
      rules, export, backup
- [ ] Officer quick-start — one page, laminated, lives at the gate
- [ ] Adviser quick-start — one page, approval in three taps
- [ ] Homeroom onboarding script + slide — the 10 minutes that decides the 80% activation KPI
- [ ] Custodian handover checklist — credentials, backup, restore, export

### 2.3 Launch print (against the ₱2,500 budget line)

- [ ] Tarpaulin
- [ ] QR standee — for the learner-scan fallback path (FR-4.3)
- [ ] Homeroom posters — activation instructions
- [ ] Officer lanyard cards — scanner quick reference

---

## Tier 3 — Blocks store submission (Phase 5)

### 3.1 Google Play

- [ ] Feature graphic 1024×500
- [ ] 8 phone screenshots (min 320px, 16:9 or 9:16)
- [ ] Icon 512×512, 32-bit PNG
- [ ] Short description (80 chars) + full description (4000)
- [ ] Privacy policy URL — publicly reachable
- [ ] Data Safety form answers
- [ ] **Families policy declaration**

### 3.2 Apple App Store

- [ ] Screenshots per required device class
- [ ] Icon 1024×1024, no transparency
- [ ] Description, keywords, support URL
- [ ] Privacy nutrition labels
- [ ] **Kids Category declaration** (if applicable)

> ⚠️ **Both stores apply stricter rules to child-directed apps.** No SDK may collect an advertising
> identifier. This constrains analytics choices and must be settled in Phase 5 — not discovered at
> submission, when a rejection costs a week of review latency.

---

## Summary

| Tier | Authored SVG | Library | Documents | Print | Blocks |
|---|---|---|---|---|---|
| **1** | ~30 files | Lucide, unDraw, 1 font | 4 pitch pieces | — | The demo |
| **2** | — | — | 12 documents | 4 pieces | The pilot (Gate B) |
| **3** | — | — | Store copy | — | Store submission |

**Total pre-demo production:** roughly 30 authored SVGs, three library integrations, and four pitch
documents. All of it belongs to Phase 0, and all of it fits inside 500 KB.
