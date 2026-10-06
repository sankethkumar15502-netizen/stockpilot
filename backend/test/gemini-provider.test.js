import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeminiProvider } from '../src/ai/gemini-provider.js';
import { createAIProvider } from '../src/ai/factory.js';
import { geminiJsonSchema } from '../src/ai/gemini-schema.js';
import { actionSchema, planSchema, verdictSchema } from '../src/agents/contracts.js';

const options = { schema: verdictSchema, name: 'verification_output', system: 'Trusted role and policy',
  data: { external: 'Untrusted business observation' } };
const mockProvider = fetch => new GeminiProvider({ apiKey: 'gemini-test-only-placeholder',
  model: 'gemini-3.5-flash-lite', requestIntervalMs: 0, fetch });
const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
});

test('native Gemini SDK sends structured JSON with separate system policy and header-only key', async () => {
  let payload;
  const provider = mockProvider(async (url, init) => {
    assert.match(String(url), /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.5-flash-lite:generateContent$/);
    assert.equal(new Headers(init.headers).get('x-goog-api-key'), 'gemini-test-only-placeholder');
    payload = JSON.parse(init.body);
    return jsonResponse({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [
      { text: 'Internal thought must not enter structured output', thought: true },
      { text: JSON.stringify({ passed: true, explanation: 'Mock Gemini transport evidence', discrepancies: [] }) },
    ] } }] });
  });
  const output = await provider.generate(options);
  assert.equal(output.passed, true);
  assert.equal(payload.generationConfig.responseMimeType, 'application/json');
  assert.equal(payload.generationConfig.responseJsonSchema.additionalProperties, false);
  assert.equal(payload.systemInstruction.parts[0].text, options.system);
  assert.match(payload.contents[0].parts[0].text, /untrustedWorkflowData/);
  assert.equal(payload.contents[0].role, 'user'); assert.equal(payload.tools, undefined);
  assert.ok(!JSON.stringify(payload).includes('gemini-test-only-placeholder'));
});

test('Gemini schema projection preserves required fields/enums/nullability while Zod retains full local validation', () => {
  const plan = geminiJsonSchema(planSchema);
  assert.equal(plan.$schema, undefined);
  assert.equal(plan.properties.steps.items.properties.id.pattern, undefined);
  assert.deepEqual(plan.properties.steps.items.properties.agent.enum, ['research', 'analysis', 'execution', 'verification', 'communication']);
  assert.ok(plan.required.includes('steps'));
  const action = geminiJsonSchema(actionSchema);
  assert.deepEqual(action.properties.arguments.required, ['sku', 'quantity', 'supplierId', 'expectedVersion', 'orderIds', 'purchaseId', 'message']);
  assert.ok(JSON.stringify(action.properties.arguments.properties.quantity).includes('null'));
  assert.throws(() => planSchema.parse({ summary: 'Bad IDs must still fail', steps: [
    { id: 'INVALID ID', agent: 'research', objective: 'inspect' },
    { id: 'verify', agent: 'verification', objective: 'verify' },
    { id: 'report', agent: 'communication', objective: 'report' },
  ] }));
});

test('Gemini blocked, incomplete and malformed outputs fail explicitly without manufactured results', async () => {
  for (const [response, code] of [
    [{ promptFeedback: { blockReason: 'SAFETY' } }, 'AI_REFUSAL'],
    [{ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{partial' }] } }] }, 'AI_INCOMPLETE'],
    [{ candidates: [{ finishReason: 'STOP', content: { parts: [] } }] }, 'AI_REFUSAL'],
  ]) {
    await assert.rejects(mockProvider(async () => jsonResponse(response)).generate(options), error => error.code === code);
  }
  await assert.rejects(mockProvider(async () => jsonResponse({ candidates: [{ finishReason: 'STOP',
    content: { parts: [{ text: '{invalid' }] } }] })).generate(options), SyntaxError);
});

test('Gemini invalid-key and unavailable daily quota errors are sanitized and non-retryable', async () => {
  const invalid = mockProvider(async () => jsonResponse({ error: { code: 400, status: 'INVALID_ARGUMENT',
    message: 'Private key details must not be forwarded', details: [{ reason: 'API_KEY_INVALID' }] } }, 400));
  await assert.rejects(invalid.generate(options), error => error.code === 'AI_AUTH_ERROR' && !error.retryable
    && !error.message.includes('Private key details'));
  for (const violation of [{ quotaValue: '0' }, { quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }]) {
    const quota = mockProvider(async () => jsonResponse({ error: { code: 429, status: 'RESOURCE_EXHAUSTED',
      message: 'Private project details', details: [{ violations: [violation] }] } }, 429));
    await assert.rejects(quota.generate(options), error => error.code === 'AI_QUOTA_UNAVAILABLE' && !error.retryable);
  }
});

test('Gemini transient error uses engine-controlled retries, with SDK automatic retries disabled', async () => {
  let calls = 0;
  const provider = mockProvider(async () => { calls += 1; return jsonResponse({ error: { code: 503,
    status: 'UNAVAILABLE', message: 'Private server detail' } }, 503); });
  await assert.rejects(provider.generate(options), error => error.code === 'AI_PROVIDER_ERROR' && error.retryable
    && !error.message.includes('Private server detail'));
  assert.equal(calls, 1);
});

test('provider factory supports both native providers, and missing Gemini credentials remain explicit', async () => {
  assert.equal(createAIProvider('gemini').name, 'gemini');
  assert.equal(createAIProvider('openai').name, 'openai');
  assert.throws(() => createAIProvider('arbitrary-provider'), /Unsupported/);
  const missing = new GeminiProvider({ apiKey: '', requestIntervalMs: 0 });
  assert.equal(missing.configured, false);
  await assert.rejects(missing.generate(options), error => error.code === 'AI_NOT_CONFIGURED');
});
