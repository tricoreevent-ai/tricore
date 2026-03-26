import { Navigate, Outlet, useLocation } from 'react-router-dom';

import useAuth from '../../hooks/useAuth.js';
import LoadingSpinner from './LoadingSpinner.jsx';

export default function ProtectedRoute({ role }) {
  const location = useLocation();
  const { loading, user } = useAuth();

  if (loading) {
    return <LoadingSpinner label="Checking your session..." />;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/events" />;
  }

  if (role && user.role !== role) {
    return <Navigate replace to="/events" />;
  }

  return <Outlet />;
}
