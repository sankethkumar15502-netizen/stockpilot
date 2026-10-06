import { Router } from 'express';
import { Approval, Task } from '../models/index.js';
import { idSchema, approvalDecisionSchema } from '../validators/api.js';
import { resumeApprovedTask } from '../workflows/engine.js';
import { event } from '../services/events.js';
import { assert } from '../utils/errors.js';
export const approvalRoutes = Router();
approvalRoutes.get('/', async (req, res) => res.json({ approvals: await Approval.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean() }));
approvalRoutes.use('/:id', async (req, _res, next) => {
  const approval = await Approval.findOne({ _id: idSchema.parse(req.params.id), userId: req.user._id }).lean();
  assert(approval, 'APPROVAL_NOT_FOUND', 'Approval not found', 404);
  req.approval = approval;
  next();
});
approvalRoutes.get('/:id', (req, res) => res.json({ approval: req.approval }));
for (const [path, status] of [['approve', 'APPROVED'], ['reject', 'REJECTED']]) {
  approvalRoutes.post(`/:id/${path}`, async (req, res) => {
    const { reason } = approvalDecisionSchema.parse(req.body);
    const task = await Task.findOne({ _id: req.approval.taskId, userId: req.user._id,
      status: 'WAITING_FOR_APPROVAL', pendingApprovalId: req.approval._id });
    assert(task, 'APPROVAL_CONFLICT', 'Workflow is no longer waiting for this approval', 409);
    const approval = await Approval.findOneAndUpdate({ _id: req.approval._id, userId: req.user._id, status: 'PENDING' },
      { $set: { status, decisionReason: reason, decidedAt: new Date() } }, { returnDocument: 'after' });
    assert(approval, 'APPROVAL_CONFLICT', 'This approval has already been decided', 409);
    await resumeApprovedTask(approval);
    await event(req.user._id, approval.taskId, `APPROVAL_${status}`, `Human ${status.toLowerCase()} the exact purchase request`, { approvalId: String(approval._id), reason });
    res.json({ approval });
  });
}
