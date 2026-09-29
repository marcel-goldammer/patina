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
