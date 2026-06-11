import { Response, NextFunction } from 'express';
import { Trip } from '../models';
import { AuthRequest } from '../types/authRequest';
import { AppError } from '../middleware/errorHandler';

export async function createTrip(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trip = await Trip.create({
      travelerId: req.user!.userId,
      ...req.body,
      departureDate: new Date(req.body.departureDate),
      arrivalDate: req.body.arrivalDate ? new Date(req.body.arrivalDate) : undefined,
    });
    res.status(201).json({ success: true, trip });
  } catch (err) {
    next(err);
  }
}

export async function getTrips(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const filter: Record<string, unknown> = { isActive: true };
    if (req.query.sourceCity) filter.sourceCity = new RegExp(req.query.sourceCity as string, 'i');
    if (req.query.destinationCity)
      filter.destinationCity = new RegExp(req.query.destinationCity as string, 'i');
    const trips = await Trip.find(filter)
      .populate('travelerId', 'fullName trustScore profilePhoto kycStatus')
      .sort({ departureDate: 1 });
    res.json({ success: true, trips });
  } catch (err) {
    next(err);
  }
}

export async function getMyTrips(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trips = await Trip.find({ travelerId: req.user!.userId }).sort({ createdAt: -1 });
    res.json({ success: true, trips });
  } catch (err) {
    next(err);
  }
}

export async function getTrip(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trip = await Trip.findById(req.params.id).populate(
      'travelerId',
      'fullName trustScore profilePhoto kycStatus phone'
    );
    if (!trip) throw new AppError('Trip not found', 404);
    res.json({ success: true, trip });
  } catch (err) {
    next(err);
  }
}

export async function deactivateTrip(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, travelerId: req.user!.userId },
      { isActive: false },
      { new: true }
    );
    if (!trip) throw new AppError('Trip not found', 404);
    res.json({ success: true, trip });
  } catch (err) {
    next(err);
  }
}
