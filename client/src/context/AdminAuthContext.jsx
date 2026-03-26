import { createContext, useEffect, useState } from 'react';

import { getCurrentAdmin, loginAdmin } from '../api/authApi.js';
import {
  getEffectiveAdminPermissions,
  hasAdminPermission,
  hasAdminPortalAccess
} from '../data/adminAccess.js';
import { ADMIN_TOKEN_KEY } from '../utils/authKeys.js';

export const AdminAuthContext = createContext(null);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isTransientBootstrapError = (error) =>
  !error?.response && ['ERR_NETWORK', 'ECONNREFUSED'].includes(error?.code);

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    const hydrateAdmin = async () => {
      if (!token) {
        setLoading(false);
        setUser(null);
        return;
      }

      try {
        let currentUser = null;

        for (let attempt = 0; attempt < 6; attempt += 1) {
          try {
            currentUser = await getCurrentAdmin();
            break;
          } catch (error) {
            if (isTransientBootstrapError(error) && attempt < 5) {
              await sleep(500);
              continue;
            }

            throw error;
          }
        }

        if (!hasAdminPortalAccess(currentUser) || currentUser.authProvider !== 'local') {
          throw new Error('Admin access required.');
        }

        setUser(currentUser);
      } catch (error) {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          setToken(null);
        }

        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    hydrateAdmin();
  }, [token]);

  const login = async (username, password) => {
    setAuthenticating(true);

    try {
      const response = await loginAdmin({ username, password });
      if (!hasAdminPortalAccess(response.user)) {
        throw new Error('Admin access required.');
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
      return response.user;
    } finally {
      setAuthenticating(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        token,
        user,
        permissions: user ? getEffectiveAdminPermissions(user) : [],
        loading,
        authenticating,
        login,
        logout,
        hasPermission: (permission) => hasAdminPermission(user, permission),
        hasAnyPermission: (permissions = []) =>
          permissions.some((permission) => hasAdminPermission(user, permission)),
        isAuthenticated: Boolean(user)
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}
