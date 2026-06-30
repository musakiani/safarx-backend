import { Response, NextFunction } from 'express';
import { Dispute, Booking, DeliveryRequest, User } from '../models';
import { AuthRequest } from '../types/authRequest';
import { AppError } from '../middleware/errorHandler';

export async function createDispute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { bookingId, reason, description } = req.body;

    if (!bookingId) {
      throw new AppError('Booking ID is required', 400);
    }

    if (!reason || reason.trim() === '') {
      throw new AppError('Dispute reason is required', 400);
    }

    if (reason.trim().length < 10) {
      throw new AppError('Please provide more details about your issue', 400);
    }

    // Check if booking exists
    const booking = await Booking.findById(bookingId)
      .populate('senderId', 'fullName')
      .populate('travelerId', 'fullName');
    
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Verify the user is the sender of this booking
    if (booking.senderId._id.toString() !== req.user!.userId) {
      throw new AppError('You can only submit disputes for your own bookings', 403);
    }

    // Check if a dispute already exists for this booking
    const existingDispute = await Dispute.findOne({ bookingId });
    if (existingDispute) {
      throw new AppError('A dispute has already been submitted for this booking', 409);
    }

    // Get delivery information
    const delivery = await DeliveryRequest.findOne({ bookingId });

    // Create the dispute
    const dispute = await Dispute.create({
      bookingId,
      raisedBy: req.user!.userId,
      reason: reason.trim(),
      description: description?.trim() || reason.trim(),
      status: 'open',
    });

    // Populate the created dispute
    const populatedDispute = await Dispute.findById(dispute._id)
      .populate('bookingId')
      .populate('raisedBy', 'fullName email');

    res.status(201).json({ 
      success: true, 
      dispute: populatedDispute,
      message: 'Dispute submitted successfully'
    });
  } catch (err) {
    next(err);
  }
}

export async function getDisputes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const disputes = await Dispute.find()
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'senderId', select: 'fullName email phone' },
          { path: 'travelerId', select: 'fullName email phone' },
          { 
            path: 'deliveryId',
            select: 'title description pickupAddress dropoffAddress photos status'
          }
        ]
      })
      .populate('raisedBy', 'fullName email phone')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, disputes });
  } catch (err) {
    next(err);
  }
}

export async function updateDispute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const dispute = await Dispute.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, dispute });
  } catch (err) {
    next(err);
  }
}

export async function resolveDispute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    const dispute = await Dispute.findById(id);
    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    dispute.status = 'resolved';
    if (resolution) {
      dispute.resolution = resolution;
    }
    await dispute.save();

    const populatedDispute = await Dispute.findById(id)
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'senderId', select: 'fullName email' },
          { path: 'travelerId', select: 'fullName email' }
        ]
      })
      .populate('raisedBy', 'fullName email');

    res.json({ 
      success: true, 
      dispute: populatedDispute,
      message: 'Dispute resolved successfully'
    });
  } catch (err) {
    next(err);
  }
}

export async function rejectDispute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const dispute = await Dispute.findById(id);
    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    dispute.status = 'closed';
    if (reason) {
      dispute.resolution = `Rejected: ${reason}`;
    }
    await dispute.save();

    const populatedDispute = await Dispute.findById(id)
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'senderId', select: 'fullName email' },
          { path: 'travelerId', select: 'fullName email' }
        ]
      })
      .populate('raisedBy', 'fullName email');

    res.json({ 
      success: true, 
      dispute: populatedDispute,
      message: 'Dispute rejected successfully'
    });
  } catch (err) {
    next(err);
  }
}

export async function getDisputeById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const dispute = await Dispute.findById(id)
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'senderId', select: 'fullName email phone' },
          { path: 'travelerId', select: 'fullName email phone' },
          { 
            path: 'deliveryId',
            select: 'title description pickupAddress dropoffAddress photos status timeline'
          }
        ]
      })
      .populate('raisedBy', 'fullName email phone');

    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    res.json({ success: true, dispute });
  } catch (err) {
    next(err);
  }
}
