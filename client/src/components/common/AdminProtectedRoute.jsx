import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { getDefaultAdminRoute } from '../../data/adminAccess.js';
import useAdminAuth from '../../hooks/useAdminAuth.js';
import LoadingSpinner from './LoadingSpinner.jsx';

export default function AdminProtectedRoute() {
  const location = useLocation();
  const { loading, user } = useAdminAuth();

  if (loading) {
    return <LoadingSpinner label="Checking admin session..." />;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/admin-portal/login" />;
  }

  const defaultRoute = getDefaultAdminRoute(user);
  if (location.pathname === '/admin-portal' && defaultRoute !== '/admin-portal') {
    return <Navigate replace to={defaultRoute} />;
  }

  return <Outlet />;
}
