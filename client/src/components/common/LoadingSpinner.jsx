export default function LoadingSpinner({ compact = false, label = 'Loading...' }) {
  return (
    <div className={`flex items-center justify-center ${compact ? 'min-h-[120px]' : 'min-h-[220px]'}`}>
      <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white px-6 py-5 shadow-soft">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#f97316,#38bdf8,#0f5fdb)] animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="relative h-11 w-11">
            <span className="absolute inset-0 rounded-full border-2 border-brand-blue/20" />
            <span className="absolute inset-1 rounded-full border-4 border-transparent border-t-brand-blue border-r-sky-400 animate-spin" />
            <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-orange animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-orange">
              Loading
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
