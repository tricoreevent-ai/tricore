import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container-shell py-24">
      <div className="panel p-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">404</p>
        <h1 className="mt-4 text-4xl font-bold">Page not found</h1>
        <p className="mt-4 text-slate-600">The page you requested is not available in this route set.</p>
        <Link className="btn-primary mt-8" to="/">
          Return Home
        </Link>
      </div>
    </div>
  );
}
