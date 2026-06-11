import { Router } from 'express';
import * as delivery from '../controllers/delivery.controller';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authMiddleware);
router.post('/', upload.array('photos', 5), delivery.createDelivery);
router.get('/my', delivery.getMyDeliveries);
router.get('/:id/matching-trips', delivery.getMatchingTrips);
router.patch('/:id', delivery.updateDelivery);
router.post('/:id/proof', upload.array('proof', 5), delivery.uploadDeliveryProof);
router.post('/:id/confirm', delivery.confirmDelivery);
router.patch('/:id/status', delivery.updateDeliveryStatus);
router.patch('/:id/location', delivery.updateTravelerLocation);
router.get('/:id/location', delivery.getTravelerLocation);
router.get('/:id', delivery.getDelivery);

export default router;
