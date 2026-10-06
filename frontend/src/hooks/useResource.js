import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
export function useResource(path, interval = 0) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const reloadRef = useRef(() => {});
  const reload = useCallback(() => reloadRef.current(), []);
  useEffect(() => {
    let active = true;
    let busy = false;
    let controller;
    setData(null); setLoading(true); setError(null);
    const load = async () => {
      if (!active || busy) return;
      busy = true;
      controller = new AbortController();
      try {
        const result = await api(path, { signal: controller.signal });
        if (active) { setData(result); setError(null); setUpdatedAt(new Date()); }
      } catch (e) { if (active && e.name !== 'AbortError') setError(e); }
      finally { busy = false; if (active) setLoading(false); }
    };
    reloadRef.current = load;
    load();
    const timer = interval ? setInterval(() => { if (!document.hidden) load(); }, interval) : null;
    const visibility = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { active = false; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [path, interval]);
  return { data, error, loading, reload, updatedAt };
}
