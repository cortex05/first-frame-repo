// Static check (spec 013): every input, select and textarea in src has an
// accessible name -- aria-label, aria-labelledby, a wrapping <label>, or an id
// that a htmlFor in the same file points at. Placeholders don't count.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = dirname(fileURLToPath(import.meta.url));

const jsxFiles = (dir = SRC) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return jsxFiles(path);
    return name.endsWith('.jsx') && !/\.test\./.test(name) ? [path] : [];
  });

const rel = (path) => relative(SRC, path).replace(/\\/g, '/');

// The opening tag starting at `start`, up to its real `>`: a `>` inside `{...}`
// (an arrow function, a comparison) or inside a quoted value doesn't end it.
const openingTag = (source, start) => {
  let depth = 0;
  let quote = null;
  for (let i = start + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
    } else if (depth === 0 && (ch === '"' || ch === "'")) {
      quote = ch;
    } else if (depth === 0 && ch === '>') {
      return source.slice(start, i + 1);
    }
  }
  return source.slice(start);
};

// The id attribute's raw value: `"name"` or `{expression}`.
const idValue = (tag) => {
  const match = tag.match(/\sid=("[^"]*"|\{[^}]*\}[^\s/>]*)/);
  return match ? match[1] : null;
};

const isNamed = (source, start, tag) => {
  if (/\saria-label(ledby)?=/.test(tag)) return true;
  if (/\stype="(hidden|submit)"/.test(tag)) return true;

  const before = source.slice(0, start);
  if (before.lastIndexOf('<label') > before.lastIndexOf('</label>')) return true;

  const id = idValue(tag);
  return Boolean(id) && source.includes(`htmlFor=${id}`);
};

const unnamedControls = () =>
  jsxFiles().flatMap((path) => {
    const source = readFileSync(path, 'utf8');
    return [...source.matchAll(/<(input|select|textarea)\b/g)]
      .filter((match) => !isNamed(source, match.index, openingTag(source, match.index)))
      .map((match) => `${rel(path)}:${source.slice(0, match.index).split('\n').length} <${match[1]}>`);
  });

describe('form control labels', () => {
  it('gives every input, select and textarea an accessible name', () => {
    expect(unnamedControls()).toEqual([]);
  });
});
