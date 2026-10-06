import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Uses the real API, real provider, real persisted approvals and actual tools.
// Explicit CLI consent approves purchases only in the newly created sandbox account.
if (!process.argv.includes('--approve-sandbox')) {
  console.error('Run with --approve-sandbox to explicitly authorize purchases in this isolated smoke-test sandbox account.');
  process.exit(1);
}
const base = (process.env.SMOKE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
let token;
async function call(path, body) {
  const response = await fetch(`${base}${path}`, { method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${data.error?.code}: ${data.error?.message}`);
  return data;
}
const health = await call('/health');
if (!health.aiConfigured || !['openai', 'gemini'].includes(health.provider) || !health.demoControls) {
  throw new Error('A real configured OpenAI or Gemini provider and explicit demo controls are required. No fixture fallback exists.');
}
const auth = await call('/auth/register', { name: 'Live verification operator', email: `live-${crypto.randomUUID()}@example.com`,
  password: `${crypto.randomUUID()}-${crypto.randomUUID()}`.slice(0, 64) });
token = auth.token;
await call('/business/initialize', {});
const { task } = await call('/tasks', { goal: 'Fulfill both urgent SENSOR-X1 orders within four days. Reserve available inventory, compare feasible suppliers, purchase only the shortfall, allocate incoming supply, independently verify allocations and budget, and publish a report.',
  context: { orderIds: ['ORD-1001', 'ORD-1002'], maxBudget: 1500, deadlineDays: 4 } });
await call(`/tasks/${task._id}/start`, {});
let disrupted = false;
let lastState;
const expires = Date.now() + 300000;
while (Date.now() < expires) {
  const detail = await call(`/tasks/${task._id}`);
  const state = detail.task.status;
  if (state !== lastState) { console.info(`Actual state: ${state}; plan revision: ${detail.task.revision}`); lastState = state; }
  if (state === 'WAITING_FOR_APPROVAL') {
    const approval = detail.approvals.find(a => a.status === 'PENDING');
    if (!approval) throw new Error('Missing durable approval');
    if (!disrupted) {
      await call('/business/disruption', { supplierId: approval.input.supplierId, available: 0 });
      disrupted = true;
      console.info('Explicit disruption changed supplier availability in MongoDB.');
    }
    await call(`/approvals/${approval._id}/approve`, { reason: 'Explicit --approve-sandbox consent for live integration verification' });
  }
  if (['COMPLETED', 'ESCALATED', 'CANCELLED'].includes(state)) {
    const directory = fileURLToPath(new URL('../.local/', import.meta.url));
    await mkdir(directory, { recursive: true });
    const output = `${directory}live-evidence-${task._id}.json`;
    await writeFile(output, JSON.stringify({ provenance: `LIVE_${health.provider.toUpperCase()}_API`, health, detail, analytics: await call('/analytics') }, null, 2), { flag: 'wx' });
    console.info(`Evidence saved: ${output}`);
    if (state !== 'COMPLETED' || detail.task.revision < 2 || !detail.task.verification?.passed) {
      const failure = detail.task.workflowErrors.at(-1);
      await call('/auth/logout', {});
      throw new Error(failure ? `Live acceptance stopped (${failure.code}): ${failure.message}`
        : 'Live acceptance requires completion, a changed plan revision and passing verification; inspect saved evidence');
    }
    console.info('Live planning, actual tool effects, approval, business-change recovery, replanning and verification passed.');
    await call('/auth/logout', {});
    process.exit(0);
  }
  await new Promise(resolve => setTimeout(resolve, 1500)); // API polling, never artificial execution progress.
}
throw new Error('Live workflow exceeded the five-minute verification window; inspect the API task history');
