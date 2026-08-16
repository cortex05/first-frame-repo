import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Keeps an in-progress seating chart alive across refreshes and mid-flow exits.
// `rects` is the only source of truth for who is seated; everything else the
// StartScreen shows is derived from it.

const KEY_PREFIX = "seating-draft:";
const MAX_HISTORY = 50;
const WRITE_DELAY = 200;

const DEFAULT_VIEW = { scale: 1, x: 0, y: 0 };
const EMPTY = { rects: [], past: [], view: DEFAULT_VIEW };

const storageKey = (caseId) => `${KEY_PREFIX}${caseId}`;

// A draft is only valid for the roster size it was built against — a chart for
// 24 students references circles that do not exist in a 30-student case, so a
// mismatched draft is dropped rather than merged. The stale entry is left for
// the next write to overwrite, which keeps this a pure read.
function readDraft(caseId, studentNumber) {
  try {
    const raw = localStorage.getItem(storageKey(caseId));
    if (!raw) return EMPTY;

    const saved = JSON.parse(raw);
    if (saved?.studentNumber !== studentNumber) return EMPTY;

    return {
      rects: Array.isArray(saved.rects) ? saved.rects : [],
      past: Array.isArray(saved.past) ? saved.past : [],
      view: saved.view ?? DEFAULT_VIEW,
    };
  } catch {
    // A corrupt draft should never block the screen.
    return EMPTY;
  }
}

const useSeatingDraft = (caseId, studentNumber) => {
  // `key` is null until the case has loaded from the store. Nothing is read or
  // written before then, so the store-hydration race cannot overwrite a good
  // draft with an empty one.
  const key =
    caseId && Number.isFinite(studentNumber) ? `${caseId}:${studentNumber}` : null;

  const [state, setState] = useState({ key: null, ...EMPTY });

  const pending = useRef(null);
  const suspended = useRef(false);

  // Hydrating during render rather than in an effect means the first paint
  // after the case loads already shows the saved draft — no empty flash, and
  // no window in which a write could clobber it.
  if (key && state.key !== key) {
    setState({ key, ...readDraft(caseId, studentNumber) });
  }

  const hydrated = key !== null && state.key === key;

  const flush = useCallback(() => {
    if (!pending.current) return;
    localStorage.setItem(pending.current.key, pending.current.payload);
    pending.current = null;
  }, []);

  // Writes are batched so dragging and zooming do not hammer localStorage.
  useEffect(() => {
    if (!hydrated || suspended.current) return;

    pending.current = {
      key: storageKey(caseId),
      payload: JSON.stringify({
        studentNumber,
        rects: state.rects,
        past: state.past,
        view: state.view,
      }),
    };

    const timer = setTimeout(flush, WRITE_DELAY);
    return () => clearTimeout(timer);
  }, [hydrated, caseId, studentNumber, state, flush]);

  // A refresh or tab close never runs React cleanup, so the pending write is
  // flushed on pagehide as well as on unmount.
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const commit = useCallback((updater) => {
    suspended.current = false;
    setState((prev) => {
      if (!prev.key) return prev;
      const rects =
        typeof updater === "function" ? updater(prev.rects) : updater;
      if (rects === prev.rects) return prev;
      return {
        ...prev,
        rects,
        past: [...prev.past, prev.rects].slice(-MAX_HISTORY),
      };
    });
  }, []);

  const addRect = useCallback(
    (rect) => commit((rects) => [...rects, rect]),
    [commit],
  );

  const moveRect = useCallback(
    (id, x, y) =>
      commit((rects) =>
        rects.map((r) => (r.id === id ? { ...r, x, y } : r)),
      ),
    [commit],
  );

  const clearRects = useCallback(
    () => commit((rects) => (rects.length === 0 ? rects : [])),
    [commit],
  );

  const undo = useCallback(() => {
    suspended.current = false;
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      return {
        ...prev,
        rects: prev.past[prev.past.length - 1],
        past: prev.past.slice(0, -1),
      };
    });
  }, []);

  const setView = useCallback((view) => {
    setState((prev) => (prev.key ? { ...prev, view } : prev));
  }, []);

  // Called once the chart is committed to the case — the draft has served its
  // purpose and must not be restored on a later visit.
  const discardDraft = useCallback(() => {
    pending.current = null;
    suspended.current = true;
    if (caseId) localStorage.removeItem(storageKey(caseId));
    setState((prev) => ({ ...prev, ...EMPTY }));
  }, [caseId]);

  return useMemo(
    () => ({
      hydrated,
      rects: state.rects,
      view: state.view,
      canUndo: state.past.length > 0,
      addRect,
      moveRect,
      clearRects,
      undo,
      setView,
      discardDraft,
    }),
    [
      hydrated,
      state.rects,
      state.view,
      state.past.length,
      addRect,
      moveRect,
      clearRects,
      undo,
      setView,
      discardDraft,
    ],
  );
};

export default useSeatingDraft;
