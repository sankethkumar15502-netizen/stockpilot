import { Button } from '@mui/material';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader, Panel, ResourceState } from '../components/common';
import { WorkflowTable } from '../components/WorkflowTable';
import { useResource } from '../hooks/useResource';
export default function Workflows() {
  const resource = useResource('/tasks', 4000);
  return <><PageHeader title="Workflow portfolio" description="Business goals, live execution and verified history." action={<Button component={Link} to="/app/workflows/new" variant="contained" startIcon={<Plus size={17} />}>New workflow</Button>} /><Panel title="Your workflows" subtitle="Most recent 50 workflows"><ResourceState resource={resource}>{resource.data && <WorkflowTable tasks={resource.data.tasks} />}</ResourceState></Panel></>;
}
