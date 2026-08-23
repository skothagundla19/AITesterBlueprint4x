import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line dark:border-line-dark text-muted dark:text-muted-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
