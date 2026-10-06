import mongoose from 'mongoose';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { config } from './env.js';
import { models } from '../models/index.js';

let localServer;
export async function connectDatabase() {
  let uri = config.MONGODB_URI;
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbPath = fileURLToPath(new URL('../../.local/mongo/', import.meta.url));
    await mkdir(dbPath, { recursive: true });
    localServer = await MongoMemoryServer.create({
      instance: { dbPath, storageEngine: 'wiredTiger', dbName: 'stockpilot' },
    });
    uri = localServer.getUri('stockpilot');
    console.info('Local development: actual MongoDB running with persistent .local/mongo storage');
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all(models.map(m => m.init()));
}
export async function disconnectDatabase() {
  await mongoose.disconnect();
  await localServer?.stop({ doCleanup: false });
}
