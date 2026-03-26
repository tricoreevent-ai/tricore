import AppIcon from './AppIcon.jsx';

const toneClasses = {
  blue: 'from-brand-blue/12 via-brand-mist to-white text-brand-blue',
  orange: 'from-brand-orange/12 via-orange-50 to-white text-brand-orange',
  emerald: 'from-emerald-100 via-emerald-50 to-white text-emerald-700',
  slate: 'from-slate-200 via-slate-50 to-white text-slate-700',
  rose: 'from-rose-100 via-rose-50 to-white text-rose-700'
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon = 'overview',
  tone = 'blue',
  helper = '',
  valueClassName = ''
}) {
  return (
    <div className="panel overflow-hidden p-0">
      <div className={`bg-gradient-to-br p-6 ${toneClasses[tone] || toneClasses.blue}`.trim()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p
              className={`mt-3 text-[1.1rem] font-bold leading-snug tracking-tight text-slate-950 sm:text-[1.2rem] lg:text-[1.3rem] ${valueClassName}`.trim()}
            >
              {value}
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/90 shadow-sm">
            <AppIcon className="h-5 w-5" name={icon} />
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 pt-4">
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        {helper ? (
          <p className={`text-xs font-medium uppercase tracking-[0.18em] text-slate-400 ${subtitle ? 'mt-3' : ''}`.trim()}>
            {helper}
          </p>
        ) : null}
      </div>
    </div>
  );
}
