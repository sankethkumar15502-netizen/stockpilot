import { Alert, Box, Button, Chip, LinearProgress, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { ArrowUpRight, Inbox, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { label } from '../utils/format';

export function StatusBadge({ status }) {
  const color = ['COMPLETED', 'APPROVED'].includes(status) ? 'success'
    : ['FAILED', 'ESCALATED', 'REJECTED'].includes(status) ? 'error'
      : ['WAITING_FOR_APPROVAL', 'WAITING', 'PENDING', 'REPLANNING', 'RETRYING'].includes(status) ? 'warning'
        : ['RUNNING', 'EXECUTING', 'PLANNING', 'VERIFYING', 'WAITING_FOR_TOOL'].includes(status) ? 'info' : 'default';
  return <Chip size="small" label={label(status)} color={color} variant="outlined" />;
}
export function PageHeader({ eyebrow = 'OPERATIONS WORKSPACE', title, description, action }) {
  return <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} mb={3.5}>
    <Box><Typography className="eyebrow" color="primary" mb={1}>{eyebrow}</Typography><Typography variant="h3" component="h1">{title}</Typography>
      {description && <Typography color="text.secondary" mt={0.8}>{description}</Typography>}</Box>{action}
  </Stack>;
}
export function Panel({ title, subtitle, action, children, sx = {} }) {
  return <Paper variant="outlined" sx={{ overflow: 'hidden', ...sx }}>
    {(title || action) && <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} p={2.5} borderBottom="1px solid" borderColor="divider">
      <Box><Typography variant="h6">{title}</Typography>{subtitle && <Typography variant="body2" color="text.secondary" mt={0.4}>{subtitle}</Typography>}</Box>{action}
    </Stack>}{children}</Paper>;
}
export function EmptyState({ title, description, action, icon: Icon = Inbox }) {
  return <Stack alignItems="center" textAlign="center" spacing={1.5} py={7} px={3}>
    <Box sx={{ color: 'primary.main', bgcolor: 'primary.light', p: 1.5, borderRadius: 2 }}><Icon size={24} /></Box>
    <Typography variant="h5">{title}</Typography><Typography color="text.secondary" maxWidth={440}>{description}</Typography>{action}
  </Stack>;
}
export function ResourceState({ resource, children }) {
  if (resource.loading && !resource.data) return <Stack spacing={2} aria-label="Loading data"><Skeleton height={100} variant="rounded" /><Skeleton height={240} variant="rounded" /></Stack>;
  return <>{resource.error && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={resource.reload} startIcon={<RefreshCw size={14} />}>Retry</Button>}>
    {resource.error.message}{resource.data && ' — showing last received data.'}</Alert>}{resource.data ? children : null}</>;
}
export function MetricCard({ title, value, detail, icon: Icon }) {
  return <Paper variant="outlined" sx={{ p: 2.5 }}><Stack direction="row" alignItems="center" justifyContent="space-between">
    <Typography variant="body2" color="text.secondary">{title}</Typography><Icon size={19} color="#17695d" /></Stack>
    <Typography variant="h2" mt={1.5} mb={0.5}>{value}</Typography><Typography variant="body2" color="text.secondary">{detail}</Typography></Paper>;
}
export function JsonDetails({ title = 'Inspect evidence', data }) {
  return <Box component="details" className="json-details"><Typography component="summary" variant="body2">{title}</Typography><pre>{JSON.stringify(data, null, 2)}</pre></Box>;
}
export function TextLink({ to, children }) {
  return <Button component={Link} to={to} size="small" endIcon={<ArrowUpRight size={15} />}>{children}</Button>;
}
export function RateBar({ label: name, value }) {
  return <Box><Stack direction="row" justifyContent="space-between" mb={1}><Typography variant="body2">{name}</Typography><Typography variant="body2" fontWeight={700}>{value == null ? 'No observations' : `${value}%`}</Typography></Stack>
    <LinearProgress variant="determinate" value={value ?? 0} sx={{ height: 7, borderRadius: 1, bgcolor: '#edf1f4' }} /></Box>;
}
