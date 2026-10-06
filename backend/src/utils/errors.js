export class AppError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    Object.assign(this, { code, status, retryable });
  }
}
export const assert = (condition, code, message, status = 400) => {
  if (!condition) throw new AppError(code, message, status);
};
export function publicError(error) {
  if (error instanceof AppError) return { code: error.code, message: error.message };
  if (error.name === 'ZodError') return { code: 'VALIDATION_ERROR', message: 'Input does not match the required schema' };
  return { code: 'INTERNAL_ERROR', message: 'The operation could not be completed' };
}
