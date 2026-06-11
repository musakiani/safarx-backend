import { Response, NextFunction } from 'express';
import { Booking, DeliveryRequest, Notification, Trip } from '../models';
import { AuthRequest } from '../types/authRequest';
import { AppError } from '../middleware/errorHandler';

export async function createBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { deliveryId, tripId, message, agreedPrice } = req.body;
    const delivery = await DeliveryRequest.findById(deliveryId);
    const trip = await Trip.findById(tripId);
    if (!delivery || !trip) throw new AppError('Delivery or trip not found', 404);
    if (delivery.senderId.toString() !== req.user!.userId) {
      throw new AppError('Unauthorized', 403);
    }

    const existing = await Booking.findOne({
      deliveryId,
      status: { $in: ['pending', 'accepted'] },
    });
    if (existing) throw new AppError('An active booking already exists for this parcel', 409);

    const booking = await Booking.create({
      deliveryId,
      tripId,
      senderId: req.user!.userId,
      travelerId: trip.travelerId,
      message,
      agreedPrice: agreedPrice || 0,
    });

    await Notification.create({
      userId: trip.travelerId,
      title: 'New Booking Request',
      body: `You have a new booking request for ${delivery.title}`,
      type: 'booking',
      data: { bookingId: booking._id.toString(), deliveryId: deliveryId.toString() },
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function getMyBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const role = req.user!.activeRole || req.user!.role;
    const filter = role === 'traveler' ? { travelerId: req.user!.userId } : { senderId: req.user!.userId };
    const bookings = await Booking.find(filter)
      .populate('deliveryId')
      .populate('tripId')
      .populate('senderId', 'fullName profilePhoto')
      .populate('travelerId', 'fullName profilePhoto trustScore')
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
}

export async function getBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('deliveryId')
      .populate('tripId')
      .populate('senderId', 'fullName profilePhoto email phone')
      .populate('travelerId', 'fullName profilePhoto email phone trustScore');
    if (!booking) throw new AppError('Booking not found', 404);
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function acceptBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, travelerId: req.user!.userId, status: 'pending' },
      { status: 'accepted' },
      { new: true }
    );
    if (!booking) throw new AppError('Booking not found or already processed', 404);

    await DeliveryRequest.findByIdAndUpdate(booking.deliveryId, {
      bookingId: booking._id,
      travelerId: booking.travelerId,
    });

    await Notification.create({
      userId: booking.senderId,
      title: 'Booking Accepted — Pay Now',
      body: `Your booking was accepted! Please complete payment of Rs. ${booking.agreedPrice} to proceed.`,
      type: 'booking',
      data: {
        bookingId: booking._id.toString(),
        deliveryId: booking.deliveryId.toString(),
        action: 'pay_now',
      },
    });

    res.json({ success: true, booking, nextStep: 'sender_payment' });
  } catch (err) {
    next(err);
  }
}

export async function rejectBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, travelerId: req.user!.userId, status: 'pending' },
      { status: 'rejected' },
      { new: true }
    );
    if (!booking) throw new AppError('Booking not found or already processed', 404);

    await Notification.create({
      userId: booking.senderId,
      title: 'Booking Rejected',
      body: 'Your booking request was declined.',
      type: 'booking',
    });

    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}
