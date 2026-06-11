import { Router } from 'express';
import * as support from '../controllers/support.controller';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, support.createTicket);

const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.get('/', support.getTickets);
adminRouter.patch('/:id', support.updateTicket);

export { router as default, adminRouter as adminSupportRouter };
