import { createContext, useEffect, useState } from 'react';

import { getCurrentUser, loginWithGoogleToken } from '../api/authApi.js';
import { hasAdminPortalAccess } from '../data/adminAccess.js';
import { PUBLIC_TOKEN_KEY } from '../utils/authKeys.js';

export const AuthContext = createContext(null);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isTransientBootstrapError = (error) =>
  !error?.response && ['ERR_NETWORK', 'ECONNREFUSED'].includes(error?.code);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(PUBLIC_TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    const hydrateUser = async () => {
      if (!token) {
        setLoading(false);
        setUser(null);
        return;
      }

      try {
        let currentUser = null;

        for (let attempt = 0; attempt < 6; attempt += 1) {
          try {
            currentUser = await getCurrentUser();
            break;
          } catch (error) {
            if (isTransientBootstrapError(error) && attempt < 5) {
              await sleep(500);
              continue;
            }

            throw error;
          }
        }

        setUser(currentUser);
      } catch (error) {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          localStorage.removeItem(PUBLIC_TOKEN_KEY);
          setToken(null);
        }

        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    hydrateUser();
  }, [token]);

  const login = async (credential) => {
    setAuthenticating(true);

    try {
      const response = await loginWithGoogleToken(credential);
      localStorage.setItem(PUBLIC_TOKEN_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
      return response.user;
    } finally {
      setAuthenticating(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(PUBLIC_TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    loading,
    authenticating,
    login,
    logout,
    isAdmin: hasAdminPortalAccess(user),
    isAuthenticated: Boolean(user)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
