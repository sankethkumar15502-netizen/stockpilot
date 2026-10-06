import { config } from '../config/env.js';
import { OpenAIProvider } from './provider.js';
import { GeminiProvider } from './gemini-provider.js';

export function createAIProvider(provider = config.aiProvider) {
  if (provider === 'gemini') return new GeminiProvider();
  if (provider === 'openai') return new OpenAIProvider();
  throw new Error('Unsupported AI provider');
}
