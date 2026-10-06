import { Router } from 'express';
import { Task, AgentExecution, ToolExecution, Approval, WorkflowEvent, terminalStates } from '../models/index.js';
import { createTaskSchema, idSchema } from '../validators/api.js';
import { validateScope } from '../services/business.js';
import { event } from '../services/events.js';
import { assert, AppError } from '../utils/errors.js';

export function taskRoutes(engine) {
  const router = Router();
  router.post('/', async (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const context = await validateScope(req.user._id, input.context);
    try {
      const task = await Task.create({ userId: req.user._id, goal: input.goal, context });
      await event(req.user._id, task._id, 'TASK_CREATED', 'Business goal submitted', { orderIds: context.orderIds, budget: context.maxBudget });
      res.status(201).json({ task });
    } catch (error) {
      if (error.code === 11000) throw new AppError('WORKFLOW_CONFLICT', 'Another active workflow already manages these orders', 409);
      throw error;
    }
  });
  router.get('/', async (req, res) => {
    const filter = { userId: req.user._id };
    if (req.query.cursor) filter._id = { $lt: idSchema.parse(req.query.cursor) };
    const tasks = await Task.find(filter).sort({ _id: -1 }).limit(50)
      .select('goal status context revision startedAt completedAt createdAt updatedAt').lean();
    res.json({ tasks, nextCursor: tasks.length === 50 ? tasks.at(-1)._id : null });
  });
  router.use('/:id', async (req, _res, next) => {
    const id = idSchema.parse(req.params.id);
    const task = await Task.findOne({ _id: id, userId: req.user._id }).lean();
    assert(task, 'TASK_NOT_FOUND', 'Workflow not found', 404);
    req.task = task;
    next();
  });
  router.get('/:id', async (req, res) => {
    const filter = { userId: req.user._id, taskId: req.task._id };
    const [agents, tools, approvals, events] = await Promise.all([
      AgentExecution.find(filter).sort({ createdAt: 1 }).limit(300).lean(),
      ToolExecution.find(filter).sort({ createdAt: 1 }).limit(300).lean(),
      Approval.find(filter).sort({ createdAt: 1 }).lean(),
      WorkflowEvent.find(filter).sort({ createdAt: 1 }).limit(1000).lean(),
    ]);
    res.json({ task: req.task, agents, tools, approvals, events });
  });
  router.post('/:id/start', async (req, res) => {
    assert(engine.provider.configured, 'AI_NOT_CONFIGURED', 'Configure GEMINI_API_KEY or OPENAI_API_KEY for the selected AI provider in backend/.env', 503);
    const task = await Task.findOneAndUpdate({ _id: req.task._id, userId: req.user._id, status: 'CREATED' },
      { $set: { status: 'PLANNING', startedAt: new Date() } }, { returnDocument: 'after' });
    assert(task, 'WORKFLOW_CONFLICT', 'Only a created workflow may be started', 409);
    await event(req.user._id, task._id, 'WORKFLOW_STARTED', 'Workflow queued for live agent planning');
    res.status(202).json({ task });
  });
  router.post('/:id/cancel', async (req, res) => {
    const task = await Task.findOneAndUpdate({ _id: req.task._id, userId: req.user._id,
      status: { $nin: terminalStates } }, { $set: { status: 'CANCELLED', completedAt: new Date() } }, { returnDocument: 'after' });
    assert(task, 'WORKFLOW_CONFLICT', 'Workflow is already terminal', 409);
    await Approval.updateMany({ taskId: task._id, userId: req.user._id, status: 'PENDING' }, { $set: { status: 'INVALIDATED' } });
    await event(req.user._id, task._id, 'WORKFLOW_CANCELLED', 'Future steps cancelled; committed ledger actions remain auditable');
    res.json({ task });
  });
  router.get('/:id/plan', (req, res) => res.json({ plan: req.task.plan, history: req.task.planHistory }));
  router.get('/:id/agents', async (req, res) => res.json({ agents: await AgentExecution.find({ userId: req.user._id, taskId: req.task._id }).sort({ createdAt: 1 }).lean() }));
  router.get('/:id/events', async (req, res) => {
    const filter = { userId: req.user._id, taskId: req.task._id };
    if (req.query.after) filter._id = { $gt: idSchema.parse(req.query.after) };
    res.json({ events: await WorkflowEvent.find(filter).sort({ _id: 1 }).limit(500).lean() });
  });
  return router;
}
