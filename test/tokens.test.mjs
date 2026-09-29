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
