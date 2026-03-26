export default function AdminFilterPanel({
  actions = null,
  children,
  className = '',
  description = '',
  gridClassName = 'xl:grid-cols-4',
  title
}) {
  return (
    <section className={`panel p-6 ${className}`.trim()}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3 xl:justify-end">{actions}</div> : null}
      </div>
      <div className={`mt-6 grid gap-4 sm:grid-cols-2 ${gridClassName}`.trim()}>{children}</div>
    </section>
  );
}
