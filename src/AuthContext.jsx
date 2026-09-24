import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);
const STORAGE_KEY = 'mini-jira-user-id';

export function AuthProvider({ children }) {
  const [users,  setUsers]  = useState([]);
  const [userId, setUserId] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? Number(s) : null;
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const list = await api('/api/users', { userId: userId || 1 });
        if (cancelled) return;
        setUsers(list);
        const valid  = list.some(u => u.id === userId);
        const nextId = valid ? userId : (list[0]?.id ?? null);
        setUserId(nextId);
        if (nextId) localStorage.setItem(STORAGE_KEY, String(nextId));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const user = useMemo(() => users.find(u => u.id === userId) ?? null, [users, userId]);

  const switchUser = useCallback((id) => {
    setUserId(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }, []);

  const switchRole = useCallback((role) => {
    const match = users.find(u => u.role === role);
    if (match) switchUser(match.id);
  }, [users, switchUser]);

  const refreshUsers = useCallback(async () => {
    if (!userId) return;
    const list = await api('/api/users', { userId });
    setUsers(list);
  }, [userId]);

  return (
    <AuthContext.Provider value={{ users, user, userId, ready, error, switchUser, switchRole, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
