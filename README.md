# patina

Design system foundations for my frontend apps: tokens, light/dark themes, self-hosted fonts and base styles for native HTML elements — plain CSS, no build step.

Technical with warm accents: warm stone grays, muted ochre, Figtree + Maple Mono.

## Install

```bash
npm i github:marcel-goldammer/patina#v0.1.0
```

Angular (`angular.json` → `projects.<app>.architect.build.options.styles`):

```json
["node_modules/patina/src/patina.css", "src/styles.css"]
```

Only tokens + fonts, no element styles: use `node_modules/patina/src/tokens.css` instead.

Set the document language so hyphenation works: `<html lang="de">`.

## Rules

- **Use semantic tokens only** (`--pt-color-*`, `--pt-space-*`, …). Primitives (`--pt-stone-*`, `--pt-ochre-*`, `--pt-green-*`, `--pt-red-*`) are internal and may change without notice.
- **Never convey status by color alone** — always pair it with an icon or text. Warning shares the ochre family with the accent on purpose.
- App CSS overrides patina automatically: base styles live in `@layer patina.reset` / `patina.base`, and unlayered CSS always wins.

## Theming

Follows the OS by default. Force a theme:

```js
document.documentElement.dataset.theme = 'dark'; // 'light' | 'dark'; delete for auto
```

## Tokens

| Group | Tokens |
|---|---|
| Surfaces | `color-bg`, `color-surface`, `color-surface-sunken`, `color-border`, `color-border-strong` |
| Text | `color-text`, `color-text-muted` |
| Accent | `color-accent` (fills), `color-accent-text` (links/text), `color-accent-subtle` (backgrounds) |
| Primary button | `color-primary-bg`, `color-primary-fg` |
| Status | `color-{success,danger,warning,info}` + `-subtle`, `color-on-danger` |
| Other | `color-focus`, `color-shadow` |
| Type | `font-sans`, `font-mono`, `font-size-{xs,sm,md,lg,xl,2xl}`, `font-weight-{regular,medium,semibold,bold}`, `line-height-{tight,snug,normal}` |
| Layout | `space-1…8` (4–64 px), `radius-{sm,md,lg,full}`, `shadow-{1,2}` |
| Motion | `duration-{fast,base}`, `ease` (zeroed under reduced motion) |

All prefixed `--pt-`. Full visual reference: `showcase/index.html`.

## Elements & helpers

- `button` is neutral by default; use `data-variant="primary"` or `data-variant="danger"` for the variants.
- Invalid fields: `aria-invalid="true"`.
- Helper classes:
  - `.pt-num`: mono, tabular numbers
  - `.pt-label`: mono, uppercase label
  - `.pt-note`: handwritten mono italic

Breakpoints (convention, not tokens): 640 px / 1024 px.

Icons are not included — recommended: [Lucide](https://lucide.dev) (rounded strokes match the fonts).

## Browser support

Requires `light-dark()`, `color-mix()`, `@layer`, `:has()` — Safari/iOS 17.5+, Chrome 123+, Firefox 120+.

## Development

```bash
npm test               # contrast + integrity tests (no dependencies)
npm run showcase       # http://localhost:8080/showcase/
./scripts/fetch-fonts.sh  # re-download vendored fonts
```

Versioning: semver git tags; `0.x` until the first real app uses patina. Breaking = renaming/removing a semantic token or changing base-style behavior.
