import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { askRagChatbot } from '../services/ragChatbot.service';
import { AuthRequest } from '../types/authRequest';

const messageSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .optional(),
});

export async function sendChatbotMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = messageSchema.parse(req.body);
    const result = await askRagChatbot({
      message: body.message,
      conversationId: body.conversationId,
      history: body.history,
      userId: req.user?.userId,
      role: req.user?.role,
      activeRole: req.user?.activeRole,
    });

    if (!result.success) {
      res.status(503).json({ success: false, message: result.message || 'Chatbot service unavailable' });
      return;
    }

    res.json({
      success: true,
      answer: result.answer,
      sources: result.sources || [],
      conversationId: result.conversationId,
    });
  } catch (err) {
    next(err);
  }
}
