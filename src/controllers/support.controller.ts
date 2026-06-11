import { Response, NextFunction } from 'express';
import { SupportTicket } from '../models';
import { AuthRequest } from '../types/authRequest';

export async function createTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticket = await SupportTicket.create({
      ...req.body,
      userId: req.user!.userId,
    });
    res.status(201).json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
}

export async function getTickets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tickets = await SupportTicket.find()
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, tickets });
  } catch (err) {
    next(err);
  }
}

export async function updateTicket(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
}
