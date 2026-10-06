import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  FRONTEND_URL: z.url().default('http://localhost:5173'),
  MONGODB_URI: z.string().default(''),
  JWT_SECRET: z.string().default(''),
  AI_PROVIDER: z.enum(['auto', 'openai', 'gemini']).default('auto'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().regex(/^gemini-[a-zA-Z0-9.-]+$/).default('gemini-3.5-flash-lite'),
  GEMINI_REQUEST_INTERVAL_MS: z.coerce.number().int().min(0).max(60000).default(12000),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
  ENABLE_DEMO_CONTROLS: z.enum(['true', 'false']).optional(),
});
export const config = schema.parse(process.env);
config.aiProvider = config.AI_PROVIDER === 'auto'
  ? (config.GEMINI_API_KEY.trim() ? 'gemini' : 'openai') : config.AI_PROVIDER;
config.aiKeyConfigured = Boolean((config.aiProvider === 'gemini' ? config.GEMINI_API_KEY : config.OPENAI_API_KEY).trim());
if (config.NODE_ENV === 'production') {
  for (const name of ['MONGODB_URI', config.aiProvider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY']) {
    if (!config[name]) throw new Error(`${name} is required in production`);
  }
  if (config.JWT_SECRET.length < 48) throw new Error('JWT_SECRET must be at least 48 characters');
  if (!config.FRONTEND_URL.startsWith('https://')) throw new Error('Production FRONTEND_URL must use HTTPS');
}
config.JWT_SECRET ||= randomBytes(48).toString('hex');
config.demoControls = config.ENABLE_DEMO_CONTROLS === 'true' ||
  (config.NODE_ENV !== 'production' && config.ENABLE_DEMO_CONTROLS !== 'false');
