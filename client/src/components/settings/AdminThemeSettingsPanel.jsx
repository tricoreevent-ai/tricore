export default function AdminThemeSettingsPanel({ theme, onThemeChange }) {
  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Appearance</h2>
          <p className="mt-2 text-sm text-slate-500">
            Choose how the admin workspace looks. The selected theme is saved in this
            browser and reused across admin sessions.
          </p>
        </div>
        <span className="badge bg-brand-mist text-brand-blue">
          Active theme: {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <button
          className={`rounded-[1.75rem] border p-5 text-left transition ${
            theme === 'light'
              ? 'border-brand-blue bg-brand-mist shadow-soft'
              : 'border-slate-200 bg-white hover:border-brand-blue/40'
          }`}
          onClick={() => onThemeChange('light')}
          type="button"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
            Light Mode
          </p>
          <p className="mt-3 text-xl font-bold text-slate-950">Bright, crisp, and default</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Best for daytime work, high-contrast dashboards, and print-oriented review.
          </p>
          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Sample admin panel surface
            </div>
          </div>
        </button>

        <button
          className={`rounded-[1.75rem] border p-5 text-left transition ${
            theme === 'dark'
              ? 'border-slate-700 bg-slate-950 text-white shadow-soft'
              : 'border-slate-200 bg-white hover:border-slate-400'
          }`}
          onClick={() => onThemeChange('dark')}
          type="button"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
            Dark Mode
          </p>
          <p className={`mt-3 text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
            Lower-glare night workspace
          </p>
          <p className={`mt-2 text-sm leading-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>
            Useful for long admin sessions, dim rooms, and reduced screen brightness fatigue.
          </p>
          <div className="mt-5 rounded-3xl border border-slate-700 bg-slate-900 p-4">
            <div className="rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-200">
              Sample admin panel surface
            </div>
          </div>
        </button>
      </div>
    </section>
  );
}
