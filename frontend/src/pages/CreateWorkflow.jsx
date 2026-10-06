import { useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader, Panel, ResourceState, EmptyState } from '../components/common';
import { useResource } from '../hooks/useResource';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
const example = 'Recover both urgent SENSOR-X1 orders within four days. Reserve available stock, compare supplier options, purchase only the shortfall within the budget, allocate incoming supply, verify fulfillment and publish an operations report.';
export default function CreateWorkflow() {
  const resource = useResource('/business'); const navigate = useNavigate(); const toast = useToast();
  const [goal, setGoal] = useState(example); const [budget, setBudget] = useState('1500'); const [deadline, setDeadline] = useState('4');
  const [selected, setSelected] = useState([]); const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const orders = resource.data?.business?.orders || [];
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const { task } = await api('/tasks', { method: 'POST', body: { goal,
        context: { orderIds: selected, maxBudget: Number(budget), deadlineDays: Number(deadline) } } });
      toast('Workflow created. Start live planning from the execution view.'); navigate(`/app/workflows/${task._id}`);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <><PageHeader title="Give operations a goal." description="Define the outcome. Agents determine the steps from current business context." /><ResourceState resource={resource}>
    {!resource.data?.business ? <Panel><EmptyState title="Business context is needed" description="Initialize inventory, orders and suppliers before creating a goal." action={<Button component={Link} to="/app/business">Set up business context</Button>} /></Panel> : <Box className="creation-grid"><Panel title="Workflow brief" subtitle="Natural language goal + authoritative execution constraints"><Box component="form" p={3} onSubmit={submit}><Stack spacing={3}>{error && <Alert severity="error">{error}</Alert>}
      <TextField label="Business goal" value={goal} onChange={e => setGoal(e.target.value)} multiline minRows={5} required slotProps={{ htmlInput: { minLength: 20, maxLength: 3000 } }} helperText="Describe the desired outcome and tradeoffs. The plan is generated when you start execution." />
      <Box><Typography variant="h6" mb={1}>Order scope</Typography><Typography variant="body2" color="text.secondary" mb={1}>Agents can act only on selected orders.</Typography>{orders.map(order => <Box key={order.id} className="order-option"><FormControlLabel control={<Checkbox checked={selected.includes(order.id)} onChange={e => setSelected(e.target.checked ? [...selected, order.id] : selected.filter(id => id !== order.id))} />} label={<Box><Typography variant="body2" fontWeight={650}>{order.id} · {order.customer}</Typography><Typography variant="caption" color="text.secondary">{order.quantity - order.allocated} outstanding / {order.quantity} units · {order.sku} · due in {order.dueDays} days</Typography></Box>} /></Box>)}</Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Maximum purchasing budget ($)" type="number" required value={budget} onChange={e => setBudget(e.target.value)} slotProps={{ htmlInput: { min: 0, max: 100000, step: '.01' } }} /><TextField label="Supply deadline (days)" type="number" required value={deadline} onChange={e => setDeadline(e.target.value)} slotProps={{ htmlInput: { min: 1, max: 90 } }} /></Stack>
      <Button type="submit" variant="contained" disabled={busy || !selected.length} endIcon={<ArrowRight size={17} />}>{busy ? 'Creating…' : 'Create workflow'}</Button></Stack></Box></Panel>
      <Stack spacing={3}><Panel title="How autonomy works"><Stack spacing={2} p={2.5}>{['Orchestrator builds a dynamic plan.', 'Specialists choose allowlisted tools.', 'Backend policy validates every action.', 'Observations can trigger a revised plan.', 'Independent verification gates success.'].map((text, index) => <Stack key={text} direction="row" gap={1.5}><Typography color="primary" fontWeight={700}>{String(index + 1).padStart(2, '0')}</Typography><Typography variant="body2" color="text.secondary">{text}</Typography></Stack>)}</Stack></Panel>
        <Panel><Box p={2.5}><ShieldCheck size={22} color="#17695d" /><Typography variant="h6" mt={1.5}>Your authority stays intact</Typography><Typography variant="body2" color="text.secondary" mt={1} lineHeight={1.8}>Purchases over $250 pause for an exact-action approval. Budget and deadline are enforced by code, independent of what the model says.</Typography><Typography variant="caption" display="block" color="text.secondary" mt={2}>This workspace commits sandbox purchase records and internal notifications. It does not send real supplier orders.</Typography></Box></Panel></Stack>
    </Box>}
  </ResourceState></>;
}
