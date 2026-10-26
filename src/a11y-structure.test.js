// Static structure checks (spec 017): no interactive element nested inside
// another, and every screen renders its content inside one <main>.
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
const lineOf = (source, index) => source.slice(0, index).split('\n').length;

// The opening tag starting at `start`, up to its real `>`: a `>` inside `{...}`
// or a quoted value doesn't end it.
const openingTag = (source, start) => {
  let depth = 0;
  let quote = null;
  for (let i = start + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (depth === 0 && (ch === '"' || ch === "'")) quote = ch;
    else if (depth === 0 && ch === '>') return source.slice(start, i + 1);
  }
  return source.slice(start);
};

const INTERACTIVE_INSIDE = /<(Link|a|button|input|select|textarea)\b/;

// Interactive elements (Link, a, button) that contain another one.
export const findNested = (source) => {
  const hits = [];
  for (const match of source.matchAll(/<(Link|a|button)\b/g)) {
    const tag = openingTag(source, match.index);
    if (tag.endsWith('/>')) continue;

    const name = match[1];
    const bodyStart = match.index + tag.length;
    const re = new RegExp(`<${name}\\b|</${name}>`, 'g');
    re.lastIndex = bodyStart;
    let depth = 1;
    let end = source.length;
    for (let m = re.exec(source); m; m = re.exec(source)) {
      depth += m[0].startsWith('</') ? -1 : 1;
      if (depth === 0) {
        end = m.index;
        break;
      }
    }
    if (INTERACTIVE_INSIDE.test(source.slice(bodyStart, end))) hits.push(lineOf(source, match.index));
  }
  return hits;
};

// The component-level returns of a screen (body indentation: 2 spaces or a tab)
// and the JSX each one renders.
const topLevelReturns = (source) =>
  [...source.matchAll(/^( {2}|\t)(if \([^\n]*\) )?return\b/gm)].map((match) => {
    const start = match.index + match[0].length;
    const rest = source.slice(start).trimStart();
    if (!rest.startsWith('(')) return { line: lineOf(source, match.index), jsx: rest.split('\n')[0] };
    let depth = 0;
    for (let i = 0; i < rest.length; i += 1) {
      if (rest[i] === '(') depth += 1;
      else if (rest[i] === ')') depth -= 1;
      if (depth === 0) return { line: lineOf(source, match.index), jsx: rest.slice(0, i + 1) };
    }
    return { line: lineOf(source, match.index), jsx: rest };
  });

describe('findNested', () => {
  it('reports a link inside a button, and nothing for siblings', () => {
    expect(findNested('<button>\n  <Link to="/x">a</Link>\n</button>')).toEqual([1]);
    expect(findNested('<button>a</button>\n<Link to="/x">b</Link>')).toEqual([]);
  });
});

describe('interactive elements', () => {
  it('are never nested inside one another', () => {
    const hits = jsxFiles().flatMap((path) =>
      findNested(readFileSync(path, 'utf8')).map((line) => `${rel(path)}:${line}`),
    );
    expect(hits).toEqual([]);
  });
});

const screens = jsxFiles().filter((path) => /screens\/.*Screen\.jsx$/.test(rel(path)));

describe('screens', () => {
  it.each(screens.map(rel))('%s renders exactly one <main> in each top-level return', (file) => {
    const source = readFileSync(join(SRC, file), 'utf8');
    const missing = topLevelReturns(source)
      // Only returns that render JSX (helpers at the same indent return data).
      .filter(({ jsx }) => /^\(?\s*</.test(jsx))
      .filter(({ jsx }) => (jsx.match(/<main\b/g) || []).length !== 1)
      .map(({ line }) => `${file}:${line}`);
    expect(missing).toEqual([]);
  });
});
