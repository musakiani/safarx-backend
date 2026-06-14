import { Response, NextFunction } from 'express';
import { KYCProfile, KYCDocument, User } from '../models';
import { AuthRequest } from '../types/authRequest';
import { AppError } from '../middleware/errorHandler';
import { getFileUrl } from '../middleware/upload';

export async function submitKYC(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { fullName, dateOfBirth, nationality, address } = req.body;
    let profile = await KYCProfile.findOne({ userId: req.user!.userId });
    if (!profile) {
      profile = await KYCProfile.create({
        userId: req.user!.userId,
        fullName,
        dateOfBirth,
        nationality,
        address,
        status: 'pending',
      });
    } else {
      Object.assign(profile, { fullName, dateOfBirth, nationality, address, status: 'pending' });
      await profile.save();
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (files?.length) {
      const typeMap: Record<number, 'cnic_front' | 'cnic_back' | 'selfie'> = {
        0: 'cnic_front',
        1: 'cnic_back',
        2: 'selfie',
      };
      for (let i = 0; i < files.length; i++) {
        await KYCDocument.create({
          userId: req.user!.userId,
          kycProfileId: profile._id,
          type: typeMap[i] || 'other',
          url: getFileUrl(files[i]),
        });
      }
    }

    await User.findByIdAndUpdate(req.user!.userId, { kycStatus: 'pending' });
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
}

export async function getMyKYC(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await KYCProfile.findOne({ userId: req.user!.userId });
    const documents = profile
      ? await KYCDocument.find({ kycProfileId: profile._id })
      : [];
    res.json({ success: true, profile, documents });
  } catch (err) {
    next(err);
  }
}

export async function getAllKYC(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profiles = await KYCProfile.find()
      .populate('userId', 'email fullName username phone')
      .sort({ createdAt: -1 });

    // Attach documents to each profile
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const documents = await KYCDocument.find({ kycProfileId: p._id }).sort({ uploadedAt: 1 });
        return { ...p.toObject(), documents };
      })
    );

    res.json({ success: true, profiles: enriched });
  } catch (err) {
    next(err);
  }
}

export async function approveKYC(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await KYCProfile.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', reviewedBy: req.user!.userId, reviewedAt: new Date() },
      { new: true }
    );
    if (!profile) throw new AppError('KYC not found', 404);
    await User.findByIdAndUpdate(profile.userId, {
      kycStatus: 'approved',
      kycRejectionReason: null,
    });
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
}

export async function rejectKYC(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body;
    const profile = await KYCProfile.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectionReason: reason,
        reviewedBy: req.user!.userId,
        reviewedAt: new Date(),
      },
      { new: true }
    );
    if (!profile) throw new AppError('KYC not found', 404);
    await User.findByIdAndUpdate(profile.userId, {
      kycStatus: 'rejected',
      kycRejectionReason: reason,
    });
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
}
