/**
 * Konva paints onto a <canvas>, and every `fill` / `stroke` it receives is
 * handed straight to the 2D context. The context only accepts literal color
 * strings — it never runs the CSS cascade, so `var(--light-text)` is rejected
 * as invalid and the shape keeps whatever colour the context already had
 * (usually black). Resolve the variable off :root first, then give Konva the
 * hex that comes back.
 *
 * Only needed for canvas. Plain DOM styles can use `var(--x)` directly.
 */

const cache = new Map();

const themeKey = () =>
  document.documentElement.getAttribute("data-theme") || "system";

export const cssVar = (name, fallback = "") => {
  // Key on the active theme so a manual light/dark switch re-reads instead of
  // serving the colour from the previous theme.
  const key = `${themeKey()}|${name}`;
  if (cache.has(key)) return cache.get(key);

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const resolved = value || fallback;
  cache.set(key, resolved);
  return resolved;
};
