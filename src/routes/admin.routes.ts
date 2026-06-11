import { Router } from 'express';
import * as admin from '../controllers/admin.controller';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { adminKycRouter } from './kyc.routes';
import { adminDisputeRouter } from './dispute.routes';
import { adminSupportRouter } from './support.routes';

const router = Router();

router.use(authMiddleware, requireAdmin);
router.get('/dashboard', admin.getDashboard);
router.get('/users', admin.getUsers);
router.get('/users/:id', admin.getUserById);
router.patch('/users/:id', admin.updateUser);
router.delete('/users/:id', admin.deleteUser);
router.get('/deliveries', admin.getAllDeliveries);
router.get('/payments', admin.getAllPayments);
router.use('/kyc', adminKycRouter);
router.use('/disputes', adminDisputeRouter);
router.use('/support', adminSupportRouter);

export default router;
