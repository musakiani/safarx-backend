import express from 'express';
import cors from 'cors';
import path from 'path';
import { connectDB } from './config/db';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import kycRoutes from './routes/kyc.routes';
import deliveryRoutes from './routes/delivery.routes';
import tripRoutes from './routes/trip.routes';
import bookingRoutes from './routes/booking.routes';
import paymentRoutes from './routes/payment.routes';
import messageRoutes from './routes/message.routes';
import notificationRoutes from './routes/notification.routes';
import reviewRoutes from './routes/review.routes';
import disputeRoutes from './routes/dispute.routes';
import supportRoutes from './routes/support.routes';
import adminRoutes from './routes/admin.routes';
import chatbotRoutes from './routes/chatbot.routes';

async function main() {
  await connectDB();

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'SafarX API is running' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/kyc', kycRoutes);
  app.use('/api/deliveries', deliveryRoutes);
  app.use('/api/trips', tripRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/disputes', disputeRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/chatbot', chatbotRoutes);

  app.use(errorHandler);

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`SafarX server running on http://0.0.0.0:${config.port}`);
  });
}

main().catch(console.error);
