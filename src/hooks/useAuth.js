import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [passwordSet, setPasswordSet] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await api.authStatus();
      setPasswordSet(status.passwordSet);
      if (status.passwordSet) {
        try {
          await api.checkSession();
          setAuthenticated(true);
        } catch {
          setAuthenticated(false);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setup = useCallback(async (password) => {
    await api.setupPassword(password);
    await refresh();
  }, [refresh]);

  const login = useCallback(async (password) => {
    await api.login(password);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setAuthenticated(false);
  }, []);

  return { loading, passwordSet, authenticated, error, setup, login, logout };
}
