// Contrast guard (spec 015): the token pairs the UI relies on meet WCAG AA in
// both themes -- 4.5:1 for text, 3:1 for input borders and focus rings -- and
// no bright fill (orange, high-risk red) carries white text.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(SRC, 'index.css'), 'utf8');

const block = (selector) => {
  const match = css.match(new RegExp(`^${selector}\\s*\\{([\\s\\S]*?)^\\}`, 'm'));
  if (!match) throw new Error(`index.css has no ${selector} block`);
  return match[1];
};

const declarations = (body) =>
  Object.fromEntries(
    [...body.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]),
  );

const dark = declarations(block(':root'));
const THEMES = {
  dark,
  light: { ...dark, ...declarations(block(":root\\[data-theme='light'\\]")) },
};

// Follows var(--x) aliases down to a #rgb / #rrggbb literal.
const resolve = (name, tokens, seen = new Set()) => {
  if (seen.has(name)) throw new Error(`circular token ${name}`);
  seen.add(name);
  const value = tokens[name];
  if (value === undefined) throw new Error(`undefined token ${name}`);
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  if (alias) return resolve(alias[1], tokens, seen);
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    throw new Error(`${name} is not a solid hex color: ${value}`);
  }
  return value;
};

const luminance = (hex) => {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const wcagRatio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT = 4.5;
const NON_TEXT = 3;

// [foreground, background, minimum]
const PAIRS = [
  ['--light-text', '--blue-background', TEXT],
  ['--light-text', '--confirm', TEXT],
  ['--light-text', '--decline', TEXT],
  ['--light-text', '--blue-primary-dark', TEXT],
  ['--text-on-bright-fill', '--orange-edit', TEXT],
  ['--text-on-bright-fill', '--risk-high-bg', TEXT],
  ['--risk-high-text', '--risk-high-bg', TEXT],
  ['--risk-medium-text', '--risk-medium-bg', TEXT],
  ['--risk-low-text', '--risk-low-bg', TEXT],
  ['--error-text-surface', '--surface', TEXT],
  ['--error-text-surface', '--light-blue-background', TEXT],
  ['--error-text-light', '--page-bg', TEXT],
  ['--text-muted-surface', '--surface', TEXT],
  ['--text-muted-surface', '--surface-subtle', TEXT],
  ['--text-muted', '--page-bg', TEXT],
  ['--text-secondary', '--surface-subtle', TEXT],
  ['--modal-text', '--surface', TEXT],
  ['--page-text', '--page-bg', TEXT],
  ['--tf-text', '--surface-subtle', TEXT],
  ['--border-input', '--surface', NON_TEXT],
  ['--blue-background', '--page-bg', NON_TEXT],
  ['--blue-background', '--surface', NON_TEXT],
];

describe('wcagRatio', () => {
  it('matches the WCAG reference points', () => {
    expect(wcagRatio('#fff', '#000')).toBeCloseTo(21, 5);
    expect(wcagRatio('#777', '#777')).toBeCloseTo(1, 5);
  });
});

describe.each(Object.keys(THEMES))('%s theme contrast', (theme) => {
  const tokens = THEMES[theme];

  it.each(PAIRS)('%s on %s reaches %s:1', (fg, bg, minimum) => {
    const [a, b] = [resolve(fg, tokens), resolve(bg, tokens)];
    const ratio = wcagRatio(a, b);
    expect(ratio, `${fg} ${a} on ${bg} ${b} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(minimum);
  });
});

// ── white text on bright fills, anywhere in src ─────────────────────
const sourceFiles = (dir = SRC) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(css|jsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });

const BRIGHT_FILL = /background(?:-color)?\s*:\s*["']?var\(--(orange-edit|risk-high-bg)\)/;
const WHITE_TEXT = /(^|[\s{,;])color\s*:\s*["']?var\(--light-text\)/;

// CSS rule bodies, and inline style={{ ... }} objects in JSX.
const styleBlocks = (source, isCss) => {
  if (isCss) {
    return [...source.matchAll(/\{([^{}]*)\}/g)].map((m) => ({ body: m[1], index: m.index }));
  }
  return [...source.matchAll(/style=\{\{/g)].map((m) => {
    let depth = 2;
    let i = m.index + m[0].length;
    for (; i < source.length && depth > 0; i += 1) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') depth -= 1;
    }
    return { body: source.slice(m.index, i), index: m.index };
  });
};

describe('bright fills', () => {
  it('never carry white text', () => {
    const hits = sourceFiles().flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return styleBlocks(source, path.endsWith('.css'))
        .filter(({ body }) => BRIGHT_FILL.test(body) && WHITE_TEXT.test(body))
        .map(({ index }) => `${relative(SRC, path).replace(/\\/g, '/')}:${source.slice(0, index).split('\n').length}`);
    });
    expect(hits).toEqual([]);
  });
});
