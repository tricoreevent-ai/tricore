import { formatCurrency } from '../../utils/formatters.js';

const toneClasses = {
  income: {
    badge: 'bg-brand-mist text-brand-blue',
    bar: 'bg-brand-blue'
  },
  expense: {
    badge: 'bg-orange-50 text-brand-orange',
    bar: 'bg-brand-orange'
  }
};

export default function BreakdownChart({
  emptyMessage,
  items,
  title,
  tone = 'income'
}) {
  const maxValue =
    items.length > 0 ? Math.max(...items.map((item) => item.total || 0), 1) : 1;
  const classes = toneClasses[tone] || toneClasses.income;

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <span className={`badge ${classes.badge}`}>{items.length} categories</span>
      </div>

      <div className="mt-6 space-y-4">
        {items.length ? (
          items.map((item) => (
            <div key={item.category}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <p className="font-semibold text-slate-800">{item.label}</p>
                <p className="text-slate-500">{formatCurrency(item.total)}</p>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${classes.bar}`}
                  style={{ width: `${Math.max((item.total / maxValue) * 100, 8)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
            {emptyMessage}
          </p>
        )}
      </div>
    </section>
  );
}
