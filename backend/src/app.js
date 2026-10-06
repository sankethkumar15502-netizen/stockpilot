import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { config } from './config/env.js';
import { authenticate } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { taskRoutes } from './routes/tasks.js';
import { approvalRoutes } from './routes/approvals.js';
import { BusinessState, Memory, WorkflowEvent } from './models/index.js';
import { initializeDemo, changeSupplier, importBusiness } from './services/business.js';
import { analytics } from './services/analytics.js';
import { contracts, actionSchema, planSchema, verdictSchema } from './agents/contracts.js';
import { toolContracts } from './tools/registry.js';
import { disruptionSchema, idSchema, businessImportSchema } from './validators/api.js';
import { assert, AppError, publicError } from './utils/errors.js';

export function createApp(engine, { limits = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (config.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use((req, res, next) => { req.requestId = randomUUID(); res.setHeader('X-Request-ID', req.requestId); next(); });
  app.use(helmet());
  app.use(cors({ origin(origin, callback) {
    callback(origin && origin !== config.FRONTEND_URL ? new AppError('ORIGIN_DENIED', 'Origin is not allowed', 403) : null, true);
  }, credentials: false }));
  app.use(express.json({ limit: '32kb' }));
  if (limits) {
    const handler = (req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests; try again later' }, requestId: req.requestId });
    app.use('/api', rateLimit({ windowMs: 900000, limit: 1000, standardHeaders: 'draft-8', legacyHeaders: false, handler }));
    app.use(['/api/auth/register', '/api/auth/login'], rateLimit({ windowMs: 900000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, handler }));
  }
  app.get('/api/health', (_req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    status: mongoose.connection.readyState === 1 ? 'ready' : 'not_ready', aiConfigured: engine.provider.configured,
    provider: engine.provider.name, model: engine.provider.model, demoControls: config.demoControls,
    executionMode: 'LIVE_AI', businessMode: 'SANDBOX_LEDGER',
  }));
  app.use('/api/auth', authRoutes);
  app.use('/api', authenticate);
  app.use('/api/tasks', taskRoutes(engine));
  app.use('/api/approvals', approvalRoutes);
  app.get('/api/analytics', async (req, res) => res.json(await analytics(req.user._id)));
  app.get('/api/audit', async (req, res) => {
    const filter = { userId: req.user._id };
    if (req.query.cursor) filter._id = { $lt: idSchema.parse(req.query.cursor) };
    const events = await WorkflowEvent.find(filter).sort({ _id: -1 }).limit(100).lean();
    res.json({ events, nextCursor: events.length === 100 ? events.at(-1)._id : null });
  });
  app.get('/api/business', async (req, res) => {
    const business = await BusinessState.findOne({ userId: req.user._id }).select('-receipts').lean();
    const memory = await Memory.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30).lean();
    res.json({ business, memory });
  });
  app.post('/api/business/initialize', async (req, res) => {
    z.object({}).strict().parse(req.body);
    const business = await initializeDemo(req.user._id);
    const safe = business.toObject();
    delete safe.receipts;
    res.status(201).json({ business: safe });
  });
  app.post('/api/business/import', async (req, res) => {
    const business = await importBusiness(req.user._id, businessImportSchema.parse(req.body));
    const safe = business.toObject(); delete safe.receipts;
    res.status(201).json({ business: safe });
  });
  app.post('/api/business/disruption', async (req, res) => {
    assert(config.demoControls, 'DEMO_DISABLED', 'Demo controls are disabled in this environment', 403);
    const input = disruptionSchema.parse(req.body);
    res.json(await changeSupplier(req.user._id, input.supplierId, input.available));
  });
  app.get('/api/contracts', (_req, res) => res.json({ agents: Object.entries(contracts).map(([name, contract]) => ({
    name, ...contract, validationSchema: z.toJSONSchema(name === 'orchestrator' ? planSchema : actionSchema),
    ...(name === 'verification' ? { verdictSchema: z.toJSONSchema(verdictSchema) } : {}),
  })), tools: toolContracts() }));
  app.use((_req, _res, next) => next(new AppError('NOT_FOUND', 'Endpoint not found', 404)));
  app.use((error, req, res, _next) => {
    const badJson = error.type === 'entity.parse.failed';
    const tooLarge = error.type === 'entity.too.large';
    const databaseUnavailable = /MongoNetwork|MongoServerSelection|MongoNotConnected/.test(error.name);
    const status = badJson ? 400 : tooLarge ? 413 : databaseUnavailable ? 503 : error.name === 'ZodError' ? 400 : error.status || 500;
    if (status >= 500) console.error('Request failed:', req.requestId, error.name, error.code || 'INTERNAL');
    res.status(status).json({ error: badJson ? { code: 'INVALID_JSON', message: 'Request body must be valid JSON' }
      : tooLarge ? { code: 'BODY_TOO_LARGE', message: 'Request exceeds the payload limit' }
      : databaseUnavailable ? { code: 'DATABASE_UNAVAILABLE', message: 'Database connectivity is temporarily unavailable' }
      : { ...publicError(error), ...(error.name === 'ZodError' ? { fields: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) } : {}) },
    requestId: req.requestId });
  });
  return app;
}
