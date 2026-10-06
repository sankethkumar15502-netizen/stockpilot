const base = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
let token = sessionStorage.getItem('stockpilot-token');
export function setToken(value) {
  token = value;
  if (value) sessionStorage.setItem('stockpilot-token', value);
  else sessionStorage.removeItem('stockpilot-token');
}
export const hasToken = () => Boolean(token);
export async function api(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${base}${path}`, { method, signal,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/login')) window.dispatchEvent(new Event('stockpilot-session-expired'));
    const error = new Error(data.error?.message || `Request failed (${response.status})`);
    Object.assign(error, { code: data.error?.code, fields: data.error?.fields, status: response.status });
    throw error;
  }
  return data;
}
