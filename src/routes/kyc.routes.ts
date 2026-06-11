import { Router } from 'express';
import * as kyc from '../controllers/kyc.controller';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/submit', authMiddleware, upload.array('documents', 3), kyc.submitKYC);
router.get('/me', authMiddleware, kyc.getMyKYC);

const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.get('/', kyc.getAllKYC);
adminRouter.patch('/:id/approve', kyc.approveKYC);
adminRouter.patch('/:id/reject', kyc.rejectKYC);

export { router as default, adminRouter as adminKycRouter };
