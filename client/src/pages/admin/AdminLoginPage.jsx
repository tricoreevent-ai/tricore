import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import TriCoreLogo from '../../components/common/TriCoreLogo.jsx';
import useAdminAuth from '../../hooks/useAdminAuth.js';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticating, isAuthenticated, loading, login } = useAdminAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate replace to="/admin-portal" />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError('');
      await login(form.username, form.password);
      navigate(location.state?.from?.pathname || '/admin-portal', { replace: true });
    } catch (loginError) {
      const fallbackMessage =
        !loginError.response && typeof window !== 'undefined'
          ? `Admin login failed. Cannot reach the server from this device. Try ${window.location.origin}/api/health first.`
          : 'Admin login failed.';

      setError(loginError.response?.data?.message || fallbackMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-brand-navy to-brand-blue px-4 py-16">
      <div className="mx-auto max-w-md">
        <div className="panel p-8">
          <TriCoreLogo
            className="justify-center"
            markClassName="h-20 w-20"
            subtitle="Operations Console"
            subtitleClassName="text-center text-xs uppercase tracking-[0.18em] text-brand-orange"
            titleClassName="text-center font-display text-2xl font-bold text-slate-950"
          />
          <h1 className="mt-4 text-4xl font-bold">Admin Portal</h1>
          <p className="mt-4 text-sm text-slate-600">
            Sign in with local admin credentials. Default bootstrap login is username <strong>tricore</strong> and password <strong>tricore</strong>.
          </p>
          <p className="mt-2 text-sm text-slate-500">Change that password immediately from the Users section after logging in.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="label" htmlFor="admin-username">
                Username
              </label>
              <input
                className="input"
                id="admin-username"
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                required
                value={form.username}
              />
            </div>
            <div>
              <label className="label" htmlFor="admin-password">
                Password
              </label>
              <input
                className="input"
                id="admin-password"
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
                type="password"
                value={form.password}
              />
            </div>
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
            <button className="btn-primary w-full" disabled={authenticating} type="submit">
              {authenticating ? 'Signing in...' : 'Sign In to Admin Portal'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
