import { Router } from 'express';
import * as booking from '../controllers/booking.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.post('/', booking.createBooking);
router.get('/my', booking.getMyBookings);
router.get('/:id', booking.getBooking);
router.patch('/:id/accept', booking.acceptBooking);
router.patch('/:id/reject', booking.rejectBooking);

export default router;
