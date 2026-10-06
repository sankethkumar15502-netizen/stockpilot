import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../validators/api.js';
import { AppError } from '../utils/errors.js';
import { event } from '../services/events.js';
export const authRoutes = Router();
const safeUser = user => ({ id: user._id, name: user.name, email: user.email });
authRoutes.post('/register', async (req, res) => {
  const { password, ...input } = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await User.create({ ...input, passwordHash });
    await event(user._id, null, 'AUTH_REGISTER', 'Account registered');
    res.status(201).json({ user: safeUser(user), token: signToken(user) });
  } catch (error) {
    if (error.code === 11000) throw new AppError('EMAIL_EXISTS', 'An account with this email already exists', 409);
    throw error;
  }
});
const dummyHash = bcrypt.hashSync('constant-dummy-password-for-timing', 12);
authRoutes.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  const valid = await bcrypt.compare(input.password, user?.passwordHash || dummyHash);
  if (!user || !valid) throw new AppError('INVALID_CREDENTIALS', 'Email or password is incorrect', 401);
  await event(user._id, null, 'AUTH_LOGIN', 'Account signed in');
  res.json({ user: safeUser(user), token: signToken(user) });
});
authRoutes.get('/me', authenticate, (req, res) => res.json({ user: safeUser(req.user) }));
authRoutes.post('/logout', authenticate, async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  await event(req.user._id, null, 'AUTH_LOGOUT', 'All account sessions revoked');
  res.json({ success: true });
});
