import { Response, NextFunction } from 'express';
import { Booking, Escrow, Payment, Notification } from '../models';
import { AuthRequest } from '../types/authRequest';
import { AppError } from '../middleware/errorHandler';
import { createPaymentIntent } from '../services/stripe.service';
import { config } from '../config';

export async function createPaymentIntentHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.senderId.toString() !== req.user!.userId) {
      throw new AppError('Unauthorized', 403);
    }
    if (booking.status !== 'accepted') {
      throw new AppError('Booking must be accepted by traveler before payment', 400);
    }
    if (booking.paymentStatus === 'paid') {
      throw new AppError('Booking already paid', 400);
    }

    const existingPayment = await Payment.findOne({
      bookingId: booking._id,
      status: 'succeeded',
    });
    if (existingPayment) throw new AppError('Payment already exists', 400);

    const intent = await createPaymentIntent(booking.agreedPrice, booking.currency, {
      bookingId: booking._id.toString(),
      senderId: booking.senderId.toString(),
    });
    if (!intent) throw new AppError('Stripe not configured', 503);

    const payment = await Payment.create({
      bookingId: booking._id,
      senderId: booking.senderId,
      travelerId: booking.travelerId,
      amount: booking.agreedPrice,
      currency: booking.currency,
      status: 'processing',
      stripePaymentIntentId: intent.paymentIntentId,
      stripeClientSecret: intent.clientSecret,
    });

    const { platformCommission, travelerPayout } = {
      platformCommission: Math.round(booking.agreedPrice * config.platformCommissionRate * 100) / 100,
      travelerPayout:
        Math.round(booking.agreedPrice * (1 - config.platformCommissionRate) * 100) / 100,
    };

    res.json({
      success: true,
      clientSecret: intent.clientSecret,
      paymentId: payment._id,
      amount: booking.agreedPrice,
      platformCommission,
      travelerPayout,
      commissionRate: config.platformCommissionRate,
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { paymentId } = req.body;
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.senderId.toString() !== req.user!.userId) {
      throw new AppError('Unauthorized', 403);
    }

    const booking = await Booking.findById(payment.bookingId);
    if (!booking || booking.status !== 'accepted') {
      throw new AppError('Invalid booking state for payment', 400);
    }

    payment.status = 'succeeded';
    await payment.save();

    await Booking.findByIdAndUpdate(payment.bookingId, {
      paymentStatus: 'paid',
      paidAt: new Date(),
    });

    const escrow = await Escrow.create({
      paymentId: payment._id,
      bookingId: payment.bookingId,
      amount: payment.amount,
      currency: payment.currency,
      platformCommissionRate: config.platformCommissionRate,
      status: 'held',
      heldAt: new Date(),
    });

    await Notification.create({
      userId: payment.travelerId,
      title: 'Payment Received — Start Pickup',
      body: `Rs. ${payment.amount} is held in escrow. You can now pick up the parcel.`,
      type: 'payment',
      data: { bookingId: payment.bookingId.toString(), deliveryId: booking.deliveryId.toString() },
    });

    res.json({
      success: true,
      payment,
      escrow,
      message: 'Payment held in escrow until delivery is confirmed',
    });
  } catch (err) {
    next(err);
  }
}

export async function releaseEscrow(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { bookingId } = req.body;
    const { releaseEscrowForBooking } = await import('../services/escrow.service');
    const escrow = await releaseEscrowForBooking(bookingId);
    res.json({ success: true, escrow });
  } catch (err) {
    next(err);
  }
}

export async function getEscrowStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const escrows = await Escrow.find({
      $or: [
        { bookingId: { $in: await Booking.find({ senderId: req.user!.userId }).distinct('_id') } },
        { bookingId: { $in: await Booking.find({ travelerId: req.user!.userId }).distinct('_id') } },
      ],
    }).populate('bookingId');
    res.json({ success: true, escrows });
  } catch (err) {
    next(err);
  }
}

export async function getPaymentByBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError('Booking not found', 404);

    const isParty =
      booking.senderId.toString() === req.user!.userId ||
      booking.travelerId.toString() === req.user!.userId;
    if (!isParty) throw new AppError('Unauthorized', 403);

    const payment = await Payment.findOne({ bookingId }).sort({ createdAt: -1 });
    const escrow = await Escrow.findOne({ bookingId }).sort({ createdAt: -1 });

    res.json({ success: true, booking, payment, escrow });
  } catch (err) {
    next(err);
  }
}
