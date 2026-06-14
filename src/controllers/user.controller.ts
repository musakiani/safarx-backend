import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../types/authRequest';
import { AppError } from '../middleware/errorHandler';
import { getFileUrl } from '../middleware/upload';

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user!.userId).select('-password');
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const allowed = [
      'fullName',
      'phone',
      'language',
      'activeRole',
      'addresses',
      'notificationSettings',
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.file) {
      updates.profilePhoto = getFileUrl(req.file);
    }
    const user = await User.findByIdAndUpdate(req.user!.userId, updates, { new: true }).select(
      '-password'
    );
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}
