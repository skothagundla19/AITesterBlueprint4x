import { SlidersHorizontal, MousePointerClick } from 'lucide-react'
import SearchBar from './SearchBar.jsx'
import { STATUSES } from '../hooks/useJobs.js'

export default function Toolbar({
  search,
  onSearchChange,
  filtersOpen,
  onToggleFilters,
  filters,
  onFilterChange,
  resumes,
}) {
  return (
    <div className="px-1 pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <SearchBar value={search} onChange={onSearchChange} />
        </div>
        <button
          type="button"
          onClick={onToggleFilters}
          aria-expanded={filtersOpen}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
            filtersOpen
              ? 'border-accent text-accent dark:border-accent-dark dark:text-accent-dark'
              : 'border-line dark:border-line-dark text-ink dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <SlidersHorizontal size={15} />
          Filters
        </button>
        <span className="hidden items-center gap-1.5 text-xs text-muted dark:text-muted-dark md:inline-flex">
          <MousePointerClick size={13} />
          Drag cards to update status
        </span>
      </div>

      {filtersOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-4 rounded-xl border border-line dark:border-line-dark bg-white dark:bg-surface-dark px-4 py-3.5">
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => onFilterChange('status', v)}
            options={[{ value: 'all', label: 'All' }, ...STATUSES.map((s) => ({ value: s.id, label: s.label }))]}
          />
          <FilterSelect
            label="Resume"
            value={filters.resume}
            onChange={(v) => onFilterChange('resume', v)}
            options={[{ value: 'all', label: 'All' }, ...resumes.map((r) => ({ value: r, label: r }))]}
          />
          <FilterSelect
            label="Reminders"
            value={filters.reminder}
            onChange={(v) => onFilterChange('reminder', v)}
            options={[
              { value: 'all', label: 'All applications' },
              { value: 'upcoming', label: 'Has follow-up date' },
              { value: 'overdue', label: 'Overdue follow-up' },
            ]}
          />
          <button
            type="button"
            onClick={() => onFilterChange('reset')}
            className="ml-auto rounded-lg border border-line dark:border-line-dark px-3 py-2 text-sm font-medium text-ink dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line dark:border-line-dark bg-white dark:bg-base-dark px-2.5 py-1.5 text-sm text-ink dark:text-slate-100 outline-none focus:border-accent dark:focus:border-accent-dark"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
