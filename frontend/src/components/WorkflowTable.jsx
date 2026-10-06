import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { StatusBadge, EmptyState, TextLink } from './common';
import { date, currency } from '../utils/format';
export function WorkflowTable({ tasks }) {
  if (!tasks.length) return <EmptyState title="Your first workflow starts here" description="Give the agents a business goal. Every decision and action will appear here as it happens." action={<TextLink to="/app/workflows/new">Create a workflow</TextLink>} />;
  return <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Workflow / goal</TableCell><TableCell>Status</TableCell><TableCell>Budget</TableCell><TableCell>Plan</TableCell><TableCell>Created</TableCell></TableRow></TableHead>
    <TableBody>{tasks.map(task => <TableRow key={task._id} hover><TableCell sx={{ minWidth: 250, maxWidth: 400 }}>
      <Typography component={Link} to={`/app/workflows/${task._id}`} className="workflow-link" variant="body2" fontWeight={650}>{task.goal}</Typography>
      <Typography variant="caption" color="text.secondary">{task.context.orderIds.join(' · ')}</Typography></TableCell>
      <TableCell><StatusBadge status={task.status} /></TableCell><TableCell>{currency(task.context.maxBudget)}</TableCell><TableCell>{task.revision ? `v${task.revision}` : 'Not planned'}</TableCell><TableCell sx={{ whiteSpace: 'nowrap' }}>{date(task.createdAt)}</TableCell>
    </TableRow>)}</TableBody></Table></TableContainer>;
}
