export default function ThemeToggle({ theme, onChange }) {
  const isDark = theme !== "light";

  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark mode"
      aria-checked={isDark}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => onChange(isDark ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-ui)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
    >
      <span aria-hidden="true">{isDark ? "🌙" : "☀️"}</span>
      <span className="hidden sm:inline">Dark mode</span>
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 rounded-full transition-colors ${isDark ? "bg-violet-600" : "bg-[var(--bg-ui-hover)]"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </span>
    </button>
  );
}
