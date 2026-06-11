import { Router } from 'express';
import * as dispute from '../controllers/dispute.controller';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, dispute.createDispute);

const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.get('/', dispute.getDisputes);
adminRouter.patch('/:id', dispute.updateDispute);

export { router as default, adminRouter as adminDisputeRouter };
