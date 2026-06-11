import { Response, NextFunction } from 'express';
import { Dispute } from '../models';
import { AuthRequest } from '../types/authRequest';

export async function createDispute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const dispute = await Dispute.create({
      ...req.body,
      raisedBy: req.user!.userId,
    });
    res.status(201).json({ success: true, dispute });
  } catch (err) {
    next(err);
  }
}

export async function getDisputes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const disputes = await Dispute.find()
      .populate('bookingId')
      .populate('raisedBy', 'fullName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, disputes });
  } catch (err) {
    next(err);
  }
}

export async function updateDispute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const dispute = await Dispute.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, dispute });
  } catch (err) {
    next(err);
  }
}
