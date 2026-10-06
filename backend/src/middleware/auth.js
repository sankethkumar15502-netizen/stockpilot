import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { config } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export const signToken = user => jwt.sign({ version: user.tokenVersion }, config.JWT_SECRET, {
  algorithm: 'HS256', subject: String(user._id), expiresIn: '8h', issuer: 'stockpilot', audience: 'stockpilot-web',
});
export async function authenticate(req, _res, next) {
  let payload;
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new Error('Missing token');
    payload = jwt.verify(header.slice(7), config.JWT_SECRET, {
      algorithms: ['HS256'], issuer: 'stockpilot', audience: 'stockpilot-web',
    });
    if (!/^[a-f\d]{24}$/i.test(payload.sub || '')) throw new Error('Invalid subject');
  } catch {
    return next(new AppError('UNAUTHORIZED', 'Sign in with a valid, unexpired session', 401));
  }
  let user;
  try { user = await User.findById(payload.sub); }
  catch { return next(new AppError('DATABASE_UNAVAILABLE', 'Authentication is temporarily unavailable', 503)); }
  if (!user || user.tokenVersion !== payload.version) return next(new AppError('UNAUTHORIZED', 'Sign in with a valid, unexpired session', 401));
  req.user = user;
  next();
}
