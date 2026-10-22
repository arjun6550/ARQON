import { useTheme } from "../lib/theme";

export function ThemeToggle({ className = "nav-link" }: { className?: string }) {
  const [theme, toggle] = useTheme();
  const dark = theme === "dark";
  return (
    <button type="button" className={className} onClick={toggle} aria-pressed={dark} title="Switch between light and dark">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        {dark ? <circle cx="12" cy="12" r="4" /> : <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />}
        {dark && <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />}
      </svg>
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
