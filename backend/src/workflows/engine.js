import { randomUUID } from 'node:crypto';
import { Task, Approval, AgentExecution, ToolExecution, terminalStates } from '../models/index.js';
import { AgentRunner } from '../agents/runner.js';
import { ToolGateway } from '../tools/gateway.js';
import { getContext } from '../services/business.js';
import { rememberFailure, rememberOutcome } from '../services/memory.js';
import { event } from '../services/events.js';
import { assert, AppError, publicError } from '../utils/errors.js';
import { validateTransition } from './state-machine.js';
import { nonRecoverableAIErrorCodes } from '../ai/errors.js';

export const runnableStates = ['PLANNING', 'PLANNED', 'EXECUTING', 'WAITING_FOR_TOOL', 'VERIFYING',
  'ANALYZING_FAILURE', 'RETRYING', 'REPLANNING'];

export class WorkflowEngine {
  constructor(provider) {
    this.agents = new AgentRunner(provider);
    this.tools = new ToolGateway();
    this.provider = provider;
    this.workerId = randomUUID();
    this.busy = false;
    this.stopping = false;
  }
  async patch(task, updates) {
    const result = await Task.findOneAndUpdate({ _id: task._id, leaseOwner: this.workerId,
      status: { $nin: terminalStates } }, { $set: updates }, { returnDocument: 'after' }).lean();
    if (!result) throw new AppError('TASK_STOPPED', 'Workflow stopped or lease lost', 409);
    return result;
  }
  async state(task, status, updates = {}) {
    validateTransition(task.status, status);
    const next = await this.patch(task, { ...updates, status });
    if (task.status !== status) await event(task.userId, task._id, 'STATE_CHANGED', `Workflow → ${status}`, { from: task.status, to: status });
    return next;
  }
  async claim(taskId) {
    const filter = { status: { $in: runnableStates }, $or: [{ leaseUntil: { $lt: new Date() } }, { leaseUntil: null }] };
    if (taskId) filter._id = taskId;
    return Task.findOneAndUpdate(filter, { $set: { leaseOwner: this.workerId,
      leaseUntil: new Date(Date.now() + 120000) } }, { returnDocument: 'after', sort: { updatedAt: 1 } }).lean();
  }
  async tick(taskId) {
    if (this.busy || this.stopping) return false;
    this.busy = true;
    let task;
    let heartbeat;
    try {
      await recoverDecidedApprovals();
      task = await this.claim(taskId);
      if (!task) return false;
      const interruptedAgents = await AgentExecution.updateMany({ taskId: task._id, status: 'RUNNING' },
        { $set: { status: 'INTERRUPTED', error: { code: 'WORKER_INTERRUPTED', message: 'Prior invocation lost its worker; resumed from durable state' } } });
      const interruptedTools = await ToolExecution.updateMany({ taskId: task._id, status: 'RUNNING' },
        { $set: { status: 'INTERRUPTED', error: { code: 'WORKER_INTERRUPTED', message: 'Prior call lost its worker; mutation receipts prevent duplicate effects' } } });
      if (interruptedAgents.modifiedCount || interruptedTools.modifiedCount) await event(task.userId, task._id,
        'WORKER_RECOVERED', 'Interrupted executions reconciled after lease recovery', {
          agents: interruptedAgents.modifiedCount, tools: interruptedTools.modifiedCount,
        });
      heartbeat = setInterval(() => {
        Task.updateOne({ _id: task._id, leaseOwner: this.workerId }, { $set: { leaseUntil: new Date(Date.now() + 120000) } })
          .catch(() => {});
      }, 10000);
      await this.advance(task);
      return true;
    } catch (error) {
      if (task && !['TASK_STOPPED', 'LEASE_LOST'].includes(error.code)) {
        await this.recover(task._id, error).catch(e => console.error('Recovery persistence failed:', e.name));
      } else if (!task) console.error('Worker could not claim task:', error.name);
      return Boolean(task);
    } finally {
      clearInterval(heartbeat);
      if (task) await Task.updateOne({ _id: task._id, leaseOwner: this.workerId }, { $unset: { leaseOwner: 1, leaseUntil: 1 } }).catch(() => {});
      this.busy = false;
    }
  }
  async advance(task) {
    if (task.status === 'ANALYZING_FAILURE') {
      task = await this.state(task, 'REPLANNING');
    }
    if (['PLANNING', 'REPLANNING'].includes(task.status)) {
      assert(task.revision < 4, 'REPLAN_LIMIT', 'Maximum plan revisions reached');
      const context = await getContext(task);
      const plan = await this.agents.plan(task, context);
      assert(new Set(plan.steps.map(s => s.id)).size === plan.steps.length, 'PLAN_INVALID', 'Plan contains duplicate step IDs');
      const verifyIndex = plan.steps.findIndex(s => s.agent === 'verification');
      assert(verifyIndex >= 0 && plan.steps.some(s => s.agent === 'research') && plan.steps.some(s => s.agent === 'analysis'),
        'PLAN_INVALID', 'Plan must delegate research, analysis and independent verification');
      assert(plan.steps.at(-1).agent === 'communication' &&
        !plan.steps.slice(verifyIndex + 1).some(s => s.agent === 'execution'), 'PLAN_INVALID', 'Verification must follow execution and precede the final report');
      const revision = task.revision + 1;
      const steps = plan.steps.map(s => ({ ...s, status: 'PENDING', attempts: 0 }));
      await this.state(task, 'PLANNED', { revision, plan: steps,
        planHistory: [...task.planHistory, { revision, summary: plan.summary, steps: plan.steps, createdAt: new Date() }],
        activeStep: null, verification: null, finalResult: null, pendingApprovalId: null });
      await event(task.userId, task._id, revision > 1 ? 'PLAN_REVISED' : 'PLAN_CREATED', plan.summary, { revision, steps: plan.steps });
      return;
    }
    if (task.status === 'PLANNED' || task.status === 'RETRYING') task = await this.state(task, 'EXECUTING');
    const index = task.plan.findIndex(s => s.status !== 'COMPLETED');
    if (index < 0) {
      // Do a fresh deterministic read even if the last planned verification passed.
      const evidence = await this.toolsFreshVerification(task);
      await event(task.userId, task._id, 'COMPLETION_INVARIANT_CHECKED', 'Fresh internal completion check read the business ledger', evidence);
      assert(task.verification?.passed && evidence.passed && task.finalResult?.reportId,
        'INCOMPLETE_OUTCOME', 'Completion requires fresh fulfillment verification and a persisted report');
      await rememberOutcome({ ...task, verification: evidence });
      await this.state(task, 'COMPLETED', { completedAt: new Date(), activeStep: null, verification: { ...task.verification, ...evidence } });
      await event(task.userId, task._id, 'WORKFLOW_COMPLETED', 'Verified fulfillment plan completed; incoming supply is scheduled', { spent: evidence.spent });
      return;
    }
    let step = task.plan[index];
    const plan = structuredClone(task.plan);
    plan[index].status = 'RUNNING';
    plan[index].attempts += 1;
    task = await this.state(task, step.agent === 'verification' ? 'VERIFYING' : 'EXECUTING', { activeStep: step.id, plan });
    step = task.plan[index];
    let proposal = step.proposal;
    if (!proposal) {
      proposal = await this.agents.act(task, step, await getContext(task));
      const updatedPlan = structuredClone(task.plan);
      updatedPlan[index].proposal = proposal;
      task = await this.patch(task, { plan: updatedPlan, agentOutputs: [...task.agentOutputs,
        { agent: step.agent, stepId: step.id, revision: task.revision, output: proposal }] });
      await event(task.userId, task._id, 'DECISION_RECORDED', proposal.rationale, {
        agent: step.agent, tool: proposal.tool, memoryUsed: proposal.memoryUsed, stepId: step.id,
      });
    }
    task = await this.state(task, 'WAITING_FOR_TOOL');
    const outcome = await this.tools.execute(task, step, proposal, this.workerId);
    if (outcome.waiting) {
      const waitingPlan = structuredClone(task.plan);
      waitingPlan[index].status = 'WAITING';
      await this.state(task, 'WAITING_FOR_APPROVAL', { plan: waitingPlan, pendingApprovalId: outcome.approvalId });
      return;
    }
    let verification = task.verification;
    if (proposal.tool === 'verify_fulfillment') {
      task = await this.state(task, 'VERIFYING');
      const verdict = await this.agents.verify(task, outcome.result);
      verification = { ...outcome.result, verdict, passed: outcome.result.passed && verdict.passed };
      await event(task.userId, task._id, 'VERIFICATION_RECORDED', verdict.explanation, verification);
      assert(verification.passed, 'VERIFICATION_FAILED', 'Independent fulfillment verification did not pass', 409);
    }
    const donePlan = structuredClone(task.plan);
    donePlan[index].status = 'COMPLETED';
    donePlan[index].result = outcome.result;
    const updates = { plan: donePlan, verification, pendingApprovalId: null,
      completedSteps: [...new Set([...task.completedSteps, `r${task.revision}:${step.id}`])],
      observations: [...task.observations, { stepId: step.id, revision: task.revision, tool: proposal.tool, result: outcome.result }],
    };
    if (proposal.tool === 'publish_report') updates.finalResult = outcome.result;
    await this.state(task, 'EXECUTING', updates);
  }
  async toolsFreshVerification(task) {
    const { tools } = await import('../tools/registry.js');
    return tools.verify_fulfillment.output.parse(await tools.verify_fulfillment.execute({}, { task }));
  }
  async recover(taskId, error) {
    let task = await Task.findOne({ _id: taskId, leaseOwner: this.workerId }).lean();
    if (!task || terminalStates.includes(task.status)) return;
    const safe = publicError(error);
    const failedIndex = task.plan.findIndex(s => s.id === task.activeStep);
    const plan = structuredClone(task.plan);
    if (failedIndex >= 0) plan[failedIndex].status = 'FAILED';
    const failure = { ...safe, stepId: task.activeStep, revision: task.revision, at: new Date() };
    task = await this.state(task, 'ANALYZING_FAILURE', {
      plan, workflowErrors: [...task.workflowErrors, failure], observations: [...task.observations, { failure }],
    });
    await rememberFailure(task, failedIndex >= 0 ? plan[failedIndex].proposal : null, error);
    if (error.retryable && task.retries < 2) {
      if (failedIndex >= 0) plan[failedIndex].status = 'PENDING';
      await this.state(task, 'RETRYING', { plan, retries: task.retries + 1 });
      await event(task.userId, task._id, 'WORKFLOW_RETRY', 'Retrying a transient failure with the same idempotent action', safe);
    } else if (task.revision < 4 && task.workflowErrors.length < 6 && !nonRecoverableAIErrorCodes.has(safe.code)) {
      await this.state(task, 'REPLANNING');
      await event(task.userId, task._id, 'REPLAN_REQUESTED', 'Failure observation requires a new plan', safe);
    } else {
      await this.state(task, 'ESCALATED', { completedAt: new Date(), activeStep: null });
      await event(task.userId, task._id, 'WORKFLOW_ESCALATED', nonRecoverableAIErrorCodes.has(safe.code)
        ? 'AI account or configuration requires human attention; stopped without further retries'
        : 'Recovery limits exhausted; human operations review required', safe);
    }
  }
  start() {
    this.timer = setInterval(() => this.tick(), 750);
    this.timer.unref();
  }
  async stop() {
    this.stopping = true;
    clearInterval(this.timer);
    while (this.busy) await new Promise(resolve => setTimeout(resolve, 25));
  }
}

export async function resumeApprovedTask(approval) {
  return Task.findOneAndUpdate({ _id: approval.taskId, userId: approval.userId,
    status: 'WAITING_FOR_APPROVAL', pendingApprovalId: approval._id }, { $set: {
    status: approval.status === 'APPROVED' ? 'EXECUTING' : 'REPLANNING', pendingApprovalId: null,
  }, $push: { observations: { approvalId: String(approval._id), actionId: approval.actionId,
    decision: approval.status, reason: approval.decisionReason } } }, { returnDocument: 'after' });
}

export async function recoverDecidedApprovals() {
  const waiting = await Task.find({ status: 'WAITING_FOR_APPROVAL' }).select('pendingApprovalId');
  for (const task of waiting) {
    const approval = await Approval.findById(task.pendingApprovalId);
    if (approval && ['APPROVED', 'REJECTED'].includes(approval.status)) await resumeApprovedTask(approval);
  }
}
