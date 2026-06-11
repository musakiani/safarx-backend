import { Router } from 'express';
import * as chatbot from '../controllers/chatbot.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.post('/message', optionalAuth, chatbot.sendChatbotMessage);

export default router;
