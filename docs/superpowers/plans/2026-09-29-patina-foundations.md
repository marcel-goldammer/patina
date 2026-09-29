# patina Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build patina v0.1.0 — plain-CSS design-system foundations: tokens, light/dark theming, vendored fonts, base styles, a showcase page, and an automated WCAG contrast test.

**Architecture:**
- Plain CSS files, no build step. Primitives are color palettes only. Semantic tokens use `light-dark()`, so each color is declared once.
- Base styles live in cascade layers, so unlayered app CSS always wins.
- A zero-dependency Node test suite (`node:test`) parses the CSS and checks:
  - WCAG contrast
  - token completeness
  - file integrity
  - package contents

**Tech Stack:** CSS (custom properties, `light-dark()`, `@layer`, `color-mix()`), Node 24 `node:test`, GitHub Actions + Pages, Angular 21 (smoke test only).

**Spec:** `docs/superpowers/specs/2026-09-29-patina-design.md`

## Global Constraints

- Repo root: `~/code/patina` (already `git init`-ed on `main`; spec committed). **Do not push** — Marcel decides about GitHub.
- Token prefix `--pt-`. Apps use **semantic tokens only**; primitives (`--pt-stone-*`, `--pt-ochre-*`, `--pt-green-*`, `--pt-red-*`) are internal.
- Plain CSS, no build step, **no runtime or dev dependencies** in `package.json`.
- Fonts: Figtree 400/500/600/700 + 400-italic (latin + latin-ext); Maple Mono 400/500 + 400-italic (latin). Source: `@fontsource/figtree@5.3.0`, `@fontsource/maple-mono@5.3.0`. `font-display: swap`.
- WCAG AA: text pairs ≥ 4.5:1, UI pairs ≥ 3:1 — in **both** themes.
- Status is never conveyed by color alone (documented rule; README).
- Commits: conventional, small, English. **No Claude attribution / Co-Authored-By lines** (Marcel's rule overrides the harness default).
- Filenames English. Chat with Marcel German.

## Review Focus

1. **Long German compound words** (e.g. "Benachrichtigungseinstellungen") in `h1` on a 320 px viewport must wrap or hyphenate, never cause horizontal scroll.
   - Guarded by: integrity test (Task 4); manual check (Task 5).
2. **iOS Safari zooms into inputs with font-size < 16 px.**
   - Inputs must use `--pt-font-size-md` = `1rem`.
   - Guarded by: integrity test (Task 4).
3. **Git-dependency install ships incomplete files.** `npm i github:…` packs the repo, so if `files` misses the fonts, apps get 404 fonts.
   - Guarded by: `npm pack --dry-run` test (Task 4); Angular smoke test (Task 7).
4. **App overrides losing against patina specificity.** An app's plain `button { … }` must beat `button[data-variant="primary"]`.
   - Guarded by: layer-structure test (Task 4); smoke-test override check (Task 7).
5. **Forced theme opposite to OS** (`data-theme="light"` while OS is dark, and vice versa) must fully switch every token.
   - Guarded by: test asserting both `color-scheme` overrides exist (Task 2); showcase toggle check (Task 5).

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | metadata, `files`, `exports`, scripts (no deps) |
| `.gitignore` | ignore `node_modules`, `_site`, `.DS_Store` |
| `src/tokens/primitives.css` | raw color palettes |
| `src/tokens/semantic.css` | all app-facing tokens + theme switching |
| `src/fonts/*.woff2`, `src/fonts/OFL-*.txt` | vendored fonts + licenses |
| `src/fonts.css` | `@font-face` rules |
| `src/base/reset.css` | minimal reset in `@layer patina.reset` |
| `src/base/elements.css` | native element styles + 3 helpers in `@layer patina.base` |
| `src/tokens.css` | entry: fonts + tokens |
| `src/patina.css` | entry: everything, layer order declared first |
| `scripts/fetch-fonts.sh` | reproducible font download |
| `test/lib/tokens.mjs` | CSS token parser + WCAG contrast math |
| `test/tokens.test.mjs` | unit tests for the parser |
| `test/contrast.test.mjs` | token completeness + contrast pairs, both themes |
| `test/integrity.test.mjs` | imports/urls exist, layer rules, var usage, package contents |
| `showcase/index.html` | living docs + visual test |
| `README.md`, `CHANGELOG.md`, `LICENSE` | docs |
| `.github/workflows/ci.yml` | test + GitHub Pages deploy |

---

### Task 1: Scaffold + token parser

**Files:**
- Create: `package.json`, `.gitignore`, `test/lib/tokens.mjs`
- Test: `test/tokens.test.mjs`

**Interfaces:**
- Produces (`test/lib/tokens.mjs`):
  - `parsePrimitives(css: string): Map<string, string>` — maps `--pt-<palette>-<n>` to lowercase `#rrggbb`
  - `parseSemanticColors(css: string, primitives: Map): { light: Map<string,string>, dark: Map<string,string> }` — only `--pt-color-*` declared with `light-dark(a, b)`. Each of `a`, `b` is `var(--pt-…)` or a hex. Throws `Error("Unresolved reference <name> in <token>")`.
  - `definedTokens(css: string): Set<string>` — every `--pt-*` that is declared
  - `usedTokens(css: string): Set<string>` — every `--pt-*` referenced via `var()`
  - `contrast(a: string, b: string): number` — WCAG ratio; throws on non-`#rrggbb`

- [ ] **Step 1: Create `package.json` and `.gitignore`**

```json
{
  "name": "patina",
  "version": "0.1.0",
  "private": true,
  "description": "Design system foundations: tokens, themes and base styles as plain CSS.",
  "license": "MIT",
  "type": "module",
  "files": ["src"],
  "exports": {
    "./patina.css": "./src/patina.css",
    "./tokens.css": "./src/tokens.css"
  },
  "scripts": {
    "test": "node --test \"test/*.test.mjs\"",
    "showcase": "python3 -m http.server 8080"
  }
}
```

`.gitignore`:
```
node_modules/
_site/
.DS_Store
```

- [ ] **Step 2: Write the failing parser tests** — `test/tokens.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePrimitives,
  parseSemanticColors,
  definedTokens,
  usedTokens,
  contrast,
} from './lib/tokens.mjs';

test('parsePrimitives maps names to lowercase hex', () => {
  const map = parsePrimitives(':root { --pt-stone-100: #EEECE8; --pt-ochre-500: #cfa35a; }');
  assert.equal(map.get('--pt-stone-100'), '#eeece8');
  assert.equal(map.get('--pt-ochre-500'), '#cfa35a');
  assert.equal(map.size, 2);
});

test('parseSemanticColors resolves var() and hex for both themes', () => {
  const primitives = new Map([['--pt-stone-100', '#eeece8'], ['--pt-stone-950', '#131211']]);
  const css = `:root {
    --pt-color-bg: light-dark(var(--pt-stone-100), var(--pt-stone-950));
    --pt-color-shadow: light-dark(#1b1a1826, #00000066);
  }`;
  const { light, dark } = parseSemanticColors(css, primitives);
  assert.equal(light.get('--pt-color-bg'), '#eeece8');
  assert.equal(dark.get('--pt-color-bg'), '#131211');
  assert.equal(light.get('--pt-color-shadow'), '#1b1a1826');
});

test('parseSemanticColors throws on unknown primitive', () => {
  const css = ':root { --pt-color-bg: light-dark(var(--pt-stone-999), #000000); }';
  assert.throws(() => parseSemanticColors(css, new Map()), /Unresolved reference --pt-stone-999 in --pt-color-bg/);
});

test('definedTokens and usedTokens', () => {
  const css = ':root { --pt-space-1: 4px; } a { padding: var(--pt-space-1) var(--pt-space-9); }';
  assert.deepEqual([...definedTokens(css)], ['--pt-space-1']);
  assert.deepEqual([...usedTokens(css)].sort(), ['--pt-space-1', '--pt-space-9']);
});

test('contrast matches WCAG reference values', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#777777', '#777777'), 1);
  assert.equal(contrast('#ffffff', '#000000'), contrast('#000000', '#ffffff'));
  assert.ok(Math.abs(contrast('#767676', '#ffffff') - 4.54) < 0.01);
});

test('contrast rejects non-#rrggbb input', () => {
  assert.throws(() => contrast('#1b1a1826', '#ffffff'), /Expected #rrggbb/);
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../test/lib/tokens.mjs'`

- [ ] **Step 4: Implement** — `test/lib/tokens.mjs`

```js
// Minimal CSS token parser + WCAG contrast math. Zero dependencies.

const REF = String.raw`(?:var\(--pt-[a-z0-9-]+\)|#[0-9a-fA-F]{6,8})`;

export function parsePrimitives(css) {
  const map = new Map();
  for (const [, name, value] of css.matchAll(/(--pt-[a-z]+-\d+)\s*:\s*(#[0-9a-fA-F]{6,8})\s*;/g)) {
    map.set(name, value.toLowerCase());
  }
  return map;
}

export function parseSemanticColors(css, primitives) {
  const light = new Map();
  const dark = new Map();
  const re = new RegExp(
    String.raw`(--pt-color-[a-z0-9-]+)\s*:\s*light-dark\(\s*(${REF})\s*,\s*(${REF})\s*\)\s*;`,
    'g',
  );
  for (const [, name, l, d] of css.matchAll(re)) {
    light.set(name, resolve(l, name, primitives));
    dark.set(name, resolve(d, name, primitives));
  }
  return { light, dark };
}

function resolve(ref, name, primitives) {
  if (ref.startsWith('#')) return ref.toLowerCase();
  const key = ref.slice(4, -1);
  const value = primitives.get(key);
  if (!value) throw new Error(`Unresolved reference ${key} in ${name}`);
  return value;
}

export function definedTokens(css) {
  return new Set([...css.matchAll(/(--pt-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
}

export function usedTokens(css) {
  return new Set([...css.matchAll(/var\(\s*(--pt-[a-z0-9-]+)/g)].map((m) => m[1]));
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function luminance(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Expected #rrggbb, got ${hex}`);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test`
Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore test/
git commit -m "test: add token parser and contrast math"
```

---

### Task 2: Tokens + contrast test

**Files:**
- Create: `src/tokens/primitives.css`, `src/tokens/semantic.css`
- Test: `test/contrast.test.mjs`

**Interfaces:**
- Consumes: `parsePrimitives`, `parseSemanticColors`, `contrast` from Task 1
- Produces: the semantic token names that every later task uses:
  - colors: `--pt-color-{bg, surface, surface-sunken, border, border-strong, text, text-muted, accent, accent-text, accent-subtle, primary-bg, primary-fg, on-danger, success, success-subtle, danger, danger-subtle, warning, warning-subtle, info, info-subtle, focus, shadow}`
  - fonts and type: `--pt-font-{sans, mono}`, `--pt-font-size-{xs, sm, md, lg, xl, 2xl}`, `--pt-font-weight-{regular, medium, semibold, bold}`, `--pt-line-height-{tight, snug, normal}`
  - spacing and shape: `--pt-space-{1..8}`, `--pt-radius-{sm, md, lg, full}`, `--pt-shadow-{1, 2}`
  - motion: `--pt-duration-{fast, base}`, `--pt-ease`

- [ ] **Step 1: Write the failing test** — `test/contrast.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePrimitives, parseSemanticColors, contrast } from './lib/tokens.mjs';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const semanticCss = read('tokens/semantic.css');
const primitives = parsePrimitives(read('tokens/primitives.css'));
const themes = parseSemanticColors(semanticCss, primitives);

const EXPECTED = [
  'bg', 'surface', 'surface-sunken', 'border', 'border-strong', 'text', 'text-muted',
  'accent', 'accent-text', 'accent-subtle', 'primary-bg', 'primary-fg', 'on-danger',
  'success', 'success-subtle', 'danger', 'danger-subtle', 'warning', 'warning-subtle',
  'info', 'info-subtle', 'focus', 'shadow',
];

// [foreground, background] — WCAG AA text: 4.5:1
const TEXT_PAIRS = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'surface-sunken'],
  ['text-muted', 'bg'], ['text-muted', 'surface'],
  ['accent-text', 'bg'], ['accent-text', 'surface'], ['accent-text', 'accent-subtle'],
  ['primary-fg', 'primary-bg'], ['on-danger', 'danger'],
  ['success', 'success-subtle'], ['success', 'surface'],
  ['danger', 'danger-subtle'], ['danger', 'surface'],
  ['warning', 'warning-subtle'], ['warning', 'surface'],
  ['info', 'info-subtle'], ['info', 'surface'],
];

// WCAG AA non-text UI: 3:1
const UI_PAIRS = [
  ['accent', 'bg'], ['accent', 'surface'],
  ['border-strong', 'bg'], ['border-strong', 'surface'],
  ['focus', 'bg'], ['focus', 'surface'],
];

function check(colors, fg, bg, min) {
  const a = colors.get(`--pt-color-${fg}`);
  const b = colors.get(`--pt-color-${bg}`);
  assert.ok(a && b, `missing --pt-color-${fg} or --pt-color-${bg}`);
  const ratio = contrast(a, b);
  assert.ok(ratio >= min, `${fg} ${a} on ${bg} ${b}: ${ratio.toFixed(2)} < ${min}`);
}

for (const [theme, colors] of Object.entries(themes)) {
  test(`${theme}: every semantic color is defined`, () => {
    const missing = EXPECTED.filter((n) => !colors.has(`--pt-color-${n}`));
    assert.deepEqual(missing, []);
  });
  for (const [fg, bg] of TEXT_PAIRS) {
    test(`${theme}: ${fg} on ${bg} >= 4.5`, () => check(colors, fg, bg, 4.5));
  }
  for (const [fg, bg] of UI_PAIRS) {
    test(`${theme}: ${fg} on ${bg} >= 3`, () => check(colors, fg, bg, 3));
  }
}

test('forced themes override color-scheme in both directions', () => {
  assert.match(semanticCss, /:root\[data-theme="light"\]\s*\{\s*color-scheme:\s*light;\s*\}/);
  assert.match(semanticCss, /:root\[data-theme="dark"\]\s*\{\s*color-scheme:\s*dark;\s*\}/);
});

test('md font size is 1rem (prevents iOS input zoom)', () => {
  assert.match(semanticCss, /--pt-font-size-md:\s*1rem;/);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `ENOENT: no such file or directory ... src/tokens/semantic.css`

- [ ] **Step 3: Implement** `src/tokens/primitives.css`

```css
/* patina — primitive color palettes.
   Internal: apps must use the semantic tokens in semantic.css. */
:root {
  --pt-stone-50: #f8f7f5;
  --pt-stone-100: #eeece8;
  --pt-stone-200: #e0ddd7;
  --pt-stone-300: #d6d2cb;
  --pt-stone-400: #b8b3aa;
  --pt-stone-450: #9d988f;
  --pt-stone-500: #87827a;
  --pt-stone-600: #6e6a63;
  --pt-stone-700: #57534d;
  --pt-stone-800: #2c2a27;
  --pt-stone-850: #26241f;
  --pt-stone-900: #1b1a18;
  --pt-stone-950: #131211;
  --pt-stone-975: #0e0d0c;

  --pt-ochre-100: #efe3cb;
  --pt-ochre-300: #ddb877;
  --pt-ochre-400: #d9ac5c;
  --pt-ochre-500: #cfa35a;
  --pt-ochre-600: #a07a38;
  --pt-ochre-700: #7f5f24;
  --pt-ochre-900: #332a18;

  --pt-green-100: #dfe8da;
  --pt-green-300: #8fbf86;
  --pt-green-700: #426b3f;
  --pt-green-900: #1d2a1b;

  --pt-red-100: #f1d6d3;
  --pt-red-300: #e07a74;
  --pt-red-700: #a83a3a;
  --pt-red-900: #361a18;
}
```

- [ ] **Step 4: Implement** `src/tokens/semantic.css`

```css
/* patina — semantic tokens. The only token layer apps may use.
   Colors: light-dark(<light>, <dark>), resolved via color-scheme. */
:root {
  color-scheme: light dark;

  --pt-color-bg: light-dark(var(--pt-stone-100), var(--pt-stone-950));
  --pt-color-surface: light-dark(var(--pt-stone-50), var(--pt-stone-900));
  --pt-color-surface-sunken: light-dark(var(--pt-stone-200), var(--pt-stone-975));
  --pt-color-border: light-dark(var(--pt-stone-300), var(--pt-stone-800));
  --pt-color-border-strong: light-dark(var(--pt-stone-500), var(--pt-stone-600));
  --pt-color-text: light-dark(var(--pt-stone-900), var(--pt-stone-100));
  --pt-color-text-muted: light-dark(var(--pt-stone-600), var(--pt-stone-450));

  --pt-color-accent: light-dark(var(--pt-ochre-600), var(--pt-ochre-500));
  --pt-color-accent-text: light-dark(var(--pt-ochre-700), var(--pt-ochre-300));
  --pt-color-accent-subtle: light-dark(var(--pt-ochre-100), var(--pt-ochre-900));
  --pt-color-primary-bg: light-dark(var(--pt-stone-900), var(--pt-ochre-500));
  --pt-color-primary-fg: light-dark(var(--pt-ochre-400), var(--pt-stone-950));
  --pt-color-on-danger: light-dark(var(--pt-stone-50), var(--pt-stone-950));

  --pt-color-success: light-dark(var(--pt-green-700), var(--pt-green-300));
  --pt-color-success-subtle: light-dark(var(--pt-green-100), var(--pt-green-900));
  --pt-color-danger: light-dark(var(--pt-red-700), var(--pt-red-300));
  --pt-color-danger-subtle: light-dark(var(--pt-red-100), var(--pt-red-900));
  --pt-color-warning: light-dark(var(--pt-ochre-700), var(--pt-ochre-300));
  --pt-color-warning-subtle: light-dark(var(--pt-ochre-100), var(--pt-ochre-900));
  --pt-color-info: light-dark(var(--pt-stone-700), var(--pt-stone-400));
  --pt-color-info-subtle: light-dark(var(--pt-stone-200), var(--pt-stone-850));

  --pt-color-focus: light-dark(var(--pt-ochre-700), var(--pt-ochre-300));
  --pt-color-shadow: light-dark(#1b1a1826, #00000066);

  --pt-font-sans: "Figtree", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --pt-font-mono: "Maple Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  --pt-font-size-xs: 0.75rem;
  --pt-font-size-sm: 0.875rem;
  --pt-font-size-md: 1rem;
  --pt-font-size-lg: 1.25rem;
  --pt-font-size-xl: 1.75rem;
  --pt-font-size-2xl: 2.25rem;

  --pt-font-weight-regular: 400;
  --pt-font-weight-medium: 500;
  --pt-font-weight-semibold: 600;
  --pt-font-weight-bold: 700;

  --pt-line-height-tight: 1.15;
  --pt-line-height-snug: 1.3;
  --pt-line-height-normal: 1.55;

  --pt-space-1: 0.25rem;
  --pt-space-2: 0.5rem;
  --pt-space-3: 0.75rem;
  --pt-space-4: 1rem;
  --pt-space-5: 1.5rem;
  --pt-space-6: 2rem;
  --pt-space-7: 3rem;
  --pt-space-8: 4rem;

  --pt-radius-sm: 4px;
  --pt-radius-md: 6px;
  --pt-radius-lg: 12px;
  --pt-radius-full: 9999px;

  --pt-shadow-1: 0 2px 8px var(--pt-color-shadow);
  --pt-shadow-2: 0 8px 32px var(--pt-color-shadow);

  --pt-duration-fast: 120ms;
  --pt-duration-base: 200ms;
  --pt-ease: cubic-bezier(0.2, 0, 0, 1);
}

:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"] { color-scheme: dark; }

@media (prefers-reduced-motion: reduce) {
  :root {
    --pt-duration-fast: 0ms;
    --pt-duration-base: 0ms;
  }
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test`
Expected: all PASS (2 × 25 theme tests + 2 + Task 1's 6). If a contrast pair fails, adjust the **primitive** value minimally and note the change in the commit body — never lower the threshold.

- [ ] **Step 6: Commit**

```bash
git add src/tokens test/contrast.test.mjs
git commit -m "feat: add primitive and semantic tokens with contrast test"
```

---

### Task 3: Vendored fonts

**Files:**
- Create: `scripts/fetch-fonts.sh`, `src/fonts/` (13 woff2 + 2 license txt), `src/fonts.css`
- Test: `test/integrity.test.mjs`

**Interfaces:**
- Produces: `font-family: "Figtree"` and `"Maple Mono"`, referenced by `--pt-font-sans` / `--pt-font-mono` (Task 2)
- Produces: `test/integrity.test.mjs`. Task 4 extends it with a `src()` helper and a `urls()` helper.

- [ ] **Step 1: Write the failing test** — `test/integrity.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => resolve(root, 'src', p);
const read = (p) => readFileSync(src(p), 'utf8');
const urls = (css) => [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]);

test('fonts.css: every url() points to an existing file', () => {
  const found = urls(read('fonts.css'));
  assert.equal(found.length, 13);
  const missing = found.filter((u) => !existsSync(resolve(src('.'), u)));
  assert.deepEqual(missing, []);
});

test('font licenses are vendored', () => {
  assert.ok(existsSync(src('fonts/OFL-figtree.txt')));
  assert.ok(existsSync(src('fonts/OFL-maple-mono.txt')));
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `ENOENT ... src/fonts.css`

- [ ] **Step 3: Create** `scripts/fetch-fonts.sh`, then run it

```bash
#!/usr/bin/env bash
# Downloads the vendored font files from @fontsource (pinned versions).
set -euo pipefail
cd "$(dirname "$0")/../src/fonts"

FIGTREE=https://cdn.jsdelivr.net/npm/@fontsource/figtree@5.3.0
MAPLE=https://cdn.jsdelivr.net/npm/@fontsource/maple-mono@5.3.0

for subset in latin latin-ext; do
  for w in 400-normal 500-normal 600-normal 700-normal 400-italic; do
    curl -fsSLO "$FIGTREE/files/figtree-$subset-$w.woff2"
  done
done
for w in 400-normal 500-normal 400-italic; do
  curl -fsSLO "$MAPLE/files/maple-mono-latin-$w.woff2"
done

curl -fsSL "$FIGTREE/LICENSE" -o OFL-figtree.txt
curl -fsSL "$MAPLE/LICENSE" -o OFL-maple-mono.txt
```

Run:
```bash
mkdir -p src/fonts && chmod +x scripts/fetch-fonts.sh && ./scripts/fetch-fonts.sh && ls src/fonts | wc -l
```
Expected: `15`

- [ ] **Step 4: Create** `src/fonts.css`

```css
/* patina — self-hosted fonts (SIL OFL 1.1, see fonts/OFL-*.txt). */

/* Figtree — latin */
@font-face { font-family: "Figtree"; font-style: normal; font-weight: 400; font-display: swap; src: url("./fonts/figtree-latin-400-normal.woff2") format("woff2"); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family: "Figtree"; font-style: normal; font-weight: 500; font-display: swap; src: url("./fonts/figtree-latin-500-normal.woff2") format("woff2"); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family: "Figtree"; font-style: normal; font-weight: 600; font-display: swap; src: url("./fonts/figtree-latin-600-normal.woff2") format("woff2"); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family: "Figtree"; font-style: normal; font-weight: 700; font-display: swap; src: url("./fonts/figtree-latin-700-normal.woff2") format("woff2"); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family: "Figtree"; font-style: italic; font-weight: 400; font-display: swap; src: url("./fonts/figtree-latin-400-italic.woff2") format("woff2"); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }

/* Figtree — latin-ext */
@font-face { font-family: "Figtree"; font-style: normal; font-weight: 400; font-display: swap; src: url("./fonts/figtree-latin-ext-400-normal.woff2") format("woff2"); unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
@font-face { font-family: "Figtree"; font-style: normal; font-weight: 500; font-display: swap; src: url("./fonts/figtree-latin-ext-500-normal.woff2") format("woff2"); unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
@font-face { font-family: "Figtree"; font-style: normal; font-weight: 600; font-display: swap; src: url("./fonts/figtree-latin-ext-600-normal.woff2") format("woff2"); unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
@font-face { font-family: "Figtree"; font-style: normal; font-weight: 700; font-display: swap; src: url("./fonts/figtree-latin-ext-700-normal.woff2") format("woff2"); unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
@font-face { font-family: "Figtree"; font-style: italic; font-weight: 400; font-display: swap; src: url("./fonts/figtree-latin-ext-400-italic.woff2") format("woff2"); unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }

/* Maple Mono — latin (single subset upstream; covers German umlauts) */
@font-face { font-family: "Maple Mono"; font-style: normal; font-weight: 400; font-display: swap; src: url("./fonts/maple-mono-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "Maple Mono"; font-style: normal; font-weight: 500; font-display: swap; src: url("./fonts/maple-mono-latin-500-normal.woff2") format("woff2"); }
@font-face { font-family: "Maple Mono"; font-style: italic; font-weight: 400; font-display: swap; src: url("./fonts/maple-mono-latin-400-italic.woff2") format("woff2"); }
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts src/fonts src/fonts.css test/integrity.test.mjs
git commit -m "feat: vendor Figtree and Maple Mono fonts"
```

---

### Task 4: Base styles + entry points

**Files:**
- Create: `src/base/reset.css`, `src/base/elements.css`, `src/tokens.css`, `src/patina.css`
- Modify: `test/integrity.test.mjs` (append tests)

**Interfaces:**
- Consumes: all semantic tokens (Task 2), `src()`/`read()`/`urls()` helpers in `test/integrity.test.mjs` (Task 3), `definedTokens`/`usedTokens` (Task 1)
- Produces:
  - Entry files `src/patina.css` and `src/tokens.css`
  - Layers `patina.reset`, `patina.base`
  - Attribute API `button[data-variant="primary" | "danger"]`
  - Helper classes `.pt-num`, `.pt-label`, `.pt-note`

- [ ] **Step 1: Append failing tests** to `test/integrity.test.mjs`

Add to the imports at the top of the file:

```js
import { execFileSync } from 'node:child_process';
import { definedTokens, usedTokens } from './lib/tokens.mjs';
```

Append:

```js
const imports = (css) =>
  [...css.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']\s*\)?/g)].map((m) => m[1]);
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').trim();

for (const entry of ['patina.css', 'tokens.css']) {
  test(`${entry}: every @import points to an existing file`, () => {
    const found = imports(read(entry));
    assert.ok(found.length > 0);
    const missing = found.filter((p) => !existsSync(resolve(src('.'), p)));
    assert.deepEqual(missing, []);
  });
}

test('patina.css declares layer order before any import', () => {
  assert.match(stripComments(read('patina.css')), /^@layer patina\.reset, patina\.base;/);
});

for (const [file, layer] of [['base/reset.css', 'patina.reset'], ['base/elements.css', 'patina.base']]) {
  test(`${file} is fully wrapped in @layer ${layer}`, () => {
    const body = stripComments(read(file));
    assert.ok(body.startsWith(`@layer ${layer} {`), 'must start with the layer block');
    assert.ok(body.endsWith('}'), 'must end with the layer block');
  });
}

test('base styles use no primitive tokens', () => {
  for (const file of ['base/reset.css', 'base/elements.css']) {
    const primitivesUsed = [...usedTokens(read(file))].filter((t) => /^--pt-(stone|ochre|green|red)-/.test(t));
    assert.deepEqual(primitivesUsed, [], file);
  }
});

test('base styles only use defined tokens', () => {
  const defined = new Set([
    ...definedTokens(read('tokens/primitives.css')),
    ...definedTokens(read('tokens/semantic.css')),
  ]);
  for (const file of ['base/reset.css', 'base/elements.css']) {
    const undefinedTokens = [...usedTokens(read(file))].filter((t) => !defined.has(t));
    assert.deepEqual(undefinedTokens, [], file);
  }
});

test('headings and paragraphs break long words', () => {
  assert.match(read('base/reset.css'), /overflow-wrap:\s*break-word/);
  assert.match(read('base/elements.css'), /hyphens:\s*auto/);
});

test('text inputs use the 1rem font size (no iOS zoom)', () => {
  const css = read('base/elements.css');
  const inputRule = css.match(/:where\(input:not[\s\S]*?\{([\s\S]*?)\}/);
  assert.ok(inputRule, 'text input rule not found');
  assert.match(inputRule[1], /font-size:\s*var\(--pt-font-size-md\)/);
});

test('npm pack ships entry points and fonts', () => {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' });
  const files = JSON.parse(out)[0].files.map((f) => f.path);
  for (const f of [
    'src/patina.css', 'src/tokens.css', 'src/fonts.css',
    'src/base/elements.css', 'src/tokens/semantic.css',
    'src/fonts/figtree-latin-400-normal.woff2', 'src/fonts/OFL-maple-mono.txt',
  ]) {
    assert.ok(files.includes(f), `missing from package: ${f}`);
  }
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL — `ENOENT ... src/patina.css` (and the related base-file tests).

- [ ] **Step 3: Create** `src/base/reset.css`

```css
/* patina — minimal modern reset. */
@layer patina.reset {
  *, *::before, *::after { box-sizing: border-box; }
  * { margin: 0; }
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  body { min-height: 100dvh; -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent; }
  img, picture, video, canvas, svg { display: block; max-width: 100%; }
  input, button, textarea, select { font: inherit; color: inherit; }
  p, h1, h2, h3, h4, h5, h6, li, td, th { overflow-wrap: break-word; }
  h1, h2, h3 { text-wrap: balance; }
  p { text-wrap: pretty; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

- [ ] **Step 4: Create** `src/base/elements.css`

```css
/* patina — styles for native elements + three typography helpers.
   Layered: any unlayered app CSS wins regardless of specificity. */
@layer patina.base {
  body {
    background: var(--pt-color-bg);
    color: var(--pt-color-text);
    font-family: var(--pt-font-sans);
    font-size: var(--pt-font-size-md);
    line-height: var(--pt-line-height-normal);
  }

  /* Typography */
  h1, h2, h3 { font-weight: var(--pt-font-weight-semibold); letter-spacing: -0.01em; hyphens: auto; }
  h1 { font-size: var(--pt-font-size-xl); line-height: var(--pt-line-height-tight); font-weight: var(--pt-font-weight-bold); letter-spacing: -0.02em; }
  h2 { font-size: var(--pt-font-size-lg); line-height: var(--pt-line-height-snug); }
  h3 { font-size: var(--pt-font-size-md); line-height: var(--pt-line-height-snug); }
  :where(h1, h2, h3) { margin-block: var(--pt-space-6) var(--pt-space-2); }
  :where(h1, h2, h3):first-child { margin-block-start: 0; }
  :where(p, ul, ol, pre, table, fieldset) { margin-block: 0 var(--pt-space-4); }
  :where(ul, ol) { padding-inline-start: var(--pt-space-5); }
  li + li { margin-block-start: var(--pt-space-1); }

  a {
    color: var(--pt-color-accent-text);
    font-weight: var(--pt-font-weight-semibold);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.2em;
  }
  a:hover { text-decoration-thickness: 2px; }
  strong, b { font-weight: var(--pt-font-weight-semibold); }
  small { font-size: var(--pt-font-size-sm); }
  hr { border: 0; border-top: 1px solid var(--pt-color-border); margin-block: var(--pt-space-6); }

  code, kbd, samp, pre { font-family: var(--pt-font-mono); font-size: 0.92em; }
  :not(pre) > code, kbd { background: var(--pt-color-surface-sunken); border-radius: var(--pt-radius-sm); padding: 0.1em 0.35em; }
  kbd { border: 1px solid var(--pt-color-border); border-bottom-width: 2px; }
  pre { background: var(--pt-color-surface-sunken); border-radius: var(--pt-radius-md); padding: var(--pt-space-4); overflow-x: auto; }

  /* Tables: borders, no stripes */
  table { width: 100%; border-collapse: collapse; font-size: var(--pt-font-size-sm); }
  th, td { text-align: start; padding: var(--pt-space-2) var(--pt-space-3) var(--pt-space-2) 0; }
  :is(th, td):last-child { padding-inline-end: 0; }
  th { color: var(--pt-color-text-muted); font-weight: var(--pt-font-weight-medium); border-bottom: 1px solid var(--pt-color-border-strong); }
  td { border-bottom: 1px solid var(--pt-color-border); }

  /* Buttons: neutral by default, variants via data-variant */
  button {
    cursor: pointer;
    min-height: 44px;
    padding: var(--pt-space-2) var(--pt-space-4);
    border: 1px solid transparent;
    border-radius: var(--pt-radius-md);
    background: var(--pt-color-surface-sunken);
    color: var(--pt-color-text);
    font-weight: var(--pt-font-weight-semibold);
    line-height: var(--pt-line-height-snug);
    touch-action: manipulation;
    transition: box-shadow var(--pt-duration-fast) var(--pt-ease), transform var(--pt-duration-fast) var(--pt-ease);
  }
  button:hover:not(:disabled) { box-shadow: inset 0 0 0 100vmax color-mix(in srgb, currentColor 8%, transparent); }
  button:active:not(:disabled) { transform: translateY(1px); }
  button:disabled { cursor: not-allowed; opacity: 0.45; }
  button[data-variant="primary"] { background: var(--pt-color-primary-bg); color: var(--pt-color-primary-fg); }
  button[data-variant="danger"] { background: var(--pt-color-danger); color: var(--pt-color-on-danger); }

  /* Forms */
  label { display: block; font-size: var(--pt-font-size-sm); font-weight: var(--pt-font-weight-medium); margin-block-end: var(--pt-space-1); }
  label:has(> input[type="checkbox"], > input[type="radio"]) {
    display: inline-flex;
    align-items: center;
    gap: var(--pt-space-2);
    font-size: var(--pt-font-size-md);
    font-weight: var(--pt-font-weight-regular);
  }
  :where(input:not([type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"]), select, textarea) {
    display: block;
    width: 100%;
    min-height: 44px;
    padding: var(--pt-space-2) var(--pt-space-3);
    background: var(--pt-color-surface);
    color: var(--pt-color-text);
    border: 1px solid var(--pt-color-border-strong);
    border-radius: var(--pt-radius-sm);
    font-size: var(--pt-font-size-md);
  }
  textarea { min-height: 6rem; resize: vertical; }
  ::placeholder { color: var(--pt-color-text-muted); opacity: 1; }
  [aria-invalid="true"] { border-color: var(--pt-color-danger); }
  :where(input, select, textarea):disabled { background: var(--pt-color-surface-sunken); opacity: 0.6; cursor: not-allowed; }
  input[type="checkbox"], input[type="radio"] { accent-color: var(--pt-color-accent-text); width: 1.125rem; height: 1.125rem; margin: 0; }
  fieldset { border: 1px solid var(--pt-color-border); border-radius: var(--pt-radius-md); padding: var(--pt-space-4); }
  legend { padding-inline: var(--pt-space-1); font-weight: var(--pt-font-weight-semibold); }

  /* Focus & selection */
  :focus-visible { outline: 2px solid var(--pt-color-focus); outline-offset: 2px; }
  :where(input, select, textarea):focus-visible { outline-offset: 1px; }
  ::selection { background: var(--pt-color-accent-subtle); color: var(--pt-color-text); }

  /* Typography helpers — the only classes patina ships */
  .pt-num { font-family: var(--pt-font-mono); font-variant-numeric: tabular-nums; }
  .pt-label {
    font-family: var(--pt-font-mono);
    font-size: var(--pt-font-size-xs);
    font-weight: var(--pt-font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--pt-color-text-muted);
  }
  .pt-note {
    font-family: var(--pt-font-mono);
    font-style: italic;
    font-size: var(--pt-font-size-sm);
    padding: var(--pt-space-3);
    border-inline-start: 3px solid var(--pt-color-accent);
    border-radius: 0 var(--pt-radius-md) var(--pt-radius-md) 0;
    background: var(--pt-color-surface);
  }
}
```

- [ ] **Step 5: Create the entry points**

`src/tokens.css`:
```css
/* patina — fonts + tokens only (no element styles). */
@import "./fonts.css";
@import "./tokens/primitives.css";
@import "./tokens/semantic.css";
```

`src/patina.css`:
```css
/* patina — everything. Layer order first: app CSS (unlayered) always wins. */
@layer patina.reset, patina.base;
@import "./fonts.css";
@import "./tokens/primitives.css";
@import "./tokens/semantic.css";
@import "./base/reset.css";
@import "./base/elements.css";
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src test/integrity.test.mjs
git commit -m "feat: add layered base styles and entry points"
```

---

### Task 5: Showcase page

**Files:**
- Create: `showcase/index.html`
- Modify: `test/integrity.test.mjs` (showcase token check)

**Interfaces:**
- Consumes: `src/patina.css` (Task 4), all semantic tokens (Task 2)

- [ ] **Step 1: Append a failing test** to `test/integrity.test.mjs`

```js
test('showcase only uses defined, non-primitive tokens', () => {
  const html = readFileSync(resolve(root, 'showcase/index.html'), 'utf8');
  const defined = definedTokens(read('tokens/semantic.css'));
  // Skip template-literal names like `--pt-color-${c}` (lookahead rejects partial matches).
  const referenced = new Set([...html.matchAll(/(--pt-[a-z0-9-]+)(?![a-z0-9-]|\$)/g)].map((m) => m[1]));
  const bad = [...referenced].filter((t) => !defined.has(t));
  assert.deepEqual(bad, []);
});
```

Run: `npm test` → Expected: FAIL (`ENOENT ... showcase/index.html`).

- [ ] **Step 2: Create** `showcase/index.html`

```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>patina showcase</title>
  <link rel="stylesheet" href="../src/patina.css">
  <style>
    /* Showcase-only layout (unlayered, uses semantic tokens only) */
    main { max-width: 760px; margin: 0 auto; padding: var(--pt-space-6) var(--pt-space-4) var(--pt-space-8); }
    section { margin-block: var(--pt-space-7); }
    .bar { display: flex; gap: var(--pt-space-2); flex-wrap: wrap; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--pt-space-3); }
    .swatch { border: 1px solid var(--pt-color-border); border-radius: var(--pt-radius-md); overflow: hidden; background: var(--pt-color-surface); }
    .swatch div { height: 56px; border-bottom: 1px solid var(--pt-color-border); }
    .swatch span { display: block; padding: var(--pt-space-2); font-size: var(--pt-font-size-xs); }
    .scale-row { display: flex; align-items: center; gap: var(--pt-space-3); margin-block: var(--pt-space-2); }
    .scale-row code { min-width: 150px; }
    .box { background: var(--pt-color-accent); height: 16px; }
    .radius { width: 64px; height: 40px; background: var(--pt-color-surface-sunken); border: 1px solid var(--pt-color-border-strong); }
    .card { background: var(--pt-color-surface); border: 1px solid var(--pt-color-border); border-radius: var(--pt-radius-md); padding: var(--pt-space-4); }
    .stack > * + * { margin-block-start: var(--pt-space-3); }
    [aria-pressed="true"] { outline: 2px solid var(--pt-color-focus); outline-offset: 2px; }
  </style>
</head>
<body>
<main>
  <p class="pt-label">patina · v0.1.0</p>
  <h1>Showcase</h1>
  <p>Alle Tokens und gestylten Elemente. Theme umschalten, um beide Varianten zu prüfen.</p>
  <div class="bar" role="group" aria-label="Theme">
    <button type="button" data-theme-choice="auto">Auto</button>
    <button type="button" data-theme-choice="light">Light</button>
    <button type="button" data-theme-choice="dark">Dark</button>
  </div>

  <section>
    <h2>Farben</h2>
    <div class="grid" id="colors"></div>
  </section>

  <section>
    <h2>Typografie</h2>
    <h1>Benachrichtigungseinstellungen und Trainingsplanung</h1>
    <h2>Überschrift zweiter Ebene</h2>
    <h3>Überschrift dritter Ebene</h3>
    <p>Fließtext in Figtree. Diese Woche steht die letzte intensive Belastung vor dem Tapering an. Der Schwerpunkt liegt auf der <a href="#">Laktatschwelle</a>, ergänzt durch einen <strong>längeren</strong>, <em>ruhigen</em> Lauf. Inline-Code: <code>--pt-color-accent</code>, Taste <kbd>⌘K</kbd>. <small>Kleintext.</small></p>
    <p><span class="pt-label">Label</span> · <span class="pt-num">42.5 km · 4:12/km · 1:48:00</span></p>
    <p class="pt-note">Locker bleiben — der Long Run ist kein Test.</p>
    <ul><li>Listenpunkt eins</li><li>Listenpunkt zwei</li></ul>
    <pre><code>@import "patina/src/patina.css";</code></pre>
    <hr>
    <div id="type-scale"></div>
  </section>

  <section>
    <h2>Spacing, Radius, Schatten</h2>
    <div id="space-scale"></div>
    <div class="bar" id="radius-scale"></div>
    <div class="bar" style="margin-block-start: var(--pt-space-5)">
      <div class="card" style="box-shadow: var(--pt-shadow-1)">shadow-1</div>
      <div class="card" style="box-shadow: var(--pt-shadow-2)">shadow-2</div>
    </div>
  </section>

  <section>
    <h2>Buttons</h2>
    <div class="bar">
      <button type="button" data-variant="primary">Speichern</button>
      <button type="button">Abbrechen</button>
      <button type="button" data-variant="danger">Löschen</button>
      <button type="button" data-variant="primary" disabled>Deaktiviert</button>
    </div>
  </section>

  <section>
    <h2>Formulare</h2>
    <form class="stack" onsubmit="return false">
      <div><label for="f-pace">Ziel-Pace</label><input id="f-pace" class="pt-num" value="4:15" inputmode="numeric"></div>
      <div><label for="f-bad">Ungültig</label><input id="f-bad" class="pt-num" value="4:7x" aria-invalid="true" aria-describedby="f-bad-err"><small id="f-bad-err" style="color: var(--pt-color-danger)">✕ Ungültiges Pace-Format (m:ss)</small></div>
      <div><label for="f-sel">Sportart</label><select id="f-sel"><option>Laufen</option><option>Rad</option></select></div>
      <div><label for="f-note">Notiz</label><textarea id="f-note" placeholder="Wie hat es sich angefühlt?"></textarea></div>
      <div><label for="f-dis">Deaktiviert</label><input id="f-dis" value="gesperrt" disabled></div>
      <fieldset>
        <legend>Optionen</legend>
        <label><input type="checkbox" checked> Erinnerung aktiv</label><br>
        <label><input type="radio" name="r" checked> Täglich</label>
        <label><input type="radio" name="r"> Wöchentlich</label>
      </fieldset>
    </form>
  </section>

  <section>
    <h2>Tabelle</h2>
    <table>
      <thead><tr><th>Einheit</th><th>Distanz</th><th>Pace</th></tr></thead>
      <tbody>
        <tr><td>Regeneration</td><td class="pt-num">8.0 km</td><td class="pt-num">5:35</td></tr>
        <tr><td>Schwelle 3×10'</td><td class="pt-num">12.5 km</td><td class="pt-num">4:12</td></tr>
        <tr><td>Long Run</td><td class="pt-num">24.0 km</td><td class="pt-num">5:05</td></tr>
      </tbody>
    </table>
  </section>
</main>

<script>
  const COLORS = ['bg', 'surface', 'surface-sunken', 'border', 'border-strong', 'text', 'text-muted',
    'accent', 'accent-text', 'accent-subtle', 'primary-bg', 'primary-fg', 'on-danger',
    'success', 'success-subtle', 'danger', 'danger-subtle', 'warning', 'warning-subtle',
    'info', 'info-subtle', 'focus'];
  const SIZES = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const SPACES = [1, 2, 3, 4, 5, 6, 7, 8];
  const RADII = ['sm', 'md', 'lg', 'full'];

  document.getElementById('colors').innerHTML = COLORS.map((c) =>
    `<div class="swatch"><div style="background: var(--pt-color-${c})"></div><span class="pt-num">${c}</span></div>`).join('');
  document.getElementById('type-scale').innerHTML = SIZES.map((s) =>
    `<div class="scale-row"><code>font-size-${s}</code><span style="font-size: var(--pt-font-size-${s})">Aufbauwoche 42.5</span></div>`).join('');
  document.getElementById('space-scale').innerHTML = SPACES.map((s) =>
    `<div class="scale-row"><code>space-${s}</code><div class="box" style="width: var(--pt-space-${s})"></div></div>`).join('');
  document.getElementById('radius-scale').innerHTML = RADII.map((r) =>
    `<div class="stack"><div class="radius" style="border-radius: var(--pt-radius-${r})"></div><code>${r}</code></div>`).join('');

  const root = document.documentElement;
  function applyTheme(choice) {
    if (choice === 'auto') delete root.dataset.theme; else root.dataset.theme = choice;
    document.querySelectorAll('[data-theme-choice]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.themeChoice === choice)));
    try { localStorage.setItem('pt-theme', choice); } catch {}
  }
  let saved = 'auto';
  try { saved = localStorage.getItem('pt-theme') || 'auto'; } catch {}
  applyTheme(saved);
  document.querySelectorAll('[data-theme-choice]').forEach((b) =>
    b.addEventListener('click', () => applyTheme(b.dataset.themeChoice)));
</script>
</body>
</html>
```

Note: the swatch/scale markup is built in JS from template strings like `var(--pt-color-${c})`. The showcase test's regex skips those generated names and checks only literal `--pt-…` names. The names in the arrays mirror `EXPECTED` from `test/contrast.test.mjs`.

- [ ] **Step 3: Run the tests and confirm they pass**

Run: `npm test` → Expected: all PASS.

- [ ] **Step 4: Manual visual check** (this is the visual test — do all points)

Run: `npm run showcase`, then open `http://localhost:8080/showcase/`.

Check:
1. Figtree and Maple Mono render. In DevTools → Network, the woff2 files load with status 200.
2. The Light / Dark / Auto toggle switches **every** swatch and element.
3. Forced theme vs. OS: set the OS to dark, then click "Light" → everything is light. Also check the reverse.
4. At a 320 px viewport (DevTools device mode), the long `h1` wraps or hyphenates and there is **no horizontal scroll**.
5. Tabbing through the page shows a visible ochre focus ring on buttons, inputs and links.
6. Run the axe DevTools extension in both themes → no contrast or critical violations. Record the result in the commit body.

- [ ] **Step 5: Commit**

```bash
git add showcase test/integrity.test.mjs
git commit -m "feat: add showcase page"
```

---

### Task 6: Docs + CI

**Files:**
- Create: `README.md`, `CHANGELOG.md`, `LICENSE`, `.github/workflows/ci.yml`

- [ ] **Step 1: Create** `LICENSE` (MIT, code only)

```
MIT License

Copyright (c) 2026 Marcel Goldammer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Fonts in src/fonts/ are licensed separately under the SIL Open Font License 1.1
(see src/fonts/OFL-figtree.txt and src/fonts/OFL-maple-mono.txt).
```

- [ ] **Step 2: Create** `CHANGELOG.md`

```markdown
# Changelog

## 0.1.0 — 2026-09-29

- Initial foundations: primitive + semantic tokens (light/dark via `light-dark()`), vendored Figtree + Maple Mono, layered base styles, `.pt-num` / `.pt-label` / `.pt-note`, showcase, WCAG contrast test.
```

- [ ] **Step 3: Create** `README.md`

````markdown
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
````

- [ ] **Step 4: Create** `.github/workflows/ci.yml`

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm test

  pages:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - name: Assemble site
        run: |
          mkdir -p _site
          cp -r src showcase _site/
          printf '<!doctype html><meta http-equiv="refresh" content="0; url=showcase/">' > _site/index.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site
      - id: deploy
        uses: actions/deploy-pages@v4
```

The workflow only takes effect after Marcel pushes to GitHub **and** sets Settings → Pages → Source to "GitHub Actions". GitHub Pages on a **private** repo requires a paid plan. Flag this to Marcel; don't decide it.

- [ ] **Step 5: Validate and commit**

Run: `npm test` → Expected: all PASS. Then run `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"`. If PyYAML is missing, skip it and eyeball the indentation instead.

```bash
git add README.md CHANGELOG.md LICENSE .github
git commit -m "docs: add readme, changelog, license and ci workflow"
```

---

### Task 7: Angular smoke test + tag v0.1.0

Throwaway app in a temp dir — **nothing from it is committed**.

**Interfaces:**
- Consumes: the whole package via a real git-dependency install

- [ ] **Step 1: Create a throwaway Angular app and install patina from the local git repo**

```bash
SMOKE=$(mktemp -d) && cd "$SMOKE"
npx -y @angular/cli@21 new patina-smoke --minimal --style=css --ssr=false --skip-git --skip-tests --defaults
cd patina-smoke
npm i "git+file://$HOME/code/patina#main"
ls node_modules/patina/src/fonts | wc -l   # expected: 15
```

- [ ] **Step 2: Wire patina in and add an override probe**

In `angular.json`, set `projects.patina-smoke.architect.build.options.styles` to:
```json
["node_modules/patina/src/patina.css", "src/styles.css"]
```

`src/styles.css`:
```css
/* Override probe: plain element selector must beat patina's button[data-variant] */
button.probe { background: rgb(255, 0, 0); }
```

Replace the app component template (`src/app/app.ts`, `template:`) with:
```html
<main style="padding: var(--pt-space-5)">
  <p class="pt-label">Smoke test</p>
  <h1>Benachrichtigungseinstellungen</h1>
  <p>Text mit <a href="#">Link</a> und <span class="pt-num">42.5 km</span>.</p>
  <label for="x">Eingabe</label><input id="x">
  <button data-variant="primary">Primary</button>
  <button class="probe" data-variant="primary">Probe</button>
</main>
```

Also set `<html lang="de">` in `src/index.html`.

- [ ] **Step 3: Build and verify assets**

```bash
npx ng build
ls dist/patina-smoke/browser/media | grep -c woff2   # expected: 13
grep -c "light-dark(" dist/patina-smoke/browser/styles-*.css   # usually >= 1
```
Expected: the build succeeds without errors. Budget warnings are acceptable but should be reported. If the `grep` finds 0 matches, esbuild has lowered `light-dark()` for the app's browserslist targets. That is not a failure, but it must be reported, and Step 4 must confirm that theme switching still works.

- [ ] **Step 4: Visual check**

Run: `npx ng serve`, then open `http://localhost:4200`.

Check:
- The fonts render.
- The "Probe" button is **red**, which proves the app CSS beats the layered patina styles.
- "Primary" uses the primary colors.
- Toggle the OS theme → the page follows.

- [ ] **Step 5: Tag the release** (in `~/code/patina`)

```bash
cd ~/code/patina
git tag -a v0.1.0 -m "v0.1.0"
git tag --list
```

The throwaway app in `$SMOKE` can then be deleted: `rm -rf "$SMOKE"`.

---

### Task 8: Vault project note

**Files (repo `~/agentic-os`):**
- Create: `Dev/Patina/Patina.md`
- Modify: `Dev/Dev.md` (Projekte list)

- [ ] **Step 1: Create** `Dev/Patina/Patina.md`

```markdown
---
type: project
status: active
repo: ~/code/patina
---

# Patina

Design-System-Foundations für alle **neuen** Frontend-Apps (Breath und Schwerkraft bleiben wie sie sind). Reines CSS ohne Build: Tokens, Light/Dark, Fonts, Base-Styles für native Elemente.

- Look: technisch mit warmen Akzenten — Steingrau, Muted Ochre, Figtree + Maple Mono
- Einbindung: `npm i github:marcel-goldammer/patina#vX.Y.Z` → `angular.json` styles
- Regeln: nur semantische Tokens (`--pt-color-*` …); Status nie nur über Farbe
- Spec: `~/code/patina/docs/superpowers/specs/2026-09-29-patina-design.md`
- Später (erst bei Bedarf): Angular-Komponentenbibliothek + Storybook, Icons (Lucide)

Teil von [[Dev]].
```

- [ ] **Step 2: Link from** `Dev/Dev.md` — add under `## Projekte`:

```markdown
- [[Patina]] — Design-System (Tokens, Themes, Base-Styles) für neue Frontend-Apps
```

- [ ] **Step 3: Commit (vault)**

```bash
cd ~/agentic-os
git add Dev/Patina/Patina.md Dev/Dev.md
git commit -m "docs(dev): add patina project note"
```
