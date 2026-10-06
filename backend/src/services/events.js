import { WorkflowEvent } from '../models/index.js';
export const event = (userId, taskId, type, title, data = {}) =>
  WorkflowEvent.create({ userId, taskId, type, title, data });
