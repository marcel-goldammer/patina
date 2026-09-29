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
