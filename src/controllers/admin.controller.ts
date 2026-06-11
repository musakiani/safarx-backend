import { Response, NextFunction } from 'express';
import {
  User,
  DeliveryRequest,
  Booking,
  Payment,
  Escrow,
  Dispute,
  SupportTicket,
  KYCProfile,
} from '../models';
import { AuthRequest } from '../types/authRequest';

export async function getDashboard(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [
      totalUsers,
      pendingKYC,
      activeDeliveries,
      totalBookings,
      heldEscrow,
      openDisputes,
      openTickets,
    ] = await Promise.all([
      User.countDocuments(),
      KYCProfile.countDocuments({ status: 'pending' }),
      DeliveryRequest.countDocuments({ status: { $nin: ['completed', 'disputed'] } }),
      Booking.countDocuments(),
      Escrow.countDocuments({ status: 'held' }),
      Dispute.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'open' }),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        pendingKYC,
        activeDeliveries,
        totalBookings,
        heldEscrow,
        openDisputes,
        openTickets,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUsers(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
}

export async function getAllDeliveries(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const deliveries = await DeliveryRequest.find()
      .populate('senderId', 'fullName email')
      .populate('travelerId', 'fullName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, deliveries });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { fullName, email, username, phone, role, kycStatus, trustScore } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { fullName, email, username, phone, role, kycStatus, trustScore },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isAdmin) return res.status(403).json({ success: false, message: 'Cannot delete admin account' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getAllPayments(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payments = await Payment.find()
      .populate('bookingId')
      .sort({ createdAt: -1 });
    const escrows = await Escrow.find().populate('bookingId');
    res.json({ success: true, payments, escrows });
  } catch (err) {
    next(err);
  }
}
