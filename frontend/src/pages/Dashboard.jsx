import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { Activity, CheckCircle2, Plus, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useResource } from '../hooks/useResource';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Panel, MetricCard, ResourceState, TextLink, RateBar } from '../components/common';
import { WorkflowTable } from '../components/WorkflowTable';
import { EventTimeline } from '../components/EventTimeline';
import { percent, label } from '../utils/format';
export default function Dashboard() {
  const metrics = useResource('/analytics', 5000); const workflows = useResource('/tasks', 5000); const business = useResource('/business');
  const { user } = useAuth(); const m = metrics.data;
  return <><PageHeader title={`Good to see you, ${user.name.split(' ')[0]}.`} description="Your supply operations, decisions and outcomes in one place." action={<Button variant="contained" component={Link} to="/app/workflows/new" startIcon={<Plus size={17} />}>New workflow</Button>} />
    {business.data && !business.data.business && <Panel sx={{ mb: 3 }}><Stack direction={{ xs: 'column', sm: 'row' }} p={3} gap={2} alignItems={{ sm: 'center' }} justifyContent="space-between"><Box><Typography variant="h5">Set up your business context</Typography><Typography color="text.secondary" mt={0.5}>Create clearly labeled seed inventory, orders and suppliers. Execution history starts empty.</Typography></Box><Button component={Link} to="/app/business" variant="outlined" endIcon={<ArrowRight size={17} />}>Initialize workspace</Button></Stack></Panel>}
    <ResourceState resource={metrics}>{m && <><Box className="four-grid" mb={3}><MetricCard title="Active workflows" value={m.activeTasks} detail="Actual running & waiting tasks" icon={Activity} /><MetricCard title="Verified completions" value={m.completedTasks} detail="Independent outcome checks passed" icon={CheckCircle2} /><MetricCard title="Pending approvals" value={m.pendingApprovals} detail="Purchases awaiting your decision" icon={ShieldCheck} /><MetricCard title="Automation rate" value={percent(m.automationRate)} detail="Successful actions without high-risk approval" icon={Zap} /></Box>
      <Box className="dashboard-grid"><Box><Panel title="Workflow portfolio" subtitle="Current goals and their persisted execution states" action={<TextLink to="/app/workflows">View all</TextLink>}><ResourceState resource={workflows}>{workflows.data && <WorkflowTable tasks={workflows.data.tasks.slice(0, 6)} />}</ResourceState></Panel>
        <Panel title="Specialist agent activity" subtitle="Counts from actual AgentExecution records" sx={{ mt: 3 }}><Box className="three-grid" p={2.5} gap={2}>{m.agentActivity.map(a => <Box key={a.agent} sx={{ bgcolor: '#fafbfc', border: '1px solid #eef1f4', p: 2, borderRadius: 1.5 }}><Stack direction="row" justifyContent="space-between" mb={1.5}><Typography variant="body2" fontWeight={650}>{label(a.agent)}</Typography><Chip label={`${a.running} running`} size="small" /></Stack><Typography variant="body2" color="text.secondary">{a.completed} validated · {a.failed} failed</Typography></Box>)}</Box></Panel></Box>
      <Box><Panel title="Execution health"><Stack spacing={3} p={2.5}><RateBar label="Tool success rate" value={m.toolSuccessRate} /><RateBar label="Workflow success rate" value={m.workflowSuccessRate} /><RateBar label="Failure recovery rate" value={m.failureRecoveryRate} /><Typography variant="caption" color="text.secondary">No observations are shown as “—”, never invented percentages.</Typography></Stack></Panel>
        <Panel title="Recent activity" action={<TextLink to="/app/audit">Audit</TextLink>} sx={{ mt: 3 }}><EventTimeline compact events={m.recentEvents.slice(0, 5)} /></Panel></Box></Box></>}</ResourceState>
  </>;
}
