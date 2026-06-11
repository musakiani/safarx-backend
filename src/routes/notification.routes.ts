import { Router } from 'express';
import * as notification from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', notification.getNotifications);
router.patch('/:id/read', notification.markRead);

export default router;
