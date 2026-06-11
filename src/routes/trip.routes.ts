import { Router } from 'express';
import * as trip from '../controllers/trip.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', trip.getTrips);
router.get('/my', authMiddleware, trip.getMyTrips);
router.get('/:id', trip.getTrip);
router.post('/', authMiddleware, trip.createTrip);
router.patch('/:id/deactivate', authMiddleware, trip.deactivateTrip);

export default router;
