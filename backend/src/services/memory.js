import { Memory } from '../models/index.js';
import { event } from './events.js';

export async function rememberFailure(task, proposal, error) {
  if (!proposal?.arguments?.supplierId || !['QUOTE_CHANGED', 'SUPPLIER_UNAVAILABLE'].includes(error.code)) return;
  const supplierId = proposal.arguments.supplierId;
  await Memory.findOneAndUpdate({ taskId: task._id, kind: 'SUPPLIER_FAILURE', supplierId }, { $setOnInsert: {
    userId: task.userId, taskId: task._id, sku: task.context.sku, supplierId, kind: 'SUPPLIER_FAILURE',
    summary: `Supplier ${supplierId} failed a proposed purchase: ${error.code}. Treat quote freshness and reliability as decision factors.`,
    evidence: { code: error.code, revision: task.revision },
  } }, { upsert: true });
  await event(task.userId, task._id, 'MEMORY_STORED', 'Evidence-based supplier failure memory saved', { supplierId });
}
export async function rememberOutcome(task) {
  await Memory.findOneAndUpdate({ taskId: task._id, kind: 'VERIFIED_OUTCOME', supplierId: 'WORKFLOW' }, { $setOnInsert: {
    userId: task.userId, taskId: task._id, sku: task.context.sku, supplierId: 'WORKFLOW', kind: 'VERIFIED_OUTCOME',
    summary: `Verified allocations for ${task.context.orderIds.join(', ')} with spend $${task.verification.spent}; ${task.revision - 1} replans.`,
    evidence: task.verification,
  } }, { upsert: true });
}
