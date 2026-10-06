import { createHash } from 'node:crypto';
import { tools, validatePurchase } from './registry.js';
import { Approval, BusinessState, Task, ToolExecution, terminalStates } from '../models/index.js';
import { event } from '../services/events.js';
import { assert, AppError, publicError } from '../utils/errors.js';

export const actionIdFor = (task, step) => `${task._id}-r${task.revision}-${step.id}`;
export const hashAction = (tool, input) => createHash('sha256').update(JSON.stringify({ tool, input })).digest('hex');

export class ToolGateway {
  async execute(task, step, proposal, leaseOwner) {
    const started = Date.now();
    const actionId = actionIdFor(task, step);
    let record;
    try {
      assert(Object.hasOwn(tools, proposal.tool), 'UNKNOWN_TOOL', 'Tool is not allowlisted', 403);
      const tool = tools[proposal.tool];
      assert(tool.roles.includes(step.agent), 'TOOL_PERMISSION_DENIED', 'Agent role is not permitted to call this tool', 403);
      // Ignore unused null fields, but reject supplied values that the selected tool does not accept.
      const supplied = Object.entries(proposal.arguments).filter(([, value]) => value !== null);
      assert(supplied.every(([key]) => tool.keys.includes(key)), 'TOOL_INPUT_INVALID', 'Tool contains unauthorized parameter fields');
      const input = tool.input.parse(Object.fromEntries(supplied));
      const live = await Task.findOne({ _id: task._id, userId: task.userId }).lean();
      assert(live && !terminalStates.includes(live.status), 'TASK_STOPPED', 'Workflow is no longer executable', 409);
      assert(!leaseOwner || (live.leaseOwner === leaseOwner && live.leaseUntil > new Date()), 'LEASE_LOST', 'Worker lease was lost', 409);
      let amount = 0;
      let risk = tool.risk;
      if (proposal.tool === 'place_purchase') {
        const business = await BusinessState.findOne({ userId: task.userId }).lean();
        // A committed receipt must be replayable even though its quote/deficit changed.
        const receipt = business.receipts.find(r => r.actionId === actionId);
        if (receipt) {
          amount = receipt.result.totalCost;
          const previous = await Approval.findOne({ userId: task.userId, actionId });
          risk = previous ? 'HIGH' : 'MEDIUM';
        } else {
          const quote = validatePurchase(business, live, input);
          amount = quote.totalCost;
          risk = quote.cumulativeSpend > 250 ? 'HIGH' : 'MEDIUM';
        }
        const rejected = await Approval.exists({ userId: task.userId, taskId: task._id,
          tool: proposal.tool, actionHash: hashAction(proposal.tool, input), status: 'REJECTED' });
        assert(!rejected, 'REJECTED_ACTION_REPEATED', 'A revised plan cannot repeat the exact purchase rejected by a human', 409);
      }
      let approval = await Approval.findOne({ userId: task.userId, actionId });
      if (risk === 'HIGH') {
        if (!approval) {
          approval = await Approval.findOneAndUpdate({ actionId }, { $setOnInsert: {
            userId: task.userId, taskId: task._id, actionId, stepId: step.id, revision: task.revision,
            tool: proposal.tool, input, actionHash: hashAction(proposal.tool, input),
            risk, amount, reason: proposal.rationale, status: 'PENDING',
          } }, { upsert: true, returnDocument: 'after' });
          await event(task.userId, task._id, 'APPROVAL_REQUESTED', 'High-risk purchase requires a human decision', {
            approvalId: String(approval._id), actionId, amount, risk,
          });
        }
        assert(approval.actionHash === hashAction(proposal.tool, input), 'APPROVAL_MISMATCH', 'Approval is not valid for this exact action', 403);
        assert(approval.status !== 'REJECTED', 'APPROVAL_REJECTED', 'Human rejected this purchase proposal', 409);
        if (approval.status === 'PENDING') return { waiting: true, approvalId: approval._id };
        assert(approval.status === 'APPROVED', 'APPROVAL_INVALID', 'Approval was invalidated', 409);
      }
      record = await ToolExecution.create({ userId: task.userId, taskId: task._id, stepId: step.id,
        actionId, agent: step.agent, tool: proposal.tool, input, risk, status: 'RUNNING' });
      await event(task.userId, task._id, 'TOOL_STARTED', `${proposal.tool} started`, { tool: proposal.tool, stepId: step.id, actionId, risk });
      const result = tool.output.parse(await tool.execute(input, { task: live, actionId, approved: approval?.status === 'APPROVED' }));
      await ToolExecution.updateOne({ _id: record._id }, { $set: { status: 'COMPLETED', output: result, durationMs: Date.now() - started } });
      await event(task.userId, task._id, 'TOOL_COMPLETED', `${proposal.tool} completed`, { tool: proposal.tool, stepId: step.id, actionId, replayed: Boolean(result.replayed) });
      return { result, tool: proposal.tool };
    } catch (error) {
      const safe = error.name === 'ZodError' ? { code: 'TOOL_INPUT_INVALID', message: 'Tool parameters or result failed validation' } : publicError(error);
      if (record) await ToolExecution.updateOne({ _id: record._id }, { $set: { status: 'FAILED', error: safe, durationMs: Date.now() - started } });
      else await ToolExecution.create({ userId: task.userId, taskId: task._id, stepId: step.id, actionId,
        agent: step.agent, tool: proposal.tool, risk: 'UNKNOWN', status: 'FAILED', error: safe, durationMs: Date.now() - started });
      await event(task.userId, task._id, 'TOOL_FAILED', safe.message, { ...safe, tool: proposal.tool, stepId: step.id });
      if (error instanceof AppError) throw error;
      throw new AppError(safe.code, safe.message, 400, false);
    }
  }
}
