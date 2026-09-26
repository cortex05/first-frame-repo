import { useCallback, useState } from "react";

import { applyTheme, getDocumentTheme } from "../utils/theme";

// The current theme and a switch. <html data-theme> is the source of truth, so
// no store is needed; only the Home toggle reads this.
const useTheme = () => {
  const [theme, setTheme] = useState(getDocumentTheme);

  const toggleTheme = useCallback(() => {
    setTheme(applyTheme(theme === "dark" ? "light" : "dark"));
  }, [theme]);

  return { theme, toggleTheme };
};

export default useTheme;
