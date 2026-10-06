import { z } from 'zod';
import { BusinessState, Memory } from '../models/index.js';
import { mutateBusiness } from '../services/business.js';
import { assert } from '../utils/errors.js';

const sku = z.string().min(1).max(60);
const qty = z.number().int().positive().max(10000);
const ids = z.array(z.string().min(1).max(80)).min(1).max(20);
const money = v => Math.round(v * 100) / 100;
const dayMs = 86400000;
const deadlineAt = task => new Date(task.startedAt || task.createdAt).getTime() + task.context.deadlineDays * dayMs;
const remainingDeadline = task => Math.max(0, (deadlineAt(task) - Date.now()) / dayMs);
const scopedOrders = (draft, task, orderIds = task.context.orderIds) => {
  assert(new Set(orderIds).size === orderIds.length, 'DUPLICATE_ORDERS', 'Tool order IDs must be unique');
  assert(orderIds.every(id => task.context.orderIds.includes(id)), 'TOOL_SCOPE_DENIED', 'Tool order IDs are outside the workflow scope', 403);
  const orders = orderIds.map(id => draft.orders.find(o => o.id === id));
  assert(orders.every(o => o && o.sku === task.context.sku), 'INVALID_ORDER_SCOPE', 'Invalid order records');
  return orders;
};
const checkSku = (input, task) => assert(input.sku === task.context.sku, 'TOOL_SCOPE_DENIED', 'SKU is outside workflow scope', 403);
const deficit = orders => orders.reduce((sum, o) => sum + Math.max(0, o.quantity - o.allocated), 0);
export function validatePurchase(draft, task, input) {
  checkSku(input, task);
  const supplier = draft.suppliers.find(s => s.id === input.supplierId && s.sku === input.sku);
  assert(supplier, 'SUPPLIER_NOT_FOUND', 'Supplier quote not found');
  assert(supplier.version === input.expectedVersion, 'QUOTE_CHANGED', 'Supplier quote changed after planning or approval', 409);
  assert(supplier.available >= input.quantity, 'SUPPLIER_UNAVAILABLE', 'Supplier no longer has sufficient stock', 409);
  const totalCost = money(supplier.unitCost * input.quantity);
  const taskPurchases = draft.purchases.filter(p => p.taskId === String(task._id));
  const spent = taskPurchases.reduce((n, p) => n + p.totalCost, 0);
  assert(money(spent + totalCost) <= task.context.maxBudget, 'BUDGET_EXCEEDED', 'Purchase would exceed the authoritative workflow budget');
  assert(supplier.leadDays <= remainingDeadline(task), 'DEADLINE_EXCEEDED', 'Supply arrives after the configured deadline, including elapsed approval time');
  const outstanding = deficit(scopedOrders(draft, task));
  const unallocatedSupply = taskPurchases.reduce((n, p) => n + p.quantity - p.allocated, 0);
  const onHand = draft.inventory.find(i => i.sku === input.sku)?.available || 0;
  assert(input.quantity <= outstanding - unallocatedSupply - onHand, 'EXCESS_PURCHASE', 'Purchase exceeds demand not covered by on-hand or committed supply');
  return { supplier, totalCost, cumulativeSpend: money(spent + totalCost) };
}
const allocate = (orders, quantity, source, taskId, leadDays, scheduledArrivalAt = new Date(Date.now() + leadDays * dayMs).toISOString()) => {
  assert(quantity <= deficit(orders), 'EXCESS_ALLOCATION', 'Requested allocation exceeds outstanding demand');
  let remaining = quantity;
  for (const order of [...orders].sort((a, b) => a.dueDays - b.dueDays)) {
    const amount = Math.min(remaining, order.quantity - order.allocated);
    if (amount > 0) {
      order.allocated += amount;
      order.allocations ||= [];
      order.allocations.push({ quantity: amount, source, taskId, leadDays, scheduledArrivalAt });
      remaining -= amount;
    }
  }
  assert(remaining === 0, 'ALLOCATION_INCOMPLETE', 'Every reserved unit must map to an outstanding scoped order');
};
const dataArray = z.array(z.record(z.string(), z.unknown()));
export const tools = {
  inspect_business: {
    purpose: 'Read current scoped inventory, orders, supplier quotes and outcome memory',
    roles: ['research'], risk: 'LOW', keys: ['sku'], input: z.object({ sku }).strict(),
    output: z.object({ inventory: dataArray, orders: dataArray, suppliers: dataArray, purchases: dataArray,
      memory: dataArray, outstanding: z.number().int().min(0), businessVersion: z.number().int() }).strict(),
    async execute(input, ctx) {
      checkSku(input, ctx.task);
      const state = await BusinessState.findOne({ userId: ctx.task.userId }).lean();
      const memory = await Memory.find({ userId: ctx.task.userId, sku: input.sku }).sort({ createdAt: -1 }).limit(12).lean();
      const orders = scopedOrders(state, ctx.task);
      return { inventory: state.inventory.filter(i => i.sku === input.sku), orders,
        suppliers: state.suppliers.filter(s => s.sku === input.sku),
        purchases: state.purchases.filter(p => p.taskId === String(ctx.task._id)),
        memory: memory.map(m => ({ id: String(m._id), kind: m.kind, supplierId: m.supplierId, summary: m.summary })),
        outstanding: deficit(orders), businessVersion: state.version };
    },
  },
  compare_supply: {
    purpose: 'Calculate quote feasibility and apply evidence-based historical reliability penalty',
    roles: ['analysis'], risk: 'LOW', keys: ['sku', 'quantity'], input: z.object({ sku, quantity: qty }).strict(),
    output: z.object({ quantity: qty, remainingBudget: z.number(), remainingDeadlineDays: z.number(), quotes: dataArray, memoryApplied: z.array(z.string()) }).strict(),
    async execute(input, ctx) {
      checkSku(input, ctx.task);
      const state = await BusinessState.findOne({ userId: ctx.task.userId }).lean();
      const memory = await Memory.find({ userId: ctx.task.userId, sku: input.sku, kind: 'SUPPLIER_FAILURE' }).lean();
      const spent = state.purchases.filter(p => p.taskId === String(ctx.task._id)).reduce((n, p) => n + p.totalCost, 0);
      const remainingBudget = money(ctx.task.context.maxBudget - spent);
      const remainingDeadlineDays = remainingDeadline(ctx.task);
      return { quantity: input.quantity, remainingBudget, remainingDeadlineDays,
        quotes: state.suppliers.filter(s => s.sku === input.sku).map(s => {
          const failures = memory.filter(m => m.supplierId === s.id).length;
          const totalCost = money(s.unitCost * input.quantity);
          return { ...s, totalCost, feasible: s.available >= input.quantity && totalCost <= remainingBudget && s.leadDays <= remainingDeadlineDays,
            historicalFailures: failures, reliabilityPenalty: failures * 15, adjustedScore: money(totalCost + failures * 15) };
        }).sort((a, b) => Number(b.feasible) - Number(a.feasible) || a.adjustedScore - b.adjustedScore),
        memoryApplied: memory.map(m => String(m._id)) };
    },
  },
  reserve_inventory: {
    purpose: 'Atomically reserve stock and allocate it to scoped orders', roles: ['execution'], risk: 'LOW',
    keys: ['sku', 'quantity', 'orderIds'], input: z.object({ sku, quantity: qty, orderIds: ids }).strict(),
    output: z.object({ reserved: qty, sku, orderIds: ids, replayed: z.boolean().optional() }).strict(),
    execute(input, ctx) {
      checkSku(input, ctx.task);
      return mutateBusiness(ctx.task.userId, ctx.actionId, draft => {
        const item = draft.inventory.find(i => i.sku === input.sku);
        assert(item && item.available >= input.quantity, 'STOCK_CHANGED', 'On-hand inventory cannot satisfy the proposed reservation', 409);
        const orders = scopedOrders(draft, ctx.task, input.orderIds);
        allocate(orders, input.quantity, 'ON_HAND', String(ctx.task._id), 0);
        item.available -= input.quantity;
        return { reserved: input.quantity, sku: input.sku, orderIds: input.orderIds };
      });
    },
  },
  place_purchase: {
    purpose: 'Create an internal purchase commitment against a fresh quote within budget/deadline',
    roles: ['execution'], risk: 'DYNAMIC', keys: ['sku', 'supplierId', 'quantity', 'expectedVersion'],
    input: z.object({ sku, supplierId: z.string().min(1).max(60), quantity: qty, expectedVersion: z.number().int().positive() }).strict(),
    output: z.object({ purchaseId: z.string(), supplierId: z.string(), quantity: qty, totalCost: z.number().nonnegative(), leadDays: z.number(), replayed: z.boolean().optional() }).strict(),
    execute(input, ctx) {
      checkSku(input, ctx.task);
      return mutateBusiness(ctx.task.userId, ctx.actionId, draft => {
        const { supplier, totalCost, cumulativeSpend } = validatePurchase(draft, ctx.task, input);
        assert(cumulativeSpend <= 250 || ctx.approved, 'APPROVAL_REQUIRED', 'Cumulative workflow purchasing above $250 requires approval', 403);
        supplier.available -= input.quantity;
        supplier.version += 1;
        const purchaseId = `PO-${ctx.actionId}`;
        draft.purchases.push({ id: purchaseId, taskId: String(ctx.task._id), supplierId: supplier.id,
          sku: input.sku, quantity: input.quantity, allocated: 0, totalCost, leadDays: supplier.leadDays,
          status: 'COMMITTED', createdAt: new Date().toISOString() });
        return { purchaseId, supplierId: supplier.id, quantity: input.quantity, totalCost, leadDays: supplier.leadDays };
      });
    },
  },
  allocate_purchase: {
    purpose: 'Assign committed incoming supply to scoped orders', roles: ['execution'], risk: 'LOW',
    keys: ['purchaseId', 'quantity', 'orderIds'], input: z.object({ purchaseId: z.string().min(1).max(180), quantity: qty, orderIds: ids }).strict(),
    output: z.object({ purchaseId: z.string(), allocated: qty, orderIds: ids, replayed: z.boolean().optional() }).strict(),
    execute(input, ctx) {
      return mutateBusiness(ctx.task.userId, ctx.actionId, draft => {
        const purchase = draft.purchases.find(p => p.id === input.purchaseId && p.taskId === String(ctx.task._id));
        assert(purchase, 'PURCHASE_NOT_FOUND', 'Purchase is not owned by this workflow', 403);
        assert(purchase.quantity - purchase.allocated >= input.quantity, 'PURCHASE_EXHAUSTED', 'Purchase has insufficient unallocated supply');
        allocate(scopedOrders(draft, ctx.task, input.orderIds), input.quantity, purchase.id, String(ctx.task._id), purchase.leadDays,
          new Date(new Date(purchase.createdAt).getTime() + purchase.leadDays * dayMs).toISOString());
        purchase.allocated += input.quantity;
        return { purchaseId: purchase.id, allocated: input.quantity, orderIds: input.orderIds };
      });
    },
  },
  verify_fulfillment: {
    purpose: 'Check actual allocations, spend, incoming supply and deadline independently', roles: ['verification'], risk: 'LOW',
    keys: [], input: z.object({}).strict(),
    output: z.object({ passed: z.boolean(), orders: dataArray, spent: z.number(), budget: z.number(),
      deadlineDays: z.number(), taskStartedAt: z.iso.datetime(), deadlineAt: z.iso.datetime(), checkedAt: z.iso.datetime(),
      checks: z.object({ allOrdersAllocated: z.boolean(), withinBudget: z.boolean(), allPurchasesAllocated: z.boolean(),
        arrivalsMeetDeadline: z.boolean() }).strict(),
      outstanding: z.number(), discrepancies: z.array(z.string()), interpretation: z.string() }).strict(),
    async execute(_input, ctx) {
      const state = await BusinessState.findOne({ userId: ctx.task.userId }).lean();
      const orders = scopedOrders(state, ctx.task);
      const purchases = state.purchases.filter(p => p.taskId === String(ctx.task._id));
      const spent = money(purchases.reduce((sum, p) => sum + p.totalCost, 0));
      const discrepancies = [];
      const checks = {
        allOrdersAllocated: deficit(orders) === 0,
        withinBudget: spent <= ctx.task.context.maxBudget,
        allPurchasesAllocated: purchases.every(p => p.allocated === p.quantity),
        arrivalsMeetDeadline: orders.every(o => (o.allocations || []).every(a => a.scheduledArrivalAt
          && new Date(a.scheduledArrivalAt).getTime() <= deadlineAt(ctx.task))),
      };
      if (!checks.allOrdersAllocated) discrepancies.push('Some orders still have uncovered units');
      if (!checks.withinBudget) discrepancies.push('Budget exceeded');
      if (!checks.allPurchasesAllocated) discrepancies.push('Committed purchase contains unallocated supply');
      if (!checks.arrivalsMeetDeadline) discrepancies.push('Allocated supply misses deadline');
      return { passed: discrepancies.length === 0, orders, spent, budget: ctx.task.context.maxBudget,
        deadlineDays: ctx.task.context.deadlineDays, taskStartedAt: new Date(ctx.task.startedAt || ctx.task.createdAt).toISOString(),
        deadlineAt: new Date(deadlineAt(ctx.task)).toISOString(), checkedAt: new Date().toISOString(), checks,
        outstanding: deficit(orders), discrepancies,
        interpretation: 'Fulfillment means on-hand / scheduled supply allocated; incoming goods are not physically delivered.' };
    },
  },
  notify_operations: {
    purpose: 'Persist an internal operations notification (no external email)', roles: ['execution', 'communication'], risk: 'LOW',
    keys: ['message'], input: z.object({ message: z.string().min(1).max(5000) }).strict(),
    output: z.object({ notificationId: z.string(), channel: z.literal('IN_APP'), replayed: z.boolean().optional() }).strict(),
    execute(input, ctx) {
      return mutateBusiness(ctx.task.userId, ctx.actionId, draft => {
        const notificationId = `NOTE-${ctx.actionId}`;
        draft.notifications.push({ id: notificationId, taskId: String(ctx.task._id), message: input.message,
          channel: 'IN_APP', createdAt: new Date().toISOString() });
        return { notificationId, channel: 'IN_APP' };
      });
    },
  },
  publish_report: {
    purpose: 'Publish evidence-grounded final report after verified fulfillment', roles: ['communication'], risk: 'LOW',
    keys: ['message'], input: z.object({ message: z.string().min(20).max(5000) }).strict(),
    output: z.object({ reportId: z.string(), message: z.string(), replayed: z.boolean().optional() }).strict(),
    execute(input, ctx) {
      assert(ctx.task.verification?.passed, 'UNVERIFIED_REPORT', 'Cannot publish success before independent verification');
      return mutateBusiness(ctx.task.userId, ctx.actionId, draft => {
        const reportId = `REPORT-${ctx.actionId}`;
        draft.notifications.push({ id: reportId, taskId: String(ctx.task._id), message: input.message,
          channel: 'REPORT', createdAt: new Date().toISOString() });
        return { reportId, message: input.message };
      });
    },
  },
};

export const toolContracts = () => Object.entries(tools).map(([name, tool]) => ({
  name, purpose: tool.purpose, permissions: tool.roles, risk: tool.risk,
  inputSchema: z.toJSONSchema(tool.input), outputSchema: z.toJSONSchema(tool.output),
  failureBehavior: 'Persist failure; retry transient conflicts, replan business changes, escalate bounded exhaustion',
  executionLogging: 'ToolExecution and WorkflowEvent; BusinessState receipt for mutations',
}));
