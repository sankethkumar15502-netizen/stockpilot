import { Task, ToolExecution, Approval, AgentExecution, WorkflowEvent } from '../models/index.js';
const percent = (n, d) => d ? Math.round(n / d * 1000) / 10 : null;
export async function analytics(userId) {
  const [tasks, tools, approvals, agents, recentEvents] = await Promise.all([
    Task.find({ userId }).select('status revision workflowErrors retries startedAt completedAt').lean(),
    ToolExecution.find({ userId }).select('status risk actionId').lean(),
    Approval.find({ userId }).select('status').lean(),
    AgentExecution.find({ userId }).select('agent status durationMs').lean(),
    WorkflowEvent.find({ userId }).sort({ createdAt: -1 }).limit(8).lean(),
  ]);
  const completed = tasks.filter(t => t.status === 'COMPLETED');
  const successfulActions = [...new Map(tools.filter(t => t.status === 'COMPLETED').map(t => [t.actionId, t])).values()];
  const toolAttempts = tools.filter(t => ['COMPLETED', 'FAILED'].includes(t.status));
  const withFailures = tasks.filter(t => t.workflowErrors?.length);
  const decided = approvals.filter(a => ['APPROVED', 'REJECTED'].includes(a.status));
  const terminal = tasks.filter(t => ['COMPLETED', 'ESCALATED'].includes(t.status));
  const durations = completed.filter(t => t.startedAt && t.completedAt).map(t => new Date(t.completedAt) - new Date(t.startedAt));
  return {
    totalTasks: tasks.length, completedTasks: completed.length,
    activeTasks: tasks.filter(t => !['CREATED', 'COMPLETED', 'ESCALATED', 'CANCELLED'].includes(t.status)).length,
    pendingApprovals: approvals.filter(a => a.status === 'PENDING').length,
    replannedTasks: tasks.filter(t => t.revision > 1).length,
    automationRate: percent(successfulActions.filter(t => t.risk !== 'HIGH').length, successfulActions.length),
    humanInterventionRate: percent(successfulActions.filter(t => t.risk === 'HIGH').length, successfulActions.length),
    toolSuccessRate: percent(toolAttempts.filter(t => t.status === 'COMPLETED').length, toolAttempts.length),
    toolFailureRate: percent(toolAttempts.filter(t => t.status === 'FAILED').length, toolAttempts.length),
    workflowSuccessRate: percent(completed.length, terminal.length),
    approvalRate: percent(decided.filter(a => a.status === 'APPROVED').length, decided.length),
    failureRecoveryRate: percent(withFailures.filter(t => t.status === 'COMPLETED').length, withFailures.length),
    averageCompletionMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    toolAttempts: toolAttempts.length, uniqueSuccessfulActions: successfulActions.length, decidedApprovals: decided.length,
    agentActivity: ['orchestrator', 'research', 'analysis', 'execution', 'verification', 'communication'].map(agent => ({
      agent, completed: agents.filter(a => a.agent === agent && a.status === 'COMPLETED').length,
      failed: agents.filter(a => a.agent === agent && a.status === 'FAILED').length,
      running: agents.filter(a => a.agent === agent && a.status === 'RUNNING').length,
    })), recentEvents,
    definitions: {
      automationRate: 'Unique successful tool actions without HIGH-risk approval / all unique successful tool actions',
      toolSuccessRate: 'Completed tool attempts / completed plus failed tool attempts',
      workflowSuccessRate: 'Completed workflows / completed plus escalated workflows (cancelled excluded)',
      failureRecoveryRate: 'Completed workflows with engine errors / all workflows with engine errors',
      averageCompletionMs: 'Wall-clock duration from start to completion, including approval wait',
    },
  };
}
