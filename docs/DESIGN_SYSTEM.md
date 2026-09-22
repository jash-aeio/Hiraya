# Hiraya — Design System

**Status:** Approved for Phase 0 · **Version:** 1.0 · **Last updated:** 2026-09-21

Derived from the supplied visual reference (the "kuest." gamified-learning dashboard), adapted for
mobile-first use on budget Android, WCAG 2.1 AA, and a ≤500 KB first-load budget.

---

## 1. What we take from the reference, and what we do not

The reference is a strong match: its vocabulary — XP progress bars, level medals, avatar rank rings,
podium leaderboard, quest cards with a claim action, category-colored tiles — maps almost one-to-one onto
what Hiraya needs. It is adopted as the design language.

**Adopted:** light cool-grey canvas with white cards; generous 16px radii; soft two-layer shadows; a teal
primary used for the active nav pill and primary CTAs; an amber accent for points and progress; a
multicolor category palette; medal-style level art; the podium leaderboard; geometric sans typography;
section labels in small caps.

**Deliberately not adopted, with reasons:**

| Reference element | Why not |
|---|---|
| "GO PRO" upsell panel | No paid tier exists and none is planned |
| Friend-to-friend duels, friend list | Out of scope, and a child-safety surface we have no reason to open |
| **Daily quest streaks** | FR-5.10 **bans** login streaks — they drive anxiety-driven use and waste prepaid mobile data |
| Raster 3D-rendered medals and mascots | The single biggest threat to the 500 KB budget. Replaced by layered SVG |
| Three-column desktop layout | Hiraya is mobile-first; see §7 |
| Light grey secondary text on white | Fails WCAG AA at small sizes. Darkened — see §2 |

The last one matters more than it sounds. The reference's muted grey is roughly 3:1 against white; AA
body text requires 4.5:1. Copying it faithfully would have made the product inaccessible to exactly the
learners reading it on a cheap screen in daylight.

---

## 2. Color tokens

```css
:root {
  /* Canvas and surface */
  --canvas:        #F4F5F8;   /* app background */
  --surface:       #FFFFFF;   /* cards */
  --surface-sunk:  #EDEFF4;   /* wells, track backgrounds */
  --border:        #E4E7EE;

  /* Brand */
  --primary:       #0D7F7C;   /* nav pill, primary CTA  — 4.8:1 on white ONLY */
  --primary-hover: #0A6A67;
  --primary-soft:  #E3F2F1;   /* tinted backgrounds */
  --primary-ink:   #06504E;   /* text on canvas or primary-soft — 8.5:1 / 8.2:1 */

  /* Points and progress */
  --xp:            #F5A524;   /* XP coin, progress fill — decorative only */
  --xp-ink:        #8A5A00;   /* XP text on light       — 4.8:1 */
  --xp-soft:       #FEF6E7;   /* tinted background      — added 2026-09-21 */

  /* Text */
  --ink:           #141824;   /* headings, body         — 15.8:1 */
  --ink-muted:     #5A6472;   /* secondary              — 5.9:1  (reference was ~3:1) */
  --ink-subtle:    #7A8494;   /* tertiary, >=16px only  — 4.0:1  NOT for body text */
  --ink-inverse:   #FFFFFF;

  /* Status — each with a tinted background, added 2026-09-21 when Badge needed
     one: a status pill has to sit on something, and picking a tint per call site
     is how six slightly different greens appear. The ink is the token above it. */
  --success:       #0F7B4F;   --success-soft: #E6F4ED;
  --warning:       #B45309;   --warning-soft: #FDF1E3;
  --danger:        #C0392B;   --danger-soft:  #FCECEB;
  --info:          #2563A8;   --info-soft:    #E9F0F9;

  /* Organization categories */
  --cat-academic:  #3B6FF6;
  --cat-arts:      #E1428E;
  --cat-sports:    #F97316;
  --cat-service:   #0D9E8A;
  --cat-faith:     #8257E6;
  --cat-interest:  #5B5BD6;
}
```

**Rules.**

- `--xp` amber is **decorative only** — never text, never an icon carrying meaning alone. Use `--xp-ink`
  for any amber-toned text.
- `--ink-subtle` is for 16px and larger only. It fails AA for body copy and must never be used for it.
  **In practice this leaves it with no correct use yet:** no style in the §3 scale is both secondary and
  16px or larger, so every use of it in the first build was a contrast failure and the first mobile audit
  found all four. Reach for `--ink-muted` (5.9:1). The token stays defined for the day a large secondary
  style exists.
- Never encode meaning in color alone. Status chips carry an icon and a word; the scanner confirms with
  sound and motion as well as color (colour-blind officers work the gate too).
- Category colors identify, they do not rank. Never order or grade by them.

**Implementation.** `src/design/tokens.css` is this block in code, declared inside Tailwind's `@theme`
so each token also generates a utility (`bg-surface`, `text-ink-muted`). A colour is therefore reachable
only by naming a token, which is what makes "no literal hex in a component" cost nothing to obey.

**Dark mode** is not in the MVP. Tokens are structured so it can be added by redefining this block,
but shipping one untested theme is better than two half-tested ones.

---

## 3. Typography

**Plus Jakarta Sans** (SIL OFL), self-hosted via `next/font`. The closest free match to the reference's
geometric sans. Self-hosted, never a runtime font CDN — a render-blocking third-party request is the
wrong thing to spend the performance budget on.

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 28 / 34 | 800 | Screen titles, level-up moments |
| `h1` | 22 / 28 | 700 | Page headings |
| `h2` | 18 / 24 | 700 | Card headings |
| `h3` | 16 / 22 | 600 | Sub-headings |
| `body` | 15 / 22 | 400 | Default |
| `body-strong` | 15 / 22 | 600 | Emphasis |
| `small` | 13 / 18 | 400 | Metadata, timestamps |
| `label` | 11 / 14 | 600, +0.08em, uppercase | Section labels (as in the reference) |
| `numeral` | 20 / 24 | 700, tabular | XP values, counts, ranks |

Body never drops below 15px. Learners read this on cheap screens, often outdoors. `numeral` uses tabular
figures so leaderboard columns do not jitter as ranks change.

---

## 4. Shape, elevation, spacing, motion

```css
--radius-sm: 8px;    /* chips, inputs   */
--radius-md: 12px;   /* buttons, small cards */
--radius-lg: 16px;   /* cards, tiles — the reference's signature */
--radius-full: 999px;/* primary CTAs, nav pill, avatars */

--shadow-sm: 0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06);
--shadow-md: 0 2px 4px rgba(16,24,40,.04), 0 8px 16px rgba(16,24,40,.06);
--shadow-lg: 0 4px 8px rgba(16,24,40,.05), 0 16px 32px rgba(16,24,40,.08);
```

Spacing is a 4px scale: 4, 8, 12, 16, 20, 24, 32, 40, 48. Card padding 16px on mobile, 20px from `md`.

**Motion.** 150ms for feedback, 250ms for transitions, 400ms for a level-up celebration. Standard easing
`cubic-bezier(.2,0,0,1)`. **All motion respects `prefers-reduced-motion`** — XP still animates its number,
but nothing flies across the screen. The scanner never animates on the critical path: at 15 scans a
minute, a 250ms flourish is 6 wasted seconds an hour and an officer who starts ignoring the feedback.

---

## 5. The dual register (D12)

Same tokens, same type scale, same radii and spacing everywhere. Two moods.

| | **Learner surfaces** | **Adviser / admin surfaces** |
|---|---|---|
| Feel | Playful, rewarding, personal | Calm, dense, efficient |
| Color | Full category palette; amber XP prominent | Primary teal and neutrals; category color as a small marker only |
| Imagery | Level medals, avatars, illustrated empty states | Icons only; no medals, no mascots |
| Data | Progress bars, podium, rank rings | Tables, counts, sortable columns, export buttons |
| Hero element | XP card with level and progress | "Pending approvals: 3" with a direct action |
| Motion | Celebrates on level-up | None beyond state feedback |

**Why.** Advisers decide whether this platform survives, and they judge it on whether it saves them
paperwork. A dashboard that greets a teacher with medals and confetti reads as a student toy and quietly
loses the adoption argument before any feature is evaluated. Learners need the opposite. One token set
keeps it one product; the register keeps it credible to both.

---

## 6. Components

**Primitives** (`src/design/primitives/`, built 2026-09-21): Button (primary pill / secondary / ghost /
danger), IconButton, Input, Select, Textarea, Checkbox, Radio, Switch, Chip, Badge, Card, Sheet, Dialog,
Tabs, Toast, Skeleton, EmptyState, Avatar, ProgressBar, Spinner.

Two of these are shared internals rather than new inventory: `Modal` is what `Dialog` and `Sheet` both
are (a native `<dialog>`, which brings its own focus trap, Escape handling and inert background), and
`Field` is the label/hint/error wiring `Input`, `Select` and `Textarea` share so they cannot drift apart
on the thing that matters — that the label, the hint and the error are all tied to the control by id.

**`/design` renders every primitive on one page.** It is the Phase 0 review point, the surface
`hiraya-mobile-audit` runs against, and the place to look before building a component that may already
exist. See `src/design/README.md` for the working rules.

**Learner components**

| Component | Notes |
|---|---|
| `XPCard` | Level medal, title, XP progress to next level. The home hero. Mirrors the reference's level card |
| `LevelBadge` | Layered SVG medal + ribbon. Four tiers (§9) |
| `EventCard` | Category color bar, date, org, capacity remaining, register action |
| `CategoryTile` | The reference's colored mini-game tile, repurposed for Discover Orgs |
| `LeaderboardPodium` | Top three with rank rings, 1st raised. The reference's best idea; reads well at 360px |
| `LeaderboardRow` | Rank, avatar, name, XP. Tabular numerals |
| `RankRing` | Colored ring around an avatar by level tier |
| `AvatarPicker` | Curated set; locked entries show the unlocking level |
| `StatStrip` | Horizontal snap-scroll of stat cards (the reference's Overview row, made mobile) |

**Officer components**

| Component | Notes |
|---|---|
| `ScannerView` | Camera, persistent queue count, large scan result. Optimized for speed over polish |
| `ScanResult` | Full-bleed success/duplicate/error. **Color + icon + sound**, readable at arm's length |
| `QueueBanner` | Persistent "Queued: N · Sync now". Never hidden, never a silent failure |
| `RosterList` | Searchable, works from cache |

**Adviser / admin components**

| Component | Notes |
|---|---|
| `ApprovalCard` | Everything needed to decide, without navigating away. ≤3 taps from notification |
| `DataTable` | Sortable, exportable, horizontally scrollable in its own container |
| `ParticipationChart` | Recharts. **Load the `dataviz` skill before writing any chart** |
| `OutreachList` | The non-participant list. Framed for support, never ranked as a deficiency table |

---

## 7. Mobile translation of the reference

The reference is a three-column desktop dashboard. Hiraya is mobile-first at 360×800.

| Reference | Hiraya mobile | Hiraya desktop (≥1024px) |
|---|---|---|
| Left sidebar nav | **Bottom tab bar**, 5 items max | Sidebar returns, with the teal active pill |
| Right rail (duels, friends) | **Not ported.** Becomes a Notifications tab | Optional notification panel |
| Overview stat cards row | Horizontal snap-scroll `StatStrip` | 3-up grid |
| Mini-game category tiles | 2-up grid of `CategoryTile` | 4-up grid |
| Leaderboard + Daily Quest side by side | Stacked; leaderboard first | Side by side |
| Hero banner with illustration | Compact card, illustration hidden below 480px | Full banner |

**Bottom tabs by role.** Learner: Home · Events · Orgs · Leaderboard · Me. Officer adds a prominent
centre **Scan** action. Adviser: Approvals · Events · Analytics · Me.

**Non-negotiables at 360px.** Minimum 16px side gutters. Touch targets ≥44×44px. No horizontal page
scroll — tables and charts scroll inside their own containers. The scanner is reachable in one tap from
anywhere in the officer role.

---

## 8. Accessibility

Verified with the Playwright a11y tree, not by eye. See `hiraya-mobile-audit`.

- Body contrast ≥4.5:1; large text ≥3:1. `--ink-subtle` is 16px-and-above only.
- **`--primary` as *text* is for `--surface` (white) only.** It is 4.8:1 on white but **4.44:1 on
  `--canvas`** — a fail, not a near miss. Teal text on the canvas uses `--primary-ink` (8.5:1).
  Found by the P-06 audit on two back links that had been reviewed by eye and looked fine.
- Every interactive element ≥44×44px.
- Full keyboard operability; visible focus ring (2px `--primary`, 2px offset).
- Semantic landmarks; one `h1` per screen; correct heading order.
- Every control labelled — in **both** locales, since strings are translated.
- Never color alone: status carries an icon and a word.
- `prefers-reduced-motion` respected everywhere.
- Scanner feedback is **visual, textual, and audible**.
- Live regions announce XP changes and queue-count updates.

---

## 9. Level badges

Four tiers, Filipino titles per FR-5.4. Authored as layered SVG — medal disc, inner star, ribbon — so
each is a few hundred bytes and recolors from tokens.

| Level | Title | Meaning | Palette |
|---|---|---|---|
| 1 | **Kasapi** | Member — you have arrived | Teal `--primary` |
| 2 | **Lingkod** | Servant-helper — you contribute | Blue `--cat-academic` |
| 3 | **Tagapagtaguyod** | Champion-upholder — you sustain others | Purple `--cat-faith` |
| 4 | **Bayani** | Hero — you lead | Amber `--xp` + deep ribbon |

Progression runs cool → warm so advancement reads as warmth rather than mere saturation, and remains
distinguishable in greyscale and to colour-blind viewers. XP thresholds live in the `levels` table and are
tunable during the pilot — they are product parameters, not design constants.

---

## 10. Category colors in use

The six organization categories each own one color (§2), used on `CategoryTile`, the org avatar ring, and
the `EventCard` color bar.

| Category | Token |
|---|---|
| Academic | `--cat-academic` |
| Arts | `--cat-arts` |
| Sports | `--cat-sports` |
| Service | `--cat-service` |
| Faith-based | `--cat-faith` |
| Special interest | `--cat-interest` |

Identification only. Never used to rank, order, or grade.

---

## 11. Performance rules

The 500 KB budget is a design constraint, not an engineering afterthought.

1. **SVG for everything illustrative.** No raster badges, icons, or mascots.
2. **One hero illustration per app**, hidden below 480px.
3. Lucide icons, tree-shaken — never a whole icon font.
4. `next/font` self-hosting, subset to Latin.
5. No runtime CSS-in-JS.
6. Route-level code splitting; the scanner route is precached and must open in under 2 seconds.
7. Org logos and event photos: user-supplied, so served as AVIF/WebP through `next/image`, lazy, with
   explicit dimensions to avoid layout shift.
8. Every new screen passes `hiraya-mobile-audit` before it merges.

---

## 12. Related documents

`docs/ASSET_CHECKLIST.md` — what to produce · `docs/PRD.md` §6 — NFRs ·
`docs/SYSTEM_DESIGN.md` — components in context · `.claude/skills/hiraya-design-system/` — enforcement.
