import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { config } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { classifyProviderError } from './errors.js';

export class OpenAIProvider {
  name = 'openai';
  model = config.OPENAI_MODEL;
  configured = Boolean(config.OPENAI_API_KEY);
  constructor() {
    this.client = this.configured ? new OpenAI({ apiKey: config.OPENAI_API_KEY, timeout: 45000, maxRetries: 0 }) : null;
  }
  async generate({ schema, name, system, data, correction }) {
    if (!this.client) throw new AppError('AI_NOT_CONFIGURED', 'Set OPENAI_API_KEY in the backend environment', 503);
    try {
      const response = await this.client.responses.create({
        model: this.model, store: false, max_output_tokens: 5000,
        input: [
          { role: 'system', content: `${system}${correction ? `\nTRUSTED VALIDATOR CORRECTION: ${correction}` : ''}` },
          { role: 'user', content: JSON.stringify({ untrustedWorkflowData: data, validationCorrection: correction || null }) },
        ], text: { format: zodTextFormat(schema, name) },
      });
      if (response.status !== 'completed') throw new AppError('AI_INCOMPLETE', 'Provider did not return a complete structured response', 502, true);
      if (!response.output_text) throw new AppError('AI_REFUSAL', 'Provider returned no structured output', 502);
      return JSON.parse(response.output_text);
    } catch (error) {
      if (error instanceof AppError || error instanceof SyntaxError) throw error;
      throw classifyProviderError(error);
    }
  }
}
