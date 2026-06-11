import { Response, NextFunction } from 'express';
import { DeliveryRequest, Package, Booking, Escrow, Payment, Review, Notification } from '../models';
import { AuthRequest } from '../types/authRequest';
import { AppError } from '../middleware/errorHandler';
import { getFileUrl } from '../middleware/upload';
import { findMatchingTrips } from '../services/matching.service';
import {
  canTransition,
  TRAVELER_STATUSES,
  SENDER_STATUSES,
} from '../services/deliveryFlow.service';
import { requireEscrowHeld, releaseEscrowForBooking } from '../services/escrow.service';
import { DeliveryStatus } from '../types';

export async function createDelivery(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const photos: string[] = [];
    const files = req.files as Express.Multer.File[] | undefined;
    files?.forEach((f) => photos.push(getFileUrl(f.filename)));

    const delivery = await DeliveryRequest.create({
      senderId: req.user!.userId,
      ...req.body,
      preferredDate: new Date(req.body.preferredDate),
      photos,
      timeline: [{ status: 'pending_pickup', note: 'Delivery request created', at: new Date() }],
    });

    await Package.create({
      deliveryId: delivery._id,
      senderId: req.user!.userId,
      title: delivery.title,
      weightKg: delivery.weightKg,
      photos,
    });

    res.status(201).json({ success: true, delivery });
  } catch (err) {
    next(err);
  }
}

export async function getMyDeliveries(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const filter =
      req.user!.activeRole === 'traveler'
        ? { travelerId: req.user!.userId }
        : { senderId: req.user!.userId };
    const deliveries = await DeliveryRequest.find(filter)
      .populate('senderId', 'fullName profilePhoto')
      .populate('travelerId', 'fullName profilePhoto trustScore')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      deliveries.map(async (d) => {
        const booking = d.bookingId
          ? await Booking.findById(d.bookingId).select('status paymentStatus agreedPrice')
          : null;
        return { ...d.toObject(), booking };
      })
    );

    res.json({ success: true, deliveries: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getDelivery(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const delivery = await DeliveryRequest.findById(req.params.id)
      .populate('senderId', 'fullName email phone profilePhoto')
      .populate('travelerId', 'fullName email phone profilePhoto trustScore');
    if (!delivery) throw new AppError('Delivery not found', 404);

    const booking = delivery.bookingId
      ? await Booking.findById(delivery.bookingId)
      : null;
    const payment = booking
      ? await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 })
      : null;
    const escrow = booking
      ? await Escrow.findOne({ bookingId: booking._id }).sort({ createdAt: -1 })
      : null;

    res.json({ success: true, delivery, booking, payment, escrow });
  } catch (err) {
    next(err);
  }
}

export async function updateDeliveryStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, note } = req.body as { status: DeliveryStatus; note?: string };
    const delivery = await DeliveryRequest.findById(req.params.id);
    if (!delivery) throw new AppError('Delivery not found', 404);

    const userId = req.user!.userId;
    const isTraveler = delivery.travelerId?.toString() === userId;
    const isSender = delivery.senderId.toString() === userId;

    if (TRAVELER_STATUSES.includes(status) && !isTraveler) {
      throw new AppError('Only the assigned traveler can update this status', 403);
    }
    if (SENDER_STATUSES.includes(status) && !isSender) {
      throw new AppError('Only the sender can update this status', 403);
    }

    if (!canTransition(delivery.status, status)) {
      throw new AppError(`Cannot transition from ${delivery.status} to ${status}`, 400);
    }

    if (status === 'picked_up' && delivery.bookingId) {
      await requireEscrowHeld(delivery.bookingId.toString());
    }

    delivery.status = status;
    delivery.timeline.push({ status, note, at: new Date() });
    await delivery.save();

    if (status === 'delivered') {
      await Notification.create({
        userId: delivery.senderId,
        title: 'Parcel Delivered',
        body: 'Your parcel has been delivered. Please confirm receipt to release payment.',
        type: 'delivery',
        data: { deliveryId: delivery._id.toString(), action: 'confirm_delivery' },
      });
    }

    res.json({ success: true, delivery });
  } catch (err) {
    next(err);
  }
}

export async function uploadDeliveryProof(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const delivery = await DeliveryRequest.findById(req.params.id);
    if (!delivery) throw new AppError('Delivery not found', 404);
    if (delivery.travelerId?.toString() !== req.user!.userId) {
      throw new AppError('Only the assigned traveler can upload proof', 403);
    }

    const files = req.files as Express.Multer.File[] | undefined;
    const proofUrls = files?.map((f) => getFileUrl(f.filename)) || [];
    delivery.proofPhotos.push(...proofUrls);

    if (canTransition(delivery.status, 'proof_submitted')) {
      delivery.status = 'proof_submitted';
      delivery.timeline.push({
        status: 'proof_submitted',
        note: 'Delivery proof uploaded',
        at: new Date(),
      });
    }
    await delivery.save();

    res.json({ success: true, delivery });
  } catch (err) {
    next(err);
  }
}

export async function confirmDelivery(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const delivery = await DeliveryRequest.findById(req.params.id);
    if (!delivery) throw new AppError('Delivery not found', 404);
    if (delivery.senderId.toString() !== req.user!.userId) {
      throw new AppError('Only the sender can confirm delivery', 403);
    }
    if (delivery.status !== 'delivered') {
      throw new AppError('Delivery must be marked as delivered by traveler first', 400);
    }
    if (!delivery.bookingId) throw new AppError('No booking linked to this delivery', 400);

    delivery.status = 'completed';
    delivery.timeline.push({
      status: 'completed',
      note: 'Sender confirmed delivery',
      at: new Date(),
    });
    await delivery.save();

    const escrow = await releaseEscrowForBooking(delivery.bookingId.toString());

    const booking = await Booking.findById(delivery.bookingId);
    if (booking) {
      await Notification.create({
        userId: booking.travelerId,
        title: 'Delivery Confirmed',
        body: 'Sender confirmed delivery. Please leave a review!',
        type: 'delivery',
        data: {
          bookingId: booking._id.toString(),
          action: 'leave_review',
        },
      });
    }

    res.json({
      success: true,
      delivery,
      escrow,
      payout: {
        total: escrow.amount,
        platformCommission: escrow.platformCommission,
        travelerPayout: escrow.travelerPayout,
      },
      nextStep: 'reviews',
    });
  } catch (err) {
    next(err);
  }
}

export async function updateDelivery(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const delivery = await DeliveryRequest.findById(req.params.id);
    if (!delivery) throw new AppError('Delivery not found', 404);
    if (delivery.senderId.toString() !== req.user!.userId) {
      throw new AppError('Only the sender can edit this delivery', 403);
    }
    // Only allow editing if no booking has been made yet
    if (delivery.bookingId) {
      throw new AppError('Cannot edit a delivery that already has a booking', 400);
    }

    const { title, description, pickupCity, pickupCountry, pickupAddress,
            dropoffCity, dropoffCountry, dropoffAddress, preferredDate, weightKg } = req.body;

    if (title)          delivery.title          = title;
    if (description)    delivery.description    = description;
    if (pickupCity)     delivery.pickupCity     = pickupCity;
    if (pickupCountry)  delivery.pickupCountry  = pickupCountry;
    if (pickupAddress)  delivery.pickupAddress  = pickupAddress;
    if (dropoffCity)    delivery.dropoffCity    = dropoffCity;
    if (dropoffCountry) delivery.dropoffCountry = dropoffCountry;
    if (dropoffAddress) delivery.dropoffAddress = dropoffAddress;
    if (preferredDate)  delivery.preferredDate  = new Date(preferredDate);
    if (weightKg)       delivery.weightKg       = parseFloat(weightKg);

    await delivery.save();
    res.json({ success: true, delivery });
  } catch (err) {
    next(err);
  }
}

export async function updateTravelerLocation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { lat, lng } = req.body;
    const delivery = await DeliveryRequest.findById(req.params.id);
    if (!delivery) throw new AppError('Delivery not found', 404);
    if (delivery.travelerId?.toString() !== req.user!.userId) {
      throw new AppError('Only the assigned traveler can update location', 403);
    }
    delivery.travelerLocation = { lat, lng, updatedAt: new Date() };
    await delivery.save();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getTravelerLocation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const delivery = await DeliveryRequest.findById(req.params.id).select('travelerLocation senderId travelerId status');
    if (!delivery) throw new AppError('Delivery not found', 404);
    const isParty =
      delivery.senderId.toString() === req.user!.userId ||
      delivery.travelerId?.toString() === req.user!.userId;
    if (!isParty) throw new AppError('Unauthorized', 403);
    res.json({ success: true, location: delivery.travelerLocation });
  } catch (err) {
    next(err);
  }
}

export async function getMatchingTrips(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const delivery = await DeliveryRequest.findById(req.params.id);
    if (!delivery) throw new AppError('Delivery not found', 404);
    const trips = await findMatchingTrips({
      pickupCity: delivery.pickupCity,
      pickupCountry: delivery.pickupCountry,
      dropoffCity: delivery.dropoffCity,
      dropoffCountry: delivery.dropoffCountry,
      preferredDate: delivery.preferredDate,
      weightKg: delivery.weightKg,
    });
    res.json({ success: true, trips });
  } catch (err) {
    next(err);
  }
}
