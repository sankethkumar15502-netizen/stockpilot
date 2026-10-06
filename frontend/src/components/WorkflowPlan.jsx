import { Box, Chip, Stack, Typography } from '@mui/material';
import { CheckCircle2, Circle, AlertCircle, PauseCircle, CircleDot } from 'lucide-react';
import { StatusBadge, JsonDetails, EmptyState } from './common';
import { label } from '../utils/format';
export function WorkflowPlan({ task }) {
  if (!task.plan.length) return <EmptyState title={task.status === 'CREATED' ? 'Ready for live planning' : 'Planning in progress'} description={task.status === 'CREATED' ? 'Start the workflow to ask the orchestrator for a plan based on your goal and current records.' : 'The current backend state will update when the validated model plan is persisted.'} />;
  return <Box p={2.5}><Typography variant="body2" color="text.secondary" mb={3}>{task.planHistory.at(-1)?.summary}</Typography>{task.plan.map((step, index) => {
    const Icon = step.status === 'COMPLETED' ? CheckCircle2 : step.status === 'FAILED' ? AlertCircle : step.status === 'WAITING' ? PauseCircle : step.status === 'RUNNING' ? CircleDot : Circle;
    return <Stack className="plan-step" direction="row" spacing={2} key={`${task.revision}:${step.id}`}><Box className={`step-marker ${step.status.toLowerCase()}`}><Icon size={19} /></Box>
      <Box flex={1} minWidth={0} pb={3}><Stack direction="row" alignItems="center" gap={1} flexWrap="wrap"><Typography variant="h6">{String(index + 1).padStart(2, '0')} · {label(step.agent)} agent</Typography><StatusBadge status={step.status} /><Chip label={`${step.attempts} attempt${step.attempts === 1 ? '' : 's'}`} size="small" /></Stack>
        <Typography variant="body2" mt={1} color="text.secondary">{step.objective}</Typography>
        {step.proposal && <Box sx={{ bgcolor: '#f8faf9', borderLeft: '2px solid #78a89a', p: 1.5, mt: 1.5 }}><Typography variant="caption" fontWeight={700} color="primary">TOOL DECISION · {step.proposal.tool}</Typography><Typography variant="body2" mt={0.5}>{step.proposal.rationale}</Typography></Box>}
        {step.result && <JsonDetails title="Inspect actual tool result" data={step.result} />}
      </Box></Stack>;
  })}</Box>;
}
