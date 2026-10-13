import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// Spec 016: every screen names itself in the tab title, and after in-app
// navigation focus moves to the new screen's <h1>, so screen readers read it
// and Tab starts from the top.
//
// React Router gives the first location of a router the key "default" and every
// navigation a fresh key, so "a key we haven't handled" means "just navigated".
// Screens that load data pass `ready: false` until their heading is rendered.

let lastFocusedKey = null;

export const __resetPageTitleForTests = () => {
  lastFocusedKey = null;
};

const usePageTitle = (title, { ready = true } = {}) => {
  const { key } = useLocation();

  useEffect(() => {
    document.title = title ? `${title} – First Frame` : "First Frame";
  }, [title]);

  // A layout effect runs before a closing dialog's deferred focus restore
  // (useModalDialog), which then sees focus already placed and leaves it.
  useLayoutEffect(() => {
    if (!ready || key === "default" || key === lastFocusedKey) return;
    // A dialog that opened on arrival (e.g. AcceptTerms) keeps its focus.
    if (document.activeElement?.closest('[role="dialog"]')) return;

    const heading = document.querySelector("#root h1") ?? document.querySelector("h1");
    if (!heading) return;

    lastFocusedKey = key;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus();
  }, [key, ready]);
};

export default usePageTitle;
