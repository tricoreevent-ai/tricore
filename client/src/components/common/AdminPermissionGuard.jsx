import { Navigate, useLocation } from 'react-router-dom';

import { getDefaultAdminRoute } from '../../data/adminAccess.js';
import useAdminAuth from '../../hooks/useAdminAuth.js';

export default function AdminPermissionGuard({ children, permissions = [] }) {
  const location = useLocation();
  const { hasAnyPermission, user } = useAdminAuth();

  if (!permissions.length || hasAnyPermission(permissions)) {
    return children;
  }

  return <Navigate replace state={{ from: location }} to={getDefaultAdminRoute(user)} />;
}
