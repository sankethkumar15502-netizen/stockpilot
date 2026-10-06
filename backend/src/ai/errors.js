import { AppError } from '../utils/errors.js';

export const nonRecoverableAIErrorCodes = new Set([
  'AI_NOT_CONFIGURED', 'AI_BILLING_REQUIRED', 'AI_AUTH_ERROR', 'AI_REQUEST_INVALID', 'AI_MODEL_UNAVAILABLE',
  'AI_QUOTA_UNAVAILABLE', 'AI_REFUSAL', 'AI_PROVIDER_ERROR',
]);

export function classifyProviderError(error) {
  const billingCodes = ['credit_balance_exhausted', 'insufficient_quota', 'billing_hard_limit_reached',
    'billing_not_active', 'usage_limit_reached'];
  if (billingCodes.includes(error.code)) {
    return new AppError('AI_BILLING_REQUIRED', 'The AI provider account has no available API credits or has reached its billing limit. Add API credits or adjust the account spending limit before retrying.', 503);
  }
  if (error.status === 401 || error.status === 403) {
    return new AppError('AI_AUTH_ERROR', 'The AI provider rejected the backend API credentials or model permissions. Check the configured API key and account access.', 503);
  }
  if (error.status === 404) {
    return new AppError('AI_MODEL_UNAVAILABLE', 'The configured AI model is not available to this account. Check the provider model setting and model access.', 503);
  }
  if (error.status === 400 || error.status === 422) {
    return new AppError('AI_REQUEST_INVALID', 'The AI provider rejected the structured request. Review the server-side model and output-schema configuration.', 502);
  }
  const retryable = !error.status || error.status === 429 || error.status >= 500;
  return new AppError('AI_PROVIDER_ERROR', 'AI provider request failed; check server-side credentials, quota and connectivity', 502, retryable);
}

export function classifyGeminiError(error) {
  let payload;
  try { payload = JSON.parse(error.message)?.error; } catch { /* Never expose the raw SDK body. */ }
  const reasons = payload?.details?.map(detail => detail.reason).filter(Boolean) || [];
  if (reasons.includes('API_KEY_INVALID') || reasons.includes('API_KEY_EXPIRED')) {
    return new AppError('AI_AUTH_ERROR', 'Gemini rejected the backend API key. Check GEMINI_API_KEY and its Google AI project access.', 503);
  }
  const violations = payload?.details?.flatMap(detail => detail.violations || []) || [];
  if (error.status === 429 && violations.some(v => v.quotaValue === 0 || v.quotaValue === '0' || /PerDay|per_day|Daily/i.test(v.quotaId || v.quotaMetric || ''))) {
    return new AppError('AI_QUOTA_UNAVAILABLE', 'The Gemini project has no generation quota for this model or its daily quota is exhausted. Check Google AI Studio quota and project billing before retrying.', 503);
  }
  return classifyProviderError(error);
}
