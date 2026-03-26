import TriCoreLogo from '../common/TriCoreLogo.jsx';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-shell flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
        <TriCoreLogo
          className="items-center"
          markClassName="h-12 w-12"
          subtitle="Sports tournaments and corporate event execution"
        />
        <div className="text-sm text-slate-500 md:text-right">
          <p>TriCore Events streamlines registrations, schedules, and tournament accounting.</p>
          <p className="mt-1">Built for corporate sports operations teams.</p>
        </div>
      </div>
    </footer>
  );
}
