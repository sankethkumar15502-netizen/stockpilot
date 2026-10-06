import { useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Download, Play, StopCircle, RefreshCw, ShieldCheck, GitBranch } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { PageHeader, Panel, ResourceState, StatusBadge, JsonDetails, EmptyState } from '../components/common';
import { WorkflowPlan } from '../components/WorkflowPlan';
import { EventTimeline } from '../components/EventTimeline';
import { ApprovalCard } from '../components/ApprovalCard';
import { useResource } from '../hooks/useResource';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { currency, date, label } from '../utils/format';

export default function WorkflowDetail() {
  const { id } = useParams(); const resource = useResource(`/tasks/${id}`, 2000); const health = useResource('/health');
  const [tab, setTab] = useState(0); const [busy, setBusy] = useState(false); const [cancel, setCancel] = useState(false); const toast = useToast();
  const data = resource.data; const task = data?.task; const terminal = ['COMPLETED', 'CANCELLED', 'ESCALATED'].includes(task?.status);
  const act = async action => {
    setBusy(true);
    try { await api(`/tasks/${id}/${action}`, { method: 'POST', body: {} }); toast(action === 'start' ? (health.data?.provider === 'TEST_FIXTURE_NOT_AI' ? 'Queued for explicitly labeled test execution.' : 'Queued for live AI planning.') : 'Workflow cancelled.'); resource.reload(); setCancel(false); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const exportEvidence = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `stockpilot-evidence-${id}.json`; link.click(); URL.revokeObjectURL(url);
  };
  return <><PageHeader eyebrow="GOAL-TO-ACTION EXECUTION" title={terminal ? 'Workflow evidence' : 'Live workflow'} description="Every state, decision and result comes from the backend." action={<Stack direction="row" spacing={1}><Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={resource.reload} aria-label="Refresh workflow">Refresh</Button><Button variant="outlined" disabled={!data} startIcon={<Download size={16} />} onClick={exportEvidence}>Export evidence</Button></Stack>} />
    <ResourceState resource={resource}>{task && <><Panel sx={{ mb: 3 }}><Box p={3}><Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}><Stack direction="row" spacing={1}><StatusBadge status={task.status} /><Chip size="small" label={`Plan v${task.revision}`} variant="outlined" /></Stack>
      <Typography variant="caption" color="text.secondary">Last received {resource.updatedAt?.toLocaleTimeString()} · polling persisted state</Typography></Stack><Typography variant="h4" mt={2.5} lineHeight={1.6} sx={{ overflowWrap: 'anywhere' }}>{task.goal}</Typography>
      <Stack direction="row" gap={3} mt={2} flexWrap="wrap"><Typography variant="body2" color="text.secondary">Budget <strong>{currency(task.context.maxBudget)}</strong></Typography><Typography variant="body2" color="text.secondary">Deadline <strong>{task.context.deadlineDays} days</strong></Typography><Typography variant="body2" color="text.secondary">Scope <strong>{task.context.orderIds.join(' · ')}</strong></Typography><Typography variant="body2" color="text.secondary">Created {date(task.createdAt)}</Typography></Stack>
      <Stack direction="row" spacing={1} mt={2.5}>{task.status === 'CREATED' && <Button variant="contained" disabled={busy || !health.data?.aiConfigured} startIcon={<Play size={16} />} onClick={() => act('start')}>{busy ? 'Starting…' : health.data?.provider === 'TEST_FIXTURE_NOT_AI' ? 'Start test execution' : 'Start live execution'}</Button>}{!terminal && <Button color="error" disabled={busy} startIcon={<StopCircle size={16} />} onClick={() => setCancel(true)}>Cancel workflow</Button>}</Stack>
    </Box></Panel>
    {task.status === 'ESCALATED' && <Alert severity="error" sx={{ mb: 3 }}>Workflow requires human attention. {task.workflowErrors.at(-1)?.message || 'Review the failure evidence and committed business actions before creating a new goal.'}</Alert>}
    {task.status === 'WAITING_FOR_APPROVAL' && <Box className="approval-inline" mb={3}><Box><Alert severity="warning" sx={{ mb: 2 }}>Execution is paused for your approval. The proposed action is persisted and cannot execute before a decision.</Alert>{data.approvals.filter(a => a.status === 'PENDING').map(a => <ApprovalCard key={a._id} approval={a} onDecision={resource.reload} />)}</Box>
      {health.data?.demoControls && <Panel title="Replanning demonstration" subtitle="Explicitly change a real business condition"><Box p={2.5}><GitBranch size={25} color="#17695d" /><Typography variant="body2" color="text.secondary" lineHeight={1.8} mt={1.5}>Withdraw the quoted supplier’s available stock, then approve the existing request. The stale version will fail and the engine will request a revised plan.</Typography>
        <Button variant="outlined" fullWidth sx={{ mt: 2.5 }} disabled={busy} onClick={async () => {
          const pending = data.approvals.find(a => a.status === 'PENDING'); if (!pending) return;
          setBusy(true); try { await api('/business/disruption', { method: 'POST', body: { supplierId: pending.input.supplierId, available: 0 } }); toast('Supplier stock withdrawn in MongoDB. Approve the saved quote to exercise recovery.'); resource.reload(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
        }}>Withdraw quoted supplier stock</Button><Typography variant="caption" color="text.secondary" display="block" mt={1.5}>Demo control · no synthetic failure events</Typography></Box></Panel>}
    </Box>}
    <Box className="workflow-grid"><Box><Panel><Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Tab label="Execution plan" /><Tab label={`Tools (${data.tools.length})`} /><Tab label={`Agents (${data.agents.length})`} /><Tab label="History" /></Tabs>
      {tab === 0 && <WorkflowPlan task={task} />}
      {tab === 1 && (data.tools.length ? <Stack p={2.5} spacing={2}>{data.tools.map(tool => <Box className="execution-record" key={tool._id}><Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}><Typography variant="h6">{tool.tool}</Typography><StatusBadge status={tool.status} /></Stack><Typography variant="caption" color="text.secondary">{label(tool.agent)} · {tool.risk} risk · {date(tool.createdAt)} · {tool.durationMs ?? '—'}ms</Typography><JsonDetails title="Input / output / error" data={{ input: tool.input, output: tool.output, error: tool.error, actionId: tool.actionId }} /></Box>)}</Stack> : <EmptyState title="No tools executed yet" description="Tool records are created by the backend gateway when agents invoke real operations." />)}
      {tab === 2 && (data.agents.length ? <Stack p={2.5} spacing={2}>{data.agents.map(agent => <Box className="execution-record" key={agent._id}><Stack direction="row" alignItems="center" justifyContent="space-between"><Typography variant="h6">{label(agent.agent)} agent</Typography><StatusBadge status={agent.status} /></Stack><Typography variant="caption" color="text.secondary">{agent.provider} · {agent.model} · v{agent.revision} · attempt {agent.attempt} · {date(agent.createdAt)}</Typography><JsonDetails title="Validated output / failure" data={{ input: agent.input, output: agent.output, error: agent.error }} /></Box>)}</Stack> : <EmptyState title="Agents are ready" description="Each real model invocation will create its own execution record." />)}
      {tab === 3 && <Stack p={2.5} spacing={2}>{task.planHistory.map(plan => <Box className="execution-record" key={plan.revision}><Typography variant="h6">Plan revision {plan.revision}</Typography><Typography variant="body2" mt={1}>{plan.summary}</Typography><JsonDetails title="Delegated steps" data={plan.steps} /></Box>)}{task.workflowErrors.map((error, index) => <Alert key={index} severity="error"><strong>{error.code}</strong> · {error.message}<Typography variant="caption" display="block">Revision {error.revision} · {date(error.at)}</Typography></Alert>)}{!task.planHistory.length && <Typography color="text.secondary">No plan revisions yet.</Typography>}</Stack>}
    </Panel>
      {task.verification && <Panel title="Independent verification" action={<StatusBadge status={task.verification.passed ? 'COMPLETED' : 'FAILED'} />} sx={{ mt: 3 }}><Box p={2.5}><Stack direction="row" gap={1} alignItems="center"><ShieldCheck size={20} color="#17695d" /><Typography variant="body2">{task.verification.verdict?.explanation}</Typography></Stack><Typography variant="body2" color="text.secondary" mt={1}>{task.verification.interpretation}</Typography><JsonDetails title="Actual allocations and constraint checks" data={task.verification} /></Box></Panel>}
      {task.finalResult && <Panel title="Final operations report" sx={{ mt: 3 }}><Typography p={2.5} sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.9 }}>{task.finalResult.message}</Typography></Panel>}
    </Box><Panel title="Execution trail" subtitle={`${data.events.length} persisted events · newest first`} sx={{ maxHeight: 950, overflowY: 'auto' }}><EventTimeline events={[...data.events].reverse()} /></Panel></Box></>}</ResourceState>
    <Dialog open={cancel} onClose={() => !busy && setCancel(false)}><DialogTitle>Cancel future workflow steps?</DialogTitle><DialogContent><Typography color="text.secondary">Already committed allocations and purchases remain in the business ledger and audit history. An in-flight atomic action may finish.</Typography></DialogContent><DialogActions><Button onClick={() => setCancel(false)}>Keep running</Button><Button color="error" variant="contained" disabled={busy} onClick={() => act('cancel')}>Confirm cancellation</Button></DialogActions></Dialog>
  </>;
}
