import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted dark:text-muted-dark"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search company, role, or resume..."
        className="w-full rounded-lg border border-line dark:border-line-dark bg-white dark:bg-surface-dark py-2.5 pl-9 pr-8 text-sm placeholder:text-muted dark:placeholder:text-muted-dark focus:border-accent dark:focus:border-accent-dark outline-none transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted dark:text-muted-dark hover:text-ink dark:hover:text-slate-100"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
