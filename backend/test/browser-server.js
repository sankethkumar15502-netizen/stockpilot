// Playwright-only server. Not imported by the production entry point.
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { FixtureProvider } from './fixture-provider.js';
import { WorkflowEngine } from '../src/workflows/engine.js';
import { createApp } from '../src/app.js';
import { models } from '../src/models/index.js';
const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri('browser-tests'));
await Promise.all(models.map(m => m.init()));
const engine = new WorkflowEngine(new FixtureProvider());
const server = createApp(engine, { limits: false }).listen(4001);
engine.start();
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => {
  server.close(); await engine.stop(); await mongoose.disconnect(); await mongo.stop(); process.exit(0);
});
