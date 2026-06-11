import { Router } from 'express';
import * as message from '../controllers/message.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', message.getConversations);
router.get('/thread', message.getMessages);
router.post('/', message.sendMessage);

export default router;
