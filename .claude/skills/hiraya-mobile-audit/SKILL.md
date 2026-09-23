---
name: hiraya-mobile-audit
description: Verify a Hiraya UI change on the device learners actually own - Playwright at 360x800, WCAG 2.1 AA via the accessibility tree, the 500 KB first-load budget, offline behaviour, and home-screen PWA install. Use before merging any user-facing UI change.
---

# Hiraya mobile audit

Hiraya's users are learners on budget Android phones with prepaid data, and teachers checking approvals
between classes. A screen that works on a laptop has not been tested.

## When to use

Before merging any user-facing UI change. Mandatory before a phase closes.

## Inputs required

- The route(s) changed
- A running dev server (`npm run dev`) or a preview URL
- `docs/DESIGN_SYSTEM.md` §8 (accessibility) and §11 (performance rules)

## Workflow

### 1. Size the viewport honestly

`browser_resize` to **360×800**. This is a common budget Android viewport, not a worst case. Never audit
at desktop width and assume it scales down.

### 2. Accessibility tree, not screenshots

`browser_snapshot` and read the tree. A screenshot shows what a page *looks like*; the tree shows what it
**is**. Contrast failures, missing labels, and broken heading order are invisible in an image.

Check:

- [ ] One `h1` per screen; heading order unbroken
- [ ] Every interactive element has an accessible name
- [ ] Landmarks present (`main`, `nav`, `banner`)
- [ ] Form inputs have associated labels, not placeholder-only
- [ ] Images have `alt`; decorative ones have `alt=""`
- [ ] Buttons are `<button>`, links are `<a>` — not divs with handlers
- [ ] Live regions announce XP changes and queue-count updates

### 3. Contrast and touch targets

- [ ] Body text ≥4.5:1; large text ≥3:1
- [ ] `--ink-subtle` used only at 16px and above — **never for body text**
- [ ] Interactive targets ≥44×44px
- [ ] Visible focus ring on every focusable element
- [ ] No meaning carried by color alone — status has an icon and a word

### 4. Payload budget

`browser_network_requests` on a cold load. Total transferred for first load must be **≤500 KB**.

If over, in this order: raster art that should be SVG → unsplit routes → a font weight nobody uses →
an unnecessary client component. Do not merge over budget; it is an NFR, not a preference.

### 5. Layout at 360px

- [ ] **No horizontal page scroll** — tables and charts scroll inside their own containers
- [ ] Side gutters ≥16px maintained throughout
- [ ] No element with a `min-width` wider than the viewport
- [ ] Bottom tab bar visible and not overlapped by content
- [ ] Text does not truncate into meaninglessness — check the longest realistic org and event names

### 6. Offline behaviour

Emulate offline and reload:

- [ ] Cached content renders with a visible "as of" timestamp
- [ ] The offline empty state appears where there is nothing cached
- [ ] Actions that cannot work offline are disabled **with a reason**, not silently broken
- [ ] The scanner still works fully and shows its queue count

### 7. Both locales

- [ ] No bare string literals in JSX
- [ ] Layout survives longer Filipino strings — Filipino text commonly runs longer than English, and a
      button that fits in English can break in Filipino

### 8. Home-screen PWA install

There is no native shell to check parity against (D35) — the installed PWA *is* the app.

- [ ] Route works when launched from the home screen, not only from a browser tab
- [ ] Device-API calls (camera, storage) degrade gracefully when permission is refused
- [ ] Safe-area insets respected (notch, home indicator) — standalone display mode has no browser chrome
      to absorb them

## Outputs

A pass/fail result per criterion with **specific violations** — element, expected, actual. Never a
general impression like "looks fine on mobile".

## Validation

Do not merge with any failure in sections 2–5. Sections 6–8 may carry a documented exception where the
route genuinely has no offline or native surface — state which and why.
