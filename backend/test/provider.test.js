import { test } from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { OpenAIProvider } from '../src/ai/provider.js';
import { verdictSchema } from '../src/agents/contracts.js';
import { validateTransition } from '../src/workflows/state-machine.js';

function providerWithTransport(fetch) {
  const provider = new OpenAIProvider();
  provider.configured = true;
  // Real OpenAI SDK with mock HTTP transport; never a paid/live API claim.
  provider.client = new OpenAI({ apiKey: 'test-only-placeholder', fetch, maxRetries: 0 });
  return provider;
}
const options = { schema: verdictSchema, name: 'verification_output', system: 'Trusted instruction', data: { external: 'Untrusted evidence' } };
test('actual OpenAI SDK emits current Responses structured-output contract and parses HTTP output', async () => {
  let payload;
  const provider = providerWithTransport(async (url, init) => {
    assert.equal(String(url), 'https://api.openai.com/v1/responses');
    payload = JSON.parse(init.body);
    return new Response(JSON.stringify({ id: 'resp_test', object: 'response', status: 'completed',
      output: [{ id: 'msg_test', type: 'message', status: 'completed', role: 'assistant', content: [
        { type: 'output_text', text: JSON.stringify({ passed: true, explanation: 'Transport test only', discrepancies: [] }), annotations: [] },
      ] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const output = await provider.generate(options);
  assert.equal(output.passed, true); assert.equal(payload.store, false);
  assert.equal(payload.text.format.type, 'json_schema'); assert.equal(payload.text.format.strict, true);
  assert.equal(payload.text.format.schema.additionalProperties, false);
  assert.equal(payload.input[0].role, 'system'); assert.match(payload.input[1].content, /untrustedWorkflowData/);
});
test('provider failure sanitizes sensitive HTTP content and identifies retryable quota/server errors', async () => {
  const provider = providerWithTransport(async () => new Response(JSON.stringify({ error: {
    message: 'Do not leak test-only-secret', type: 'server_error', code: 'server_error',
  } }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
  await assert.rejects(provider.generate(options), e => e.code === 'AI_PROVIDER_ERROR' && e.retryable && !e.message.includes('test-only-secret'));
});
test('provider refusal, incomplete response, malformed JSON and missing key fail explicitly', async () => {
  for (const [status, output, code] of [
    ['completed', [], 'AI_REFUSAL'], ['incomplete', [], 'AI_INCOMPLETE'],
  ]) {
    const provider = providerWithTransport(async () => new Response(JSON.stringify({ id: 'resp_test', status, output }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await assert.rejects(provider.generate(options), e => e.code === code);
  }
  const missing = new OpenAIProvider(); missing.client = null;
  await assert.rejects(missing.generate(options), e => e.code === 'AI_NOT_CONFIGURED');
  const malformed = new OpenAIProvider(); malformed.client = { responses: { create: async () => ({ status: 'completed', output_text: '{invalid' }) } };
  await assert.rejects(malformed.generate(options), SyntaxError);
});
test('persistent state machine rejects terminal resurrection and premature completion', () => {
  assert.throws(() => validateTransition('COMPLETED', 'EXECUTING'), e => e.code === 'INVALID_STATE_TRANSITION');
  assert.throws(() => validateTransition('PLANNING', 'COMPLETED'), e => e.code === 'INVALID_STATE_TRANSITION');
  assert.doesNotThrow(() => validateTransition('WAITING_FOR_TOOL', 'WAITING_FOR_APPROVAL'));
});

test('exhausted balance and billing limits are explicit non-retryable errors, distinct from transient HTTP 429', async () => {
  for (const code of ['credit_balance_exhausted', 'insufficient_quota', 'billing_hard_limit_reached', 'billing_not_active', 'usage_limit_reached']) {
    const provider = providerWithTransport(async () => new Response(JSON.stringify({ error: {
      message: 'Private provider account details must not be exposed', type: 'billing_error', code,
    } }), { status: 429, headers: { 'Content-Type': 'application/json' } }));
    await assert.rejects(provider.generate(options), error => error.code === 'AI_BILLING_REQUIRED' && !error.retryable
      && error.message.includes('API credits') && !error.message.includes('Private provider'));
  }
  const temporary = providerWithTransport(async () => new Response(JSON.stringify({ error: {
    message: 'Temporary rate limit', type: 'rate_limit_error', code: 'rate_limit_exceeded',
  } }), { status: 429, headers: { 'Content-Type': 'application/json' } }));
  await assert.rejects(temporary.generate(options), error => error.code === 'AI_PROVIDER_ERROR' && error.retryable);
});

test('provider credential, model and request-configuration failures are actionable and non-retryable', async () => {
  for (const [status, code] of [[401, 'AI_AUTH_ERROR'], [403, 'AI_AUTH_ERROR'], [404, 'AI_MODEL_UNAVAILABLE'], [400, 'AI_REQUEST_INVALID']]) {
    const provider = providerWithTransport(async () => new Response(JSON.stringify({ error: {
      message: 'Do not forward private key details', type: 'configuration_error', code: 'configuration_error',
    } }), { status, headers: { 'Content-Type': 'application/json' } }));
    await assert.rejects(provider.generate(options), error => error.code === code && !error.retryable && !error.message.includes('private key details'));
  }
});
