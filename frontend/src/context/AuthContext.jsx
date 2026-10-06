import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, hasToken } from '../services/api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    if (hasToken()) api('/auth/me').then(data => { if (active) setUser(data.user); })
      .catch(error => { if (active && error.status === 401) setToken(null); }).finally(() => { if (active) setLoading(false); });
    else setLoading(false);
    const expire = () => { setToken(null); setUser(null); };
    window.addEventListener('stockpilot-session-expired', expire);
    return () => { active = false; window.removeEventListener('stockpilot-session-expired', expire); };
  }, []);
  const authenticate = async (type, input) => {
    const data = await api(`/auth/${type}`, { method: 'POST', body: input });
    setToken(data.token); setUser(data.user);
  };
  const logout = async () => {
    await api('/auth/logout', { method: 'POST', body: {} });
    setToken(null); setUser(null);
  };
  return <AuthContext.Provider value={{ user, loading, authenticate, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
