import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { createAIProvider } from './ai/factory.js';
import { WorkflowEngine, recoverDecidedApprovals } from './workflows/engine.js';
import { createApp } from './app.js';

await connectDatabase();
await recoverDecidedApprovals();
const engine = new WorkflowEngine(createAIProvider());
const server = createApp(engine).listen(config.PORT, () => {
  console.info(`StockPilot API listening on port ${config.PORT}; provider ${engine.provider.name}; live AI ${engine.provider.configured ? 'configured' : 'needs backend provider key'}`);
});
engine.start();
let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close();
  await engine.stop();
  await disconnectDatabase();
  process.exit(0);
});
