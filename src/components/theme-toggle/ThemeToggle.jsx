import useTheme from "../../hooks/useTheme";

import styles from "./ThemeToggle.module.css";

// Development / manual-testing switch between dark and light (spec 003).
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      aria-pressed={theme === "light"}
      onClick={toggleTheme}
      className={styles.toggle}
    >
      {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    </button>
  );
};

export default ThemeToggle;
