import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { definedTokens, usedTokens } from './lib/tokens.mjs';

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

test('showcase only uses defined, non-primitive tokens', () => {
  const html = readFileSync(resolve(root, 'showcase/index.html'), 'utf8');
  const defined = definedTokens(read('tokens/semantic.css'));
  // Skip template-literal names like `--pt-color-${c}` (lookahead rejects partial matches).
  const referenced = new Set([...html.matchAll(/(--pt-[a-z0-9-]+)(?![a-z0-9-]|\$)/g)].map((m) => m[1]));
  const bad = [...referenced].filter((t) => !defined.has(t));
  assert.deepEqual(bad, []);
});
