import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getPricing } from '../controllers/pricing.controller';

const router = Router();

router.post('/', authMiddleware, getPricing);

export default router;
