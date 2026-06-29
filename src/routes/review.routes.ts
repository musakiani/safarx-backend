import { Router } from 'express';
import * as review from '../controllers/review.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, review.createReview);
router.get('/my', authMiddleware, review.getMyReviews);
router.get('/booking/:bookingId/status', authMiddleware, review.getBookingReviewStatus);

export default router;
