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
