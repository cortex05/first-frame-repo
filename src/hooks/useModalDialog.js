import { useLayoutEffect, useRef } from "react";

// Modal dialog behavior shared by every dialog in the app (spec 012): focus
// moves in on open, Tab stays inside, Escape dismisses the top-most dialog,
// focus returns to the opener on close, and the page behind is inert and does
// not scroll.
//
// The hook is active while its component is mounted, so a dialog component
// should only be mounted while it is open. Render the dialog through
// DialogPortal: it must sit outside #root, which is made inert.
//
// Open dialogs form a stack; only the top one handles keys. One document
// keydown listener serves the whole stack, which is why Escape never reaches a
// dialog underneath.

const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";

const stack = [];
let nextId = 0;
let savedOverflow = "";

const getFocusable = (node) =>
  Array.from(node.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.disabled && el.getAttribute("tabindex") !== "-1" && !el.closest("[inert]"),
  );

const setInert = (el, inert) => {
  if (!el) return;
  if (inert) el.setAttribute("inert", "");
  else el.removeAttribute("inert");
};

// #root is inert while any dialog is open, and so is every dialog below the top.
const applyInert = () => {
  setInert(document.getElementById("root"), stack.length > 0);
  stack.forEach((entry, index) => setInert(entry.node, index < stack.length - 1));
};

const onDocumentKeyDown = (event) => {
  const top = stack[stack.length - 1];
  if (!top) return;

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    top.getDismiss()?.();
    return;
  }

  if (event.key !== "Tab") return;

  const { node } = top;
  const focusable = getFocusable(node);
  const active = document.activeElement;

  if (focusable.length === 0) {
    event.preventDefault();
    node.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (!node.contains(active)) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && (active === first || active === node)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
};

const isUsable = (el) =>
  Boolean(el) && el !== document.body && el.isConnected && !el.disabled && !el.closest("[inert]");

const restoreFocus = (entry) => {
  // Remounted in place (React StrictMode): the new entry takes over the opener.
  const remounted = stack.find((other) => other.node === entry.node);
  if (remounted) {
    remounted.previousFocus = entry.previousFocus;
    return;
  }

  // Something else already took focus: a new route, or the next dialog.
  const active = document.activeElement;
  if (active && active !== document.body && !entry.node.contains(active)) return;

  if (isUsable(entry.previousFocus)) {
    entry.previousFocus.focus();
    return;
  }

  // The opener is gone (e.g. the question it belonged to was deleted).
  const heading = document.querySelector("#root h1");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus();
    return;
  }

  active?.blur?.();
};

const useModalDialog = ({ onDismiss, dismissible = true } = {}) => {
  const dialogRef = useRef(null);
  const latest = useRef({ onDismiss, dismissible });

  useLayoutEffect(() => {
    latest.current = { onDismiss, dismissible };
  });

  useLayoutEffect(() => {
    const node = dialogRef.current;
    const entry = {
      id: (nextId += 1),
      node,
      previousFocus: document.activeElement,
      getDismiss: () => (latest.current.dismissible ? latest.current.onDismiss : null),
    };

    if (stack.length === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onDocumentKeyDown);
    }
    stack.push(entry);
    applyInert();

    // An autoFocus element inside (React focuses it during commit) keeps focus.
    if (!node.contains(document.activeElement)) node.focus();

    return () => {
      const index = stack.indexOf(entry);
      if (index !== -1) stack.splice(index, 1);
      setInert(node, false);
      applyInert();

      if (stack.length === 0) {
        document.body.style.overflow = savedOverflow;
        document.removeEventListener("keydown", onDocumentKeyDown);
      }

      // After the commit, so a route change or the next dialog can take focus first.
      queueMicrotask(() => restoreFocus(entry));
    };
  }, []);

  return {
    dialogRef,
    dialogProps: { role: "dialog", "aria-modal": "true", tabIndex: -1 },
  };
};

export default useModalDialog;
