import { Response, NextFunction } from 'express';
import { Review, User, Booking } from '../models';
import { AuthRequest } from '../types/authRequest';
import { AppError } from '../middleware/errorHandler';

export async function createReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { bookingId, revieweeId, rating, comment } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.status !== 'completed') {
      throw new AppError('Reviews are only allowed after delivery is completed', 400);
    }

    const isSender = booking.senderId.toString() === req.user!.userId;
    const isTraveler = booking.travelerId.toString() === req.user!.userId;
    if (!isSender && !isTraveler) throw new AppError('Unauthorized', 403);

    const expectedReviewee = isSender ? booking.travelerId.toString() : booking.senderId.toString();
    if (revieweeId !== expectedReviewee) {
      throw new AppError('Invalid reviewee for this booking', 400);
    }

    const existing = await Review.findOne({ bookingId, reviewerId: req.user!.userId });
    if (existing) throw new AppError('You already reviewed this booking', 409);

    const review = await Review.create({
      bookingId,
      reviewerId: req.user!.userId,
      revieweeId,
      rating,
      comment,
    });

    const reviews = await Review.find({ revieweeId });
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    await User.findByIdAndUpdate(revieweeId, { trustScore: Math.round(avg * 10) / 10 });

    const allReviews = await Review.find({ bookingId });
    const bothReviewed =
      allReviews.some((r) => r.reviewerId.toString() === booking.senderId.toString()) &&
      allReviews.some((r) => r.reviewerId.toString() === booking.travelerId.toString());

    res.status(201).json({
      success: true,
      review,
      bothReviewed,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBookingReviewStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError('Booking not found', 404);

    const reviews = await Review.find({ bookingId });
    const senderReviewed = reviews.some(
      (r) => r.reviewerId.toString() === booking.senderId.toString()
    );
    const travelerReviewed = reviews.some(
      (r) => r.reviewerId.toString() === booking.travelerId.toString()
    );

    const userId = req.user!.userId;
    const canReview =
      booking.status === 'completed' &&
      ((userId === booking.senderId.toString() && !senderReviewed) ||
        (userId === booking.travelerId.toString() && !travelerReviewed));

    const revieweeId =
      userId === booking.senderId.toString()
        ? booking.travelerId.toString()
        : booking.senderId.toString();

    res.json({
      success: true,
      senderReviewed,
      travelerReviewed,
      canReview,
      revieweeId: canReview ? revieweeId : null,
      bookingCompleted: booking.status === 'completed',
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyReviews(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const role = req.user!.activeRole || req.user!.role;

    let reviews;
    
    if (role === 'traveler') {
      // Traveler: get reviews they received (where they are the reviewee)
      reviews = await Review.find({ revieweeId: userId })
        .populate('reviewerId', 'fullName profilePhoto')
        .sort({ createdAt: -1 });
    } else {
      // Sender: get reviews they wrote (where they are the reviewer)
      reviews = await Review.find({ reviewerId: userId })
        .populate('revieweeId', 'fullName profilePhoto')
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      reviews,
      role,
    });
  } catch (err) {
    next(err);
  }
}
