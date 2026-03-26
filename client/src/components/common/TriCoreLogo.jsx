export function TriCoreMark({ className = 'h-12 w-12' }) {
  return <img alt="TriCore Events logo" className={className} src="/tricore-mark.svg" />;
}

export default function TriCoreLogo({
  className = '',
  markClassName = 'h-12 w-12',
  showText = true,
  titleClassName = 'font-display text-lg font-bold text-slate-950',
  subtitleClassName = 'text-xs text-slate-500',
  subtitle = 'Corporate Sports Operations'
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <TriCoreMark className={markClassName} />
      {showText ? (
        <div>
          <p className={titleClassName}>TriCore Events</p>
          <p className={subtitleClassName}>{subtitle}</p>
        </div>
      ) : null}
    </div>
  );
}

