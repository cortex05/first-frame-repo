import { useLayoutEffect, useState } from "react";

// Measures an element's content box (spec 018), so the Konva canvases follow
// their container -- window resizes, tablet rotation, and the stacked layout
// below 900px -- instead of reading window.innerWidth once per render.
//
// Returns a callback ref, not a ref object: the canvas screens return early
// before their canvas area exists, so the element can appear (or go away)
// after the first render, and measuring starts or stops with it.
//
// Without ResizeObserver it falls back to clientWidth/clientHeight on mount and
// on window resize.

const ZERO = { width: 0, height: 0 };

const useElementSize = () => {
  const [node, setNode] = useState(null);
  const [size, setSize] = useState(ZERO);

  useLayoutEffect(() => {
    if (!node) return undefined;

    const measure = (width, height) => {
      const next = { width: Math.round(width), height: Math.round(height) };
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
    };

    if (typeof window.ResizeObserver === "function") {
      const observer = new window.ResizeObserver(([entry]) => {
        measure(entry.contentRect.width, entry.contentRect.height);
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    const read = () => measure(node.clientWidth, node.clientHeight);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, [node]);

  // A detached element has no size, whatever was measured last.
  return [setNode, node ? size : ZERO];
};

export default useElementSize;
