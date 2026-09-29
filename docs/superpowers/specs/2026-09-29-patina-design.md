# patina — Design System Foundations

- **Date:** 2026-09-29
- **Status:** approved design, ready for implementation plan
- **Repo:** `~/code/patina` → `github.com/marcel-goldammer/patina`

## 1. Goal & scope

A single, uniform visual foundation for all **future** frontend apps (Angular, mobile-first PWAs, self-hosted). Existing apps (Breath, Schwerkraft) are **not** migrated.

**In scope (MVP — "Foundations"):**
- Design tokens (color, typography, spacing, radius, elevation, motion)
- Light + dark theme
- Base styles for native HTML elements
- Self-hosted fonts
- Static showcase page
- Automated WCAG contrast test

**Out of scope (later, only when a real app needs it):**
- Angular component library (then: Storybook for Angular)
- CSS component classes (`.btn`, `.card`, …)
- Icons (README recommends Lucide)
- z-index scale, data-viz palette
- Per-app accent override (conflicts with the uniformity goal)
- Style Dictionary / JSON token source (only when a second output format is needed)

**Success criterion:** a fresh Angular app with patina included renders correctly in both themes, and the contrast test passes.

## 2. Visual direction

"Technical with warm accents":
- Warm stone-gray neutrals (explicitly *not* cream paper, to avoid a Claude/Anthropic look)
- Muted ochre as the single accent
- Small radii (4–6 px)
- Monospace for numbers, labels and meta info
- Borders over shadows

**Typography:**
- **Figtree** — UI and running text
- **Maple Mono** — numbers, labels, meta, code; its handwritten italic for notes

**Status colors ("minimal" set):**
- Real signal hues only for success (green) and danger (red).
- Warning reuses the ochre family; info is neutral gray.
- **Rule:** status is never conveyed by color alone — always paired with an icon or text. This keeps warning distinguishable from the accent.

## 3. Repository & distribution

Plain CSS, **no build step**, versioned via git tags (semver).

```
patina/
├─ src/
│  ├─ tokens/
│  │  ├─ primitives.css   # raw values (internal)
│  │  └─ semantic.css     # meaning-based tokens, light + dark
│  ├─ base/
│  │  ├─ reset.css
│  │  └─ elements.css
│  ├─ fonts/              # vendored woff2, latin + latin-ext
│  ├─ fonts.css           # @font-face
│  ├─ tokens.css          # fonts + tokens only
│  └─ patina.css          # everything, fixed import order
├─ showcase/index.html
├─ test/contrast.test.mjs
├─ .github/workflows/     # test + GitHub Pages deploy of showcase
├─ README.md · CHANGELOG.md · LICENSE (+ OFL notice for fonts)
└─ package.json           # "name": "patina", "exports" → CSS files
```

**Consumption:**

```bash
npm i github:marcel-goldammer/patina#v0.1.0
```

```jsonc
// angular.json → styles (app styles last, may override tokens)
["node_modules/patina/src/patina.css", "src/styles.css"]
```

**Fonts are vendored** (not `@fontsource` dependencies):
- patina stays self-contained.
- `url()` paths don't cross `node_modules` boundaries.
- Trade-off: font updates are manual.

Vendored cuts:
- Figtree: 400, 500, 600, 700, 400-italic
- Maple Mono: 400, 500, 400-italic (only a `latin` subset exists upstream; it covers German umlauts)
- All with `font-display: swap`.

Both fonts are OFL-1.1.

## 4. Token architecture

**Two layers:**

| Layer | Example | Who uses it |
|---|---|---|
| Primitives | `--pt-stone-600`, `--pt-ochre-500` | patina internally only |
| Semantic | `--pt-color-surface`, `--pt-color-accent-text` | apps — **exclusively** |

**Prefix:** `--pt-`.

**Theme mechanism:**
- Each semantic color is declared **once** with CSS `light-dark(<light>, <dark>)`. The dark values are not duplicated into a second block.
- `:root { color-scheme: light dark }` follows the OS setting.
- `:root[data-theme="light"]` / `[data-theme="dark"]` force a theme by setting `color-scheme`.
- Native controls follow the theme automatically.
- Requires `light-dark()`: Baseline 2024 (Safari/iOS 17.5+, Chrome 123+, Firefox 120+). Acceptable for new apps from 2026 on.

**File placement:**
- `primitives.css` holds the color palettes only.
- All app-facing tokens live in `semantic.css`: colors, fonts, sizes, spacing, radius, shadow, motion.

**Cascade layers:**
- Base styles are wrapped in `@layer patina.reset` and `@layer patina.base`.
- Unlayered app CSS therefore always wins, regardless of specificity.
- Tokens stay unlayered.

### 4.1 Semantic colors — start values

These values come from the approved mockups. Where a mockup value failed WCAG in a pre-check, it is already adjusted and marked †. The contrast test (§6) is the final authority, and values may be tuned to pass it.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#eeece8` | `#131211` | page background |
| `surface` | `#f8f7f5` | `#1c1b19` | cards, inputs |
| `surface-sunken` | `#e0ddd7` | `#0e0d0c` | secondary buttons, wells |
| `border` | `#d6d2cb` | `#2c2a27` | decorative dividers (exempt from 3:1) |
| `border-strong` | `#87827a` † | `#6b665e` † | control boundaries (inputs) — ≥ 3:1 |
| `text` | `#1b1a18` | `#eeebe6` | body text |
| `text-muted` | `#6e6a63` | `#9d988f` | secondary text |
| `accent` | `#a07a38` † | `#cfa35a` | fills, progress bars (≥ 3:1 vs bg) |
| `accent-text` | `#7f5f24` † | `#ddb877` | links, accent text (≥ 4.5:1) |
| `accent-subtle` | `#efe3cb` | `#332a18` | chip / highlight background |
| `primary-bg` | `#1b1a18` | `#cfa35a` | primary button fill |
| `primary-fg` | `#d9ac5c` | `#131211` | primary button text |
| `on-danger` | `#f8f7f5` | `#131211` | text on danger button |
| `success` / `-subtle` | `#426b3f` † / `#dfe8da` | `#8fbf86` / `#1d2a1b` | |
| `danger` / `-subtle` | `#a83a3a` / `#f1d6d3` | `#e07a74` / `#361a18` | |
| `warning` / `-subtle` | `#7d5a17` / `#efe3cb` | `#ddb877` / `#332a18` | ochre family, icon/text mandatory |
| `info` / `-subtle` | `#57534d` / `#e2dfd9` | `#b8b3aa` / `#26241f` | neutral |
| `focus` | `#7f5f24` | `#ddb877` | focus ring |
| `shadow` | `#1b1a1826` | `#00000066` | shadow color (not contrast-tested) |

Pre-check findings that led to the † adjustments:
- Light `accent-text` (`#8c6a2c`: 4.22) failed AA.
- Light `accent` as a UI graphic (`#b38a45`: 2.68) failed 3:1.
- Light `success` on subtle (`#4e7a4a`: 3.97) failed AA.
- `border` in both themes was ~1.3:1. Hence the split into decorative `border` and `border-strong` for control boundaries.

### 4.2 Other scales

- **Fonts:** `--pt-font-sans` (Figtree, system fallback), `--pt-font-mono` (Maple Mono, `ui-monospace` fallback)
- **Font size:** `xs` 12 · `sm` 14 · `md` 16 · `lg` 20 · `xl` 28 · `2xl` 36 px (in rem)
- **Font weight:** 400 · 500 · 600 · 700
- **Line height:** `tight` 1.15 · `snug` 1.3 · `normal` 1.55
- **Spacing:** `--pt-space-1…8` = 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px (in rem)
- **Radius:** `sm` 4 px (inputs, chips) · `md` 6 px (buttons, cards) · `lg` 12 px (sheets, dialogs) · `full`
- **Elevation:** borders by default; `--pt-shadow-1` (menus/popovers) and `--pt-shadow-2` (dialogs) only
- **Motion:** `--pt-duration-fast` 120 ms · `--pt-duration-base` 200 ms · `--pt-ease` standard curve. Under `prefers-reduced-motion: reduce`, durations are ~0.
- **Breakpoints:** not tokenizable (custom properties don't work in media queries). Documented convention: 640 / 1024 px.

## 5. Base styles

Native elements only:
- `body`: font, colors, 16 px, `line-height: normal`
- Text elements: `h1`–`h3`, `p`, `a` (underline with offset), `strong`/`em`, `small`, `hr`, lists
- `code`, `kbd`, `pre`: Maple Mono
- `table`: borders, no zebra stripes
- `button`: neutral/secondary by default. Variants via `data-variant="primary" | "danger"`. Plus `:disabled`.
- Form controls: `input`, `select`, `textarea`, `label`, `fieldset`
  - Checkbox/radio via `accent-color`
  - Invalid state via `[aria-invalid="true"]` (danger border)
- Global `:focus-visible` ring; `::selection`

**Typography helpers** — the only classes, because they can't be expressed natively:

| Class | Effect |
|---|---|
| `.pt-num` | Maple Mono + `tabular-nums` |
| `.pt-label` | Maple Mono, uppercase, letter-spacing, `text-muted` |
| `.pt-note` | Maple Mono italic, accent left border |

## 6. Quality assurance

**Contrast test (`npm test`)**
- Zero dependencies, uses `node:test`. Written TDD-first.
- Parses `semantic.css`, resolves `var(--pt-…)` references to primitives, and checks a fixed list of pairs for **both** themes:
  - Text pairs ≥ 4.5:1 — e.g. `text`/`bg`, `text`/`surface`, `text-muted`/`bg`, `text-muted`/`surface`, `accent-text`/`bg`, `accent-text`/`surface`, `primary-fg`/`primary-bg`, `on-danger`/`danger`, `accent-text`/`accent-subtle`, `text`/`surface-sunken`, each status on its `-subtle` and on `surface`
  - UI pairs ≥ 3:1 — e.g. `accent`/`bg`, `border-strong`/`bg`, `border-strong`/`surface`, `focus`/`bg`
- A failing pair fails the build.

**a11y (axe)**
- Run manually via the browser extension on the showcase.
- Deliberately no Puppeteer toolchain.

**CI (GitHub Actions)**
- Every push runs `npm test`.
- `main` deploys `showcase/` to GitHub Pages, so it can be checked on the iPhone.

**Showcase**
- A single static HTML page with a theme toggle.
- Shows every token (swatches, scales) and every styled element.
- Serves as living documentation and as the visual test.

## 7. Versioning & rollout

- Stay on `0.x` until the first real app consumes patina; then tag `1.0.0`.
- Every tag gets a CHANGELOG entry.
- Breaking = renaming or removing a semantic token, or changing base-style behavior.
- The next new app is the first consumer and the real-world validation.
- Vault: project note `Dev/Patina/Patina.md`, linked from `Dev.md`.
