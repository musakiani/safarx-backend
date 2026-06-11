import { Router } from 'express';
import * as payment from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.post('/create-intent', payment.createPaymentIntentHandler);
router.post('/confirm', payment.confirmPayment);
router.post('/release-escrow', payment.releaseEscrow);
router.get('/escrow', payment.getEscrowStatus);
router.get('/booking/:bookingId', payment.getPaymentByBooking);

export default router;
