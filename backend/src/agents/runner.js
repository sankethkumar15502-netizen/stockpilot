import { AgentExecution } from '../models/index.js';
import { event } from '../services/events.js';
import { AppError, publicError } from '../utils/errors.js';
import { contracts, trustedRules, actionSchema, planSchema, verdictSchema } from './contracts.js';
import { z } from 'zod';
import { tools } from '../tools/registry.js';

export function actionSchemaForAgent(agent, memoryIds = []) {
  return actionSchema.extend({ tool: z.enum(contracts[agent].allowedTools),
    memoryUsed: memoryIds.length ? z.array(z.enum(memoryIds)).max(12) : z.array(z.string()).max(0),
  }).superRefine((output, ctx) => {
    const tool = tools[output.tool];
    const supplied = Object.entries(output.arguments).filter(([, value]) => value !== null);
    const parsed = tool.input.safeParse(Object.fromEntries(supplied));
    if (!parsed.success) for (const issue of parsed.error.issues) {
      ctx.addIssue({ ...issue, path: ['arguments', ...issue.path] });
    }
  });
}

export class AgentRunner {
  constructor(provider) { this.provider = provider; }
  async invoke(task, agent, schema, data, instructions, stepId = null) {
    let correction;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const started = Date.now();
      const record = await AgentExecution.create({ userId: task.userId, taskId: task._id, agent,
        stepId, revision: task.revision, attempt, status: 'RUNNING',
        input: { objective: data.step?.objective || task.goal, memoryIds: data.context?.memory?.map(m => String(m._id)) || [] },
        provider: this.provider.name, model: this.provider.model });
      await event(task.userId, task._id, 'AGENT_STARTED', `${agent} agent started`, { agent, stepId, attempt });
      try {
        const raw = await this.provider.generate({ schema, name: `${agent}_output`, data, correction,
          system: `${trustedRules}\nROLE CONTRACT: ${JSON.stringify(contracts[agent])}\n${instructions}` });
        const output = schema.parse(raw);
        await AgentExecution.updateOne({ _id: record._id }, { $set: { status: 'COMPLETED', output, durationMs: Date.now() - started } });
        await event(task.userId, task._id, 'AGENT_COMPLETED', `${agent} returned validated output`, { agent, stepId, attempt });
        return output;
      } catch (error) {
        const malformed = error.name === 'ZodError' || error instanceof SyntaxError;
        const sanitized = malformed ? { code: 'AI_OUTPUT_INVALID', message: 'Structured output failed schema validation' } : publicError(error);
        await AgentExecution.updateOne({ _id: record._id }, { $set: { status: 'FAILED', error: sanitized, durationMs: Date.now() - started } });
        await event(task.userId, task._id, malformed ? 'AI_OUTPUT_INVALID' : 'AGENT_FAILED', sanitized.message, { agent, attempt, ...sanitized });
        if (attempt === 3 || (!malformed && !error.retryable)) {
          throw new AppError(sanitized.code, sanitized.message, 502, false);
        }
        correction = malformed ? `Your previous response was invalid. Match every field and type in the supplied JSON schema exactly. Validation locations: ${(error.issues || []).slice(0, 8).map(issue => `${issue.path.join('.') || 'output'} (${issue.code})`).join(', ') || 'invalid JSON'}. Every required field in the chosen tool input must be non-null; only unused fields are null.`
          : 'Previous provider request failed. Retry using the same evidence.';
        await event(task.userId, task._id, 'AI_RETRY', 'Retrying structured agent invocation', { agent, attempt: attempt + 1 });
      }
    }
  }
  plan(task, context) {
    return this.invoke({ ...task, revision: task.revision + 1 }, 'orchestrator', planSchema, { goal: task.goal, constraints: task.context,
      context, previousPlans: task.planHistory, observations: task.observations, errors: task.workflowErrors },
    'Create a fresh, sequential plan based on actual remaining order deficit. Each step has a unique lowercase snake_case id and one specialist agent. Include research, analysis, at least one execution step if work remains, verification after all fulfillment actions, then communication. Decompose purchase and allocation into separate execution steps. On replanning, avoid repeating successful mutations; inspect current allocations. Plan up to 14 steps. Never omit verification or report.');
  }
  async act(task, step, context) {
    const definitions = contracts[step.agent].allowedTools.map(name => ({ name, purpose: tools[name].purpose,
      inputSchema: z.toJSONSchema(tools[name].input), outputSchema: z.toJSONSchema(tools[name].output) }));
    const memoryIds = context.memory.map(m => String(m._id));
    const output = await this.invoke(task, step.agent, actionSchemaForAgent(step.agent, memoryIds), { goal: task.goal, constraints: task.context,
      step, context, observations: task.observations.slice(-20), verification: task.verification || null },
    `TRUSTED TOOL CONTRACTS: ${JSON.stringify(definitions)}\nChoose exactly one allowed tool for this step. Every field required by its inputSchema must contain the specified value and type; only fields absent from that tool's schema are null. Select exact current IDs and versions. memoryUsed contains only IDs from context.memory; observations, step names and quote results are not long-term memory IDs. If no such records are used, return []. For allocation, use purchaseId from current purchases. A final report uses publish_report, whose message is the evidence-grounded report; notify_operations is a separate internal notice.`, step.id);
    if (!output.memoryUsed.every(id => memoryIds.includes(id))) throw new AppError('MEMORY_REFERENCE_INVALID', 'Agent cited a memory record not present in its context');
    return output;
  }
  verify(task, evidence) {
    return this.invoke(task, 'verification', verdictSchema, { goal: task.goal, constraints: task.context, evidence },
      'Independently evaluate actual fulfillment evidence. evidence.deadlineAt is the authoritative absolute UTC deadline anchored to taskStartedAt; compare scheduledArrivalAt directly to it. evidence.checks contains calculated allocation, budget and deadline results. Report only discrepancies grounded in the supplied records; do not invent stricter priority rules, earlier dates or physical-delivery requirements. This check concerns supply allocation and scheduling; the report is published afterward. passed can be true only if deterministic evidence.passed is true and the records support every check. Distinguish allocated/scheduled from physically delivered.', task.activeStep);
  }
}
