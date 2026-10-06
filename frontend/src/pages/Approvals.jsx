import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { ShieldCheck } from 'lucide-react';
import { PageHeader, ResourceState, EmptyState, Panel } from '../components/common';
import { ApprovalCard } from '../components/ApprovalCard';
import { useResource } from '../hooks/useResource';
export default function Approvals() {
  const resource = useResource('/approvals', 3000); const [history, setHistory] = useState(0);
  const approvals = resource.data?.approvals.filter(a => history ? a.status !== 'PENDING' : a.status === 'PENDING') || [];
  return <><PageHeader title="Approval center" description="Review high-impact proposals. Your decision is bound to the exact tool request." /><Tabs value={history} onChange={(_, v) => setHistory(v)} sx={{ mb: 3 }}><Tab label="Pending decisions" /><Tab label="Decision history" /></Tabs>
    <ResourceState resource={resource}>{approvals.length ? <Box className="two-grid">{approvals.map(a => <ApprovalCard key={a._id} approval={a} onDecision={resource.reload} />)}</Box> : <Panel><EmptyState icon={ShieldCheck} title={history ? 'No decisions recorded yet' : 'No pending approvals'} description={history ? 'Your persisted approval and rejection records will appear here.' : 'Agents will pause here when a purchase crosses the high-risk threshold.'} /></Panel>}</ResourceState></>;
}
