import { z } from 'zod';
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80), email: z.email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(12).max(72).refine(v => Buffer.byteLength(v) <= 72, 'Password must fit bcrypt byte limit'),
}).strict();
export const loginSchema = z.object({
  email: z.email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(1).max(72).refine(v => Buffer.byteLength(v) <= 72, 'Password must fit bcrypt byte limit'),
}).strict();
export const createTaskSchema = z.object({
  goal: z.string().trim().min(20).max(3000),
  context: z.object({
    orderIds: z.array(z.string().regex(/^ORD-[A-Z0-9-]+$/)).min(1).max(20),
    maxBudget: z.number().min(0).max(100000), deadlineDays: z.number().int().min(1).max(90),
  }).strict(),
}).strict();
export const approvalDecisionSchema = z.object({ reason: z.string().trim().max(500).default('') }).strict();
export const disruptionSchema = z.object({ supplierId: z.string().max(60), available: z.number().int().min(0).max(10000) }).strict();
export const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
export const businessImportSchema = z.object({
  inventory: z.array(z.object({ sku: z.string().regex(/^[A-Z0-9-]{1,60}$/), name: z.string().trim().min(1).max(100),
    available: z.number().int().min(0).max(100000) }).strict()).min(1).max(50),
  orders: z.array(z.object({ id: z.string().regex(/^ORD-[A-Z0-9-]+$/).max(80), customer: z.string().trim().min(1).max(100),
    sku: z.string().max(60), quantity: z.number().int().positive().max(10000), dueDays: z.number().int().positive().max(90),
    priority: z.enum(['URGENT', 'HIGH', 'NORMAL']) }).strict()).min(1).max(50),
  suppliers: z.array(z.object({ id: z.string().regex(/^SUP-[A-Z0-9-]+$/).max(60), name: z.string().trim().min(1).max(100),
    sku: z.string().max(60), available: z.number().int().min(0).max(100000),
    unitCost: z.number().positive().max(100000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Unit cost must use at most two decimal places'),
    leadDays: z.number().int().positive().max(90), note: z.string().max(500).default('') }).strict()).min(1).max(50),
}).strict();
