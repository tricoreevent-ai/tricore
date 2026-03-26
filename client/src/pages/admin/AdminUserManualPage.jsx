import AppIcon from '../../components/common/AppIcon.jsx';
import AdminPageShell from '../../components/layout/AdminPageShell.jsx';

export default function AdminUserManualPage() {
  return (
    <AdminPageShell
      description="Use the built-in guide for staff onboarding, day-to-day reference, and training across events, registrations, payments, accounting, reports, users, and settings."
      title="User Manual"
    >
      <div className="space-y-6">
        <section className="panel p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-orange">
                Help Center
              </p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">
                TriCore Events Operating Guide
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                This help file converts the full staff manual into a simple visual guide inside the
                admin portal. Open it here for quick reading or launch the full-page version in a
                separate tab for training sessions and printing.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                className="btn-primary inline-flex items-center gap-2"
                href="/help/tricore-user-manual.html"
                rel="noreferrer"
                target="_blank"
              >
                <AppIcon className="h-4 w-4" name="book" />
                Open Full Screen
              </a>
            </div>
          </div>
        </section>

        <section className="panel overflow-hidden p-0">
          <iframe
            className="min-h-[78vh] w-full border-0 bg-white"
            src="/help/tricore-user-manual.html"
            title="TriCore Events User Manual"
          />
        </section>
      </div>
    </AdminPageShell>
  );
}
