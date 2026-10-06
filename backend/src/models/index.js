import mongoose from 'mongoose';
const { Schema } = mongoose;
const owner = { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true };
const taskRef = { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true };
const options = { timestamps: true, minimize: false };
const model = (name, definition, indexes = []) => {
  const schema = new Schema(definition, options);
  for (const [fields, opts] of indexes) schema.index(fields, opts);
  return mongoose.model(name, schema);
};

export const User = model('User', {
  name: { type: String, required: true }, email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  tokenVersion: { type: Number, default: 0 },
});
export const states = ['CREATED', 'PLANNING', 'PLANNED', 'EXECUTING', 'WAITING_FOR_TOOL',
  'WAITING_FOR_APPROVAL', 'VERIFYING', 'ANALYZING_FAILURE', 'RETRYING', 'REPLANNING',
  'COMPLETED', 'ESCALATED', 'CANCELLED'];
export const terminalStates = ['COMPLETED', 'ESCALATED', 'CANCELLED'];
const stepSchema = new Schema({
  id: String, agent: String, objective: String,
  status: { type: String, default: 'PENDING' }, proposal: Schema.Types.Mixed,
  result: Schema.Types.Mixed, attempts: { type: Number, default: 0 },
}, { _id: false });
export const Task = model('Task', {
  userId: owner, goal: { type: String, required: true }, context: Schema.Types.Mixed,
  status: { type: String, enum: states, default: 'CREATED', index: true },
  plan: { type: [stepSchema], default: [] }, planHistory: { type: [Schema.Types.Mixed], default: [] },
  revision: { type: Number, default: 0 }, completedSteps: { type: [String], default: [] },
  activeStep: String, agentOutputs: { type: [Schema.Types.Mixed], default: [] },
  observations: { type: [Schema.Types.Mixed], default: [] }, workflowErrors: { type: [Schema.Types.Mixed], default: [] },
  retries: { type: Number, default: 0 }, finalResult: Schema.Types.Mixed,
  verification: Schema.Types.Mixed, pendingApprovalId: Schema.Types.ObjectId,
  leaseOwner: String, leaseUntil: Date, startedAt: Date, completedAt: Date,
}, [[{ userId: 1, createdAt: -1 }, {}], [{ userId: 1, 'context.orderIds': 1 }, {
  unique: true, partialFilterExpression: { status: { $in: states.filter(s => !terminalStates.includes(s)) } },
}]]);
export const AgentExecution = model('AgentExecution', {
  userId: owner, taskId: taskRef, agent: String, stepId: String, revision: Number,
  attempt: Number, status: String, input: Schema.Types.Mixed, output: Schema.Types.Mixed,
  error: Schema.Types.Mixed, durationMs: Number, provider: String, model: String,
}, [[{ userId: 1, taskId: 1, createdAt: 1 }, {}]]);
export const ToolExecution = model('ToolExecution', {
  userId: owner, taskId: taskRef, agent: String, stepId: String, actionId: String,
  tool: String, input: Schema.Types.Mixed, output: Schema.Types.Mixed, risk: String,
  status: String, error: Schema.Types.Mixed, durationMs: Number,
}, [[{ userId: 1, taskId: 1, createdAt: 1 }, {}]]);
export const Approval = model('Approval', {
  userId: owner, taskId: taskRef, actionId: { type: String, required: true, unique: true },
  stepId: String, revision: Number, tool: String, input: Schema.Types.Mixed, actionHash: String,
  reason: String, amount: Number, risk: String, status: { type: String, default: 'PENDING' },
  decisionReason: String, decidedAt: Date,
}, [[{ userId: 1, status: 1, createdAt: -1 }, {}]]);
export const WorkflowEvent = model('WorkflowEvent', {
  userId: owner, taskId: { type: Schema.Types.ObjectId, ref: 'Task', index: true },
  type: String, title: String, data: Schema.Types.Mixed,
}, [[{ userId: 1, createdAt: -1 }, {}]]);
export const BusinessState = model('BusinessState', {
  userId: { ...owner, unique: true }, version: { type: Number, default: 0 },
  seeded: { type: Boolean, default: false }, inventory: { type: [Schema.Types.Mixed], default: [] },
  orders: { type: [Schema.Types.Mixed], default: [] }, suppliers: { type: [Schema.Types.Mixed], default: [] },
  purchases: { type: [Schema.Types.Mixed], default: [] }, notifications: { type: [Schema.Types.Mixed], default: [] },
  receipts: { type: [Schema.Types.Mixed], default: [] },
});
export const Memory = model('Memory', {
  userId: owner, taskId: taskRef, sku: String, supplierId: String, kind: String,
  summary: String, evidence: Schema.Types.Mixed,
}, [[{ userId: 1, sku: 1, createdAt: -1 }, {}], [{ taskId: 1, kind: 1, supplierId: 1 }, { unique: true }]]);

export const models = [User, Task, AgentExecution, ToolExecution, Approval, WorkflowEvent, BusinessState, Memory];
