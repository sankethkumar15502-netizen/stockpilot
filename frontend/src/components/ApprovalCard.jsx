import { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { Check, X, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Panel, StatusBadge, JsonDetails } from './common';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { currency, date } from '../utils/format';
export function ApprovalCard({ approval, onDecision }) {
  const [decision, setDecision] = useState(null); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const toast = useToast();
  const act = async () => {
    setBusy(true);
    try {
      await api(`/approvals/${approval._id}/${decision}`, { method: 'POST', body: { reason } });
      toast(decision === 'approve' ? 'Exact purchase approved. Workflow will resume.' : 'Purchase rejected. A revised plan will be requested.');
      setDecision(null); onDecision?.();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return <Panel><Box p={2.5}><Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Stack direction="row" spacing={1} alignItems="center"><ShieldCheck size={18} color="#a9691e" /><Typography variant="h6">Purchase commitment</Typography></Stack><StatusBadge status={approval.status} /></Stack>
    <Typography variant="h2">{currency(approval.amount)}</Typography><Typography variant="body2" color="text.secondary" mt={1}>{approval.input.quantity} units · {approval.input.sku} · {approval.input.supplierId} · quote v{approval.input.expectedVersion}</Typography>
    <Typography variant="body2" mt={2} lineHeight={1.8}>{approval.reason}</Typography><Typography variant="caption" display="block" color="text.secondary" mt={1.5}>{date(approval.createdAt)} · High risk · sandbox purchase ledger</Typography>
    <JsonDetails title="Exact approved action & binding" data={{ tool: approval.tool, input: approval.input, actionHash: approval.actionHash }} />
    <Stack direction="row" mt={2.5} gap={1} flexWrap="wrap">{approval.status === 'PENDING' && <><Button variant="contained" startIcon={<Check size={16} />} onClick={() => setDecision('approve')}>Approve purchase</Button><Button variant="outlined" color="error" startIcon={<X size={16} />} onClick={() => setDecision('reject')}>Reject</Button></>}
      <Button component={Link} to={`/app/workflows/${approval.taskId}`}>View workflow</Button></Stack>
    {approval.decisionReason && <Typography variant="body2" color="text.secondary" mt={2}>Decision note: {approval.decisionReason}</Typography>}
  </Box><Dialog open={Boolean(decision)} onClose={() => !busy && setDecision(null)} fullWidth maxWidth="sm"><DialogTitle>{decision === 'approve' ? 'Approve this exact purchase?' : 'Reject this purchase?'}</DialogTitle><DialogContent><Typography color="text.secondary" mb={3}>{decision === 'approve' ? `Authorize ${currency(approval.amount)} for ${approval.input.quantity} units from ${approval.input.supplierId}. Quote freshness and budget will be rechecked before execution.` : 'The workflow will replan from your feedback and current records.'}</Typography><TextField label="Decision note (optional)" value={reason} onChange={e => setReason(e.target.value)} multiline rows={2} slotProps={{ htmlInput: { maxLength: 500 } }} /></DialogContent><DialogActions><Button onClick={() => setDecision(null)} disabled={busy}>Back</Button><Button variant="contained" color={decision === 'reject' ? 'error' : 'primary'} disabled={busy} onClick={act}>{busy ? 'Saving decision…' : 'Confirm decision'}</Button></DialogActions></Dialog></Panel>;
}
