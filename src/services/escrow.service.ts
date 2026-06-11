import { config } from '../config';
import { Escrow, Notification, Booking, AuditLog } from '../models';
import { AppError } from '../middleware/errorHandler';

export function calculatePayout(amount: number, rate = config.platformCommissionRate) {
  const platformCommission = Math.round(amount * rate * 100) / 100;
  const travelerPayout = Math.round((amount - platformCommission) * 100) / 100;
  return { platformCommission, travelerPayout, platformCommissionRate: rate };
}

export async function releaseEscrowForBooking(bookingId: string) {
  const escrow = await Escrow.findOne({ bookingId, status: 'held' });
  if (!escrow) throw new AppError('No held escrow found for this booking', 404);

  const { platformCommission, travelerPayout, platformCommissionRate } = calculatePayout(
    escrow.amount,
    escrow.platformCommissionRate || config.platformCommissionRate
  );

  escrow.platformCommission = platformCommission;
  escrow.travelerPayout = travelerPayout;
  escrow.platformCommissionRate = platformCommissionRate;
  escrow.status = 'released';
  escrow.releasedAt = new Date();
  await escrow.save();

  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { status: 'completed', completedAt: new Date() },
    { new: true }
  );

  if (booking) {
    await Notification.create({
      userId: booking.travelerId,
      title: 'Payment Released',
      body: `Rs. ${travelerPayout} has been released to your account (10% platform fee deducted).`,
      type: 'payment',
      data: { bookingId, travelerPayout, platformCommission },
    });
  }

  await AuditLog.create({
    action: 'escrow_released',
    entity: 'Escrow',
    entityId: escrow._id.toString(),
    metadata: { bookingId, platformCommission, travelerPayout, amount: escrow.amount },
  });

  return escrow;
}

export async function requireEscrowHeld(bookingId: string) {
  const escrow = await Escrow.findOne({ bookingId, status: 'held' });
  if (!escrow) throw new AppError('Payment must be completed before this step', 402);
  return escrow;
}
