import { useState } from 'react';
import { Button, Stack } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import { PageHeader, ResourceState, Panel } from '../components/common';
import { EventTimeline } from '../components/EventTimeline';
import { useResource } from '../hooks/useResource';
export default function Audit() {
  const [cursor, setCursor] = useState(''); const resource = useResource(`/audit${cursor ? `?cursor=${cursor}` : ''}`, cursor ? 0 : 5000);
  return <><PageHeader title="Audit trail" description="A chronological record of account actions, agent decisions, tool calls and approvals." action={<Button startIcon={<RefreshCw size={16} />} onClick={() => { setCursor(''); resource.reload(); }}>Latest events</Button>} /><Panel title="Persisted workflow events" subtitle="Newest first · up to 100 events per page"><ResourceState resource={resource}>{resource.data && <><EventTimeline events={resource.data.events} /><Stack direction="row" justifyContent="flex-end" p={2}>{resource.data.nextCursor && <Button variant="outlined" onClick={() => setCursor(resource.data.nextCursor)}>Older events</Button>}</Stack></>}</ResourceState></Panel></>;
}
