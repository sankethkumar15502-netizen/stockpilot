import { BusinessState, Task, Memory } from '../models/index.js';
import { assert, AppError } from '../utils/errors.js';
import { event } from './events.js';

export async function initializeDemo(userId) {
  const existing = await BusinessState.findOne({ userId });
  if (existing) return existing;
  const state = await BusinessState.findOneAndUpdate({ userId }, { $setOnInsert: {
    seeded: true, version: 0,
    inventory: [{ sku: 'SENSOR-X1', name: 'Industrial sensor module', available: 8 }],
    orders: [
      { id: 'ORD-1001', customer: 'Northstar Robotics', sku: 'SENSOR-X1', quantity: 18, allocated: 0, dueDays: 4, priority: 'URGENT' },
      { id: 'ORD-1002', customer: 'Meridian Manufacturing', sku: 'SENSOR-X1', quantity: 12, allocated: 0, dueDays: 5, priority: 'HIGH' },
    ],
    suppliers: [
      { id: 'SUP-A', name: 'Atlas Components', sku: 'SENSOR-X1', available: 50, unitCost: 30, leadDays: 2, version: 1, note: 'Preferred regional supplier' },
      { id: 'SUP-B', name: 'Beacon Industrial', sku: 'SENSOR-X1', available: 80, unitCost: 36, leadDays: 3, version: 1, note: 'Backup supplier with expedited delivery' },
      { id: 'SUP-C', name: 'Cedar Supply', sku: 'SENSOR-X1', available: 100, unitCost: 22, leadDays: 9, version: 1, note: 'Economy supplier; longer lead time' },
    ], purchases: [], notifications: [], receipts: [],
  } }, { upsert: true, returnDocument: 'after' });
  await event(userId, null, 'DEMO_INITIALIZED', 'Seed business records created; no execution history seeded');
  return state;
}

export async function getContext(task) {
  const business = await BusinessState.findOne({ userId: task.userId }).lean();
  assert(business, 'NO_BUSINESS_CONTEXT', 'Initialize business data before starting a workflow');
  const memory = await Memory.find({ userId: task.userId, sku: task.context.sku }).sort({ createdAt: -1 }).limit(12).lean();
  return { business: {
    version: business.version,
    inventory: business.inventory.filter(i => i.sku === task.context.sku),
    orders: business.orders.filter(o => task.context.orderIds.includes(o.id)),
    suppliers: business.suppliers.filter(s => s.sku === task.context.sku),
    purchases: business.purchases.filter(p => p.taskId === String(task._id)),
  }, memory: memory.map(m => ({ _id: String(m._id), kind: m.kind, supplierId: m.supplierId, summary: m.summary })), constraints: task.context };
}

// A single atomic document write covers inventory, supplier stock, orders and receipt.
export async function mutateBusiness(userId, actionId, change) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await BusinessState.findOne({ userId }).lean();
    assert(current, 'NO_BUSINESS_CONTEXT', 'Business records are missing');
    const receipt = current.receipts.find(r => r.actionId === actionId);
    if (receipt) return { ...receipt.result, replayed: true };
    const draft = structuredClone(current);
    const result = await change(draft);
    draft.receipts.push({ actionId, result, at: new Date().toISOString() });
    const updated = await BusinessState.findOneAndUpdate({ userId, version: current.version }, { $set: {
      inventory: draft.inventory, orders: draft.orders, suppliers: draft.suppliers,
      purchases: draft.purchases, notifications: draft.notifications, receipts: draft.receipts,
    }, $inc: { version: 1 } }, { returnDocument: 'after' });
    if (updated) return result;
  }
  throw new AppError('BUSINESS_CONFLICT', 'Concurrent changes require a retry', 409, true);
}

export async function changeSupplier(userId, supplierId, available) {
  const result = await mutateBusiness(userId, `disruption:${crypto.randomUUID()}`, draft => {
    const supplier = draft.suppliers.find(s => s.id === supplierId);
    assert(supplier, 'SUPPLIER_NOT_FOUND', 'Supplier not found', 404);
    supplier.available = available;
    supplier.version += 1;
    return { supplierId, available, version: supplier.version };
  });
  await event(userId, null, 'BUSINESS_CHANGED', 'Supplier availability changed through explicit demo control', result);
  return result;
}

export async function validateScope(userId, context) {
  const business = await BusinessState.findOne({ userId }).lean();
  assert(business, 'NO_BUSINESS_CONTEXT', 'Initialize the demo business data first');
  assert(new Set(context.orderIds).size === context.orderIds.length, 'DUPLICATE_ORDERS', 'Choose each order once');
  const orders = context.orderIds.map(id => business.orders.find(o => o.id === id));
  assert(orders.every(Boolean), 'INVALID_ORDER_SCOPE', 'All orders must belong to your workspace');
  assert(new Set(orders.map(o => o.sku)).size === 1, 'MIXED_SKU_SCOPE', 'This version supports one SKU per workflow');
  const active = await Task.exists({ userId, 'context.orderIds': { $in: context.orderIds },
    status: { $nin: ['COMPLETED', 'ESCALATED', 'CANCELLED'] } });
  assert(!active, 'WORKFLOW_CONFLICT', 'An active workflow already manages these orders', 409);
  return { ...context, sku: orders[0].sku };
}

export async function importBusiness(userId, input) {
  for (const [collection, key] of [['inventory', 'sku'], ['orders', 'id'], ['suppliers', 'id']]) {
    assert(new Set(input[collection].map(item => item[key])).size === input[collection].length,
      'DUPLICATE_BUSINESS_ID', `Duplicate ${key} in ${collection}`);
  }
  const skus = input.inventory.map(item => item.sku);
  assert([...input.orders, ...input.suppliers].every(item => skus.includes(item.sku)),
    'INVALID_SKU_REFERENCE', 'Order and supplier SKUs must exist in inventory');
  assert(!await BusinessState.exists({ userId }), 'BUSINESS_ALREADY_EXISTS', 'Import is only available for an uninitialized workspace', 409);
  try {
    const business = await BusinessState.create({ userId, seeded: false,
      inventory: input.inventory, orders: input.orders.map(o => ({ ...o, allocated: 0 })),
      suppliers: input.suppliers.map(s => ({ ...s, unitCost: Math.round(s.unitCost * 100) / 100, version: 1 })),
      purchases: [], notifications: [], receipts: [],
    });
    await event(userId, null, 'BUSINESS_IMPORTED', 'User-supplied business records imported with no execution history');
    return business;
  } catch (error) {
    if (error.code === 11000) throw new AppError('BUSINESS_ALREADY_EXISTS', 'Another request initialized this workspace', 409);
    throw error;
  }
}
