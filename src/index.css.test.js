// Static checks on the color tokens (spec 003): both themes declare every
// color token, every token referenced in src is defined, and no color
// literals remain outside index.css.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(SRC, 'index.css'), 'utf8');

const NON_COLOR_TOKENS = new Set(['--sans', '--heading', '--mono']);
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;
// cssVar('--name', '<fallback>'): the fallback is the one allowed literal.
const CSS_VAR_CALL = /cssVar\(\s*(["'])--[\w-]+\1\s*,\s*(["'])[^"']*\2\s*\)/g;

const block = (selector) => {
  const match = css.match(new RegExp(`^${selector}\\s*\\{([\\s\\S]*?)^\\}`, 'm'));
  if (!match) throw new Error(`index.css has no ${selector} block`);
  return match[1];
};

const tokensIn = (body) => new Set([...body.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]));

const sourceFiles = (dir = SRC) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(css|jsx?)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });

const rel = (path) => relative(SRC, path).replace(/\\/g, '/');

const darkTokens = tokensIn(block(':root'));
const lightBody = block(":root\\[data-theme='light'\\]");
const lightTokens = tokensIn(lightBody);
const definedTokens = tokensIn(css);

describe('index.css themes', () => {
  it('declares every dark color token in the light block', () => {
    const missing = [...darkTokens].filter(
      (name) => !NON_COLOR_TOKENS.has(name) && !lightTokens.has(name),
    );
    expect(missing).toEqual([]);
  });

  it('declares no light-only tokens', () => {
    expect([...lightTokens].filter((name) => !darkTokens.has(name))).toEqual([]);
  });

  it('sets color-scheme per theme', () => {
    expect(block(':root')).toMatch(/color-scheme:\s*dark/);
    expect(lightBody).toMatch(/color-scheme:\s*light/);
  });

  it('has none of the old theme leftovers', () => {
    expect(css).not.toMatch(/prefers-color-scheme|#social|--color-bg/);
  });
});

describe('token usage in src', () => {
  const files = sourceFiles().filter((path) => rel(path) !== 'utils/cssVars.js');

  it('only references defined tokens', () => {
    const undefinedRefs = files.flatMap((path) => {
      const text = readFileSync(path, 'utf8');
      const names = [
        ...[...text.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]),
        ...[...text.matchAll(/cssVar\(\s*["'](--[\w-]+)/g)].map((m) => m[1]),
      ];
      // `var(--risk-${tier}-bg)` builds the name at runtime; `var(--x)` is the
      // placeholder the canvas comments use.
      return names
        .filter((name) => !name.endsWith('-') && name !== '--x' && !definedTokens.has(name))
        .map((name) => `${rel(path)}: ${name}`);
    });
    expect(undefinedRefs).toEqual([]);
  });

  it('has no color literals outside index.css except cssVar fallbacks', () => {
    const hits = files
      .filter((path) => rel(path) !== 'index.css')
      .flatMap((path) =>
        readFileSync(path, 'utf8')
          .split('\n')
          .map((line, i) => ({ line: line.replace(CSS_VAR_CALL, ''), at: `${rel(path)}:${i + 1}` }))
          .filter(({ line }) => COLOR_LITERAL.test(line))
          .map(({ at }) => at),
      );
    expect(hits).toEqual([]);
  });
});
