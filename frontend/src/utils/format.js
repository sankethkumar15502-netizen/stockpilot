export const date = value => value ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
export const currency = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value || 0);
export const percent = value => value == null ? '—' : `${value}%`;
export const label = value => (value || '').toLowerCase().replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
export const duration = ms => ms == null ? '—' : ms < 60000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 6000) / 10}m`;
