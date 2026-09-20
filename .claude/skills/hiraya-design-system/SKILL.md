---
name: hiraya-design-system
description: Keep Hiraya's UI consistent with its design tokens, its dual visual register (playful for learners, calm for advisers and admins), and its 500 KB SVG-first asset budget. Use when creating any new screen, component, or asset.
---

# Hiraya design system

One visual language, two registers, one hard performance budget. Full reference in
`docs/DESIGN_SYSTEM.md`.

## When to use

Creating any new screen or component; adding any asset; changing colors, type, spacing, or imagery.

## Inputs required

- The surface being built and **which register it belongs to**
- `docs/DESIGN_SYSTEM.md` for tokens and component inventory
- `docs/ASSET_CHECKLIST.md` if a new asset is involved

## Workflow

### 1. Decide the register first

| Register | Who | Feel |
|---|---|---|
| **Learner** | Learner, Org Officer as a participant | Playful. Medals, category color, podium, XP animation, illustration |
| **Adviser / admin** | Org Adviser, School Admin, guidance, school head | Calm. Tables, counts, muted accents. **No medals, no mascots, no celebration** |

Same tokens, same type scale, same radii and spacing in both. Only the mood differs.

**Why it matters.** Advisers decide whether this platform survives, and they judge it on whether it saves
them paperwork. A dashboard that greets a teacher with confetti reads as a student toy and loses the
adoption argument before a single feature is evaluated.

### 2. Tokens only

- Use CSS variables from `src/design/tokens.css`. **Never a literal hex value in a component**
- `--xp` amber is decorative only; amber-toned *text* uses `--xp-ink`
- `--ink-subtle` at 16px and above only — it fails AA for body copy
- Category colors identify, never rank

### 3. Reuse before creating

Check `src/design/` for an existing primitive. A near-duplicate component is how a design system dies —
if an existing one is close, extend it rather than forking it.

### 4. Assets: SVG first

- Custom art is **hand-authored SVG**, recoloring from tokens
- Icons from Lucide, tree-shaken
- Raster is permitted only for PWA manifest icons, the Apple touch icon, the OG share image, and
  user-uploaded photos
- A new authored asset must be added to `docs/ASSET_CHECKLIST.md` in the same change

### 5. Mobile first

Design at 360px, then widen. Not the reverse. See `docs/DESIGN_SYSTEM.md` §7 for how the reference's
three-column layout translates: sidebar → bottom tabs, right rail → a Notifications tab, stat cards →
horizontal snap-scroll.

### 6. Strings

Every user-facing string through `next-intl`. Add the `en` key in the same change. Leave a `fil`
placeholder — the Filipino locale is Phase 2, authored ideally by SSLG officers.

## Outputs

A component consistent with the design system, or an explicit list of deviations with reasons.

## Hard rejections

Reject these outright rather than negotiating:

| Rejected | Why |
|---|---|
| **Any daily-streak or login-streak UI** | FR-5.10 bans it — streaks drive anxiety-driven use and waste prepaid mobile data |
| Raster art where SVG would work | Breaks the 500 KB budget the product depends on |
| A literal hex value in a component | Breaks theming and the contrast guarantees |
| `--ink-subtle` on body text | Fails WCAG AA |
| Meaning carried by color alone | Fails WCAG AA and fails colour-blind officers at the gate |
| A bare string literal in JSX | Makes the Filipino locale a retrofit, and retrofits do not happen |
| Medals, mascots, or celebration on an adviser surface | Wrong register — see step 1 |
| A "duel", "friend", or "challenge" feature | Borrowed from the reference; out of scope and an unnecessary child-safety surface |

## Validation

- [ ] Register identified and consistently applied
- [ ] Tokens only — no literal colors
- [ ] Contrast checked against the token table
- [ ] Reuses an existing primitive, or justifies a new one
- [ ] New assets are SVG and listed in `docs/ASSET_CHECKLIST.md`
- [ ] Works at 360px with ≥16px gutters and no horizontal page scroll
- [ ] Touch targets ≥44×44px
- [ ] All strings via `next-intl`
- [ ] Hand off to `hiraya-mobile-audit` before merge
