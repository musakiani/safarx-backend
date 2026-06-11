import { Router } from 'express';
import * as user from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/me', authMiddleware, user.getMe);
router.patch('/me', authMiddleware, upload.single('profilePhoto'), user.updateMe);

export default router;
