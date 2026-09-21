# `src/design`

The design system in code. `docs/DESIGN_SYSTEM.md` is the specification; this
directory is its implementation, and where the two disagree the document wins.

```
tokens.css         colour, type scale, shape, elevation, motion — and the Tailwind
                   utilities generated from them
font.ts            Plus Jakarta Sans, self-hosted by next/font
register.ts        the learner / staff register (D12), applied as a data attribute
cn.ts              class joiner
primitives/        the §6 primitive inventory
```

## Working rules

- **No literal colour in a component.** Reach a colour by its token utility
  (`bg-surface`, `text-ink-muted`). A hex value in a `.tsx` file is a review
  failure, because it escapes both theming and the contrast guarantees.
- **`text-ink-subtle` has no correct use yet.** It is 4.0:1, permitted only at
  16px and above, and no style in the §3 type scale is both secondary and that
  large — so every use of it in this codebase was a contrast failure, and the
  first mobile audit found all four. Use `text-ink-muted` (5.9:1). The token
  stays defined because DESIGN_SYSTEM.md §2 defines it.
- **Type comes from one utility.** `type-h2`, `type-body`, `type-label` — each
  carries size, line height, weight and tracking together, so a heading cannot
  drift by being assembled from three half-remembered utilities.
- **Every string arrives translated.** Primitives take `label`, `title` and
  `message` as props that the caller has already run through `next-intl`. The two
  exceptions are the modal close button and the toast dismiss button, which read
  `common.*` themselves because no caller should have to pass them.
- **Never meaning by colour alone.** `Badge` attaches an icon per tone by default
  for this reason; `ProgressBar` renders its value as text.
- **44px touch targets.** The `touch-target` utility, or `min-h-11` where the
  width is naturally full.
- **`className` appends, it does not override.** There is no `tailwind-merge`
  here, so anything meant to be changed is a variant prop. Use `className` for
  layout: margin, width, grid placement.

`/design` renders every primitive at once. It is the surface
`hiraya-mobile-audit` runs against, and the fastest way to see whether something
already exists before building it again.
