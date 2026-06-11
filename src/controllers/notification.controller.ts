import { Response, NextFunction } from 'express';
import { Notification } from '../models';
import { AuthRequest } from '../types/authRequest';

export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const notifications = await Notification.find({ userId: req.user!.userId }).sort({
      createdAt: -1,
    });
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, notification });
  } catch (err) {
    next(err);
  }
}
