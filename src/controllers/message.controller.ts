import { Response, NextFunction } from 'express';
import { Message } from '../models';
import { AuthRequest } from '../types/authRequest';

export async function getMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { partnerId } = req.query;
    const filter: Record<string, unknown> = {
      $or: [
        { senderId: req.user!.userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: req.user!.userId },
      ],
    };
    const messages = await Message.find(filter).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { receiverId, content, bookingId } = req.body;
    const message = await Message.create({
      senderId: req.user!.userId,
      receiverId,
      content,
      bookingId,
    });
    res.status(201).json({ success: true, message });
  } catch (err) {
    next(err);
  }
}

export async function getConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const messages = await Message.find({
      $or: [{ senderId: req.user!.userId }, { receiverId: req.user!.userId }],
    })
      .populate('senderId', 'fullName profilePhoto')
      .populate('receiverId', 'fullName profilePhoto')
      .sort({ createdAt: -1 });

    const seen = new Set<string>();
    const conversations: unknown[] = [];
    for (const msg of messages) {
      const partnerId =
        msg.senderId.toString() === req.user!.userId
          ? msg.receiverId.toString()
          : msg.senderId.toString();
      if (!seen.has(partnerId)) {
        seen.add(partnerId);
        conversations.push(msg);
      }
    }
    res.json({ success: true, conversations });
  } catch (err) {
    next(err);
  }
}
