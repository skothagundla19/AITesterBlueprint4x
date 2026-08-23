export default function Hero({ totalRoles, inProgress, offers }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 px-1 pb-5 pt-6">
      <div>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
          <span className="h-1.5 w-1.5 rounded-full bg-stage-offer" />
          Your job search, organized
        </p>
        <h1 className="mt-2 font-display text-4xl font-black leading-[1.05] tracking-tight text-ink dark:text-slate-100 sm:text-5xl">
          Build momentum.
          <br />
          <span className="text-accent dark:text-accent-dark">Find your next.</span>
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted dark:text-muted-dark">
          One calm place to see every opportunity and keep the right things moving.
        </p>
      </div>

      <div className="flex items-center gap-6 sm:gap-8">
        <Stat label="Total roles" value={totalRoles} />
        <Stat label="In progress" value={inProgress} />
        <Stat label="Offers" value={offers} accent="text-stage-offer" />
      </div>
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${accent || 'text-ink dark:text-slate-100'}`}>{value}</p>
    </div>
  )
}
