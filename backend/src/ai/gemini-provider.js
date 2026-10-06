import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { classifyGeminiError } from './errors.js';
import { geminiJsonSchema } from './gemini-schema.js';

export class GeminiProvider {
  name = 'gemini';
  constructor({ apiKey = config.GEMINI_API_KEY, model = config.GEMINI_MODEL,
    requestIntervalMs = config.GEMINI_REQUEST_INTERVAL_MS, fetch: customFetch } = {}) {
    this.model = model;
    this.configured = Boolean(apiKey.trim());
    this.requestIntervalMs = requestIntervalMs;
    this.nextRequestAt = 0;
    this.client = this.configured ? new GoogleGenAI({ apiKey, httpOptions: {
      apiVersion: 'v1beta', timeout: 45000, retryOptions: { attempts: 1 },
      fetch: customFetch || globalThis.fetch,
    } }) : null;
  }
  async generate({ schema, system, data, correction }) {
    if (!this.client) throw new AppError('AI_NOT_CONFIGURED', 'Set GEMINI_API_KEY in the backend environment', 503);
    const waitMs = Math.max(0, this.nextRequestAt - Date.now());
    this.nextRequestAt = Math.max(Date.now(), this.nextRequestAt) + this.requestIntervalMs;
    // Genuine provider-rate pacing, not artificial execution progress.
    if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts: [{ text: JSON.stringify({ untrustedWorkflowData: data,
          validationCorrection: correction || null }) }] }],
        config: {
          systemInstruction: `${system}${correction ? `\nTRUSTED VALIDATOR CORRECTION: ${correction}` : ''}`, responseMimeType: 'application/json',
          responseJsonSchema: geminiJsonSchema(schema), maxOutputTokens: 8192,
          abortSignal: AbortSignal.timeout(45000),
          ...(this.model === 'gemini-2.5-flash' ? { thinkingConfig: { thinkingBudget: 0, includeThoughts: false } } : {}),
        },
      });
      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'MAX_TOKENS') throw new AppError('AI_INCOMPLETE', 'Gemini returned an incomplete structured response', 502, true);
      if (response.promptFeedback?.blockReason || !candidate || candidate.finishReason !== 'STOP') {
        throw new AppError('AI_REFUSAL', 'Gemini did not provide a permitted complete structured response', 502);
      }
      const text = candidate.content?.parts?.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('');
      if (!text) throw new AppError('AI_REFUSAL', 'Gemini returned no structured text output', 502);
      return JSON.parse(text);
    } catch (error) {
      if (error instanceof AppError || error instanceof SyntaxError) throw error;
      throw classifyGeminiError(error);
    }
  }
}
