import { Box, Stack, Typography } from '@mui/material';
import { CheckCircle2, CircleDot, AlertCircle, ShieldCheck, GitBranch } from 'lucide-react';
import { JsonDetails, EmptyState } from './common';
import { date, label } from '../utils/format';
export function EventTimeline({ events, compact = false }) {
  if (!events.length) return <EmptyState title="No events yet" description="Persisted workflow and account events will appear here." />;
  return <Box px={2.5}>{events.map(item => {
    const bad = /FAILED|INVALID|ESCALATED/.test(item.type);
    const Icon = bad ? AlertCircle : /APPROVAL|VERIFICATION/.test(item.type) ? ShieldCheck : /REPLAN|REVISED/.test(item.type) ? GitBranch : /COMPLETED/.test(item.type) ? CheckCircle2 : CircleDot;
    return <Stack direction="row" spacing={1.5} py={2} key={item._id} borderBottom="1px solid" borderColor="divider">
      <Box color={bad ? 'error.main' : 'primary.main'} pt={0.3}><Icon size={17} /></Box><Box flex={1} minWidth={0}>
        <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}><Typography variant="body2" fontWeight={600}>{label(item.type)}</Typography><Typography variant="caption" color="text.secondary">{date(item.createdAt)}</Typography></Stack>
        <Typography variant="body2" color="text.secondary" mt={0.4} sx={{ overflowWrap: 'anywhere' }}>{item.title}</Typography>
        {!compact && item.data && Object.keys(item.data).length > 0 && <JsonDetails data={item.data} />}</Box>
    </Stack>;
  })}</Box>;
}
