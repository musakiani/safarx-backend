import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { hashPassword, comparePassword, signToken } from '../services/auth.service';
import { sendOtpEmail } from '../services/email.service';
import { config } from '../config';
import { AuthRequest } from '../types/authRequest';
import { AppError } from '../middleware/errorHandler';

const otpStore = new Map<string, { otp: string; expires: number; purpose: string }>();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  emailOrUsername: z.string(),
  password: z.string(),
});

export async function register(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await User.findOne({
      $or: [{ email: data.email.toLowerCase() }, { username: data.username }],
    });
    if (existing) {
      if (existing.email === data.email.toLowerCase()) {
        throw new AppError('This email is already registered', 409);
      }
      throw new AppError('This username is already taken', 409);
    }

    const hashed = await hashPassword(data.password);
    const user = await User.create({
      ...data,
      email: data.email.toLowerCase(),
      password: hashed,
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(data.email.toLowerCase(), {
      otp,
      expires: Date.now() + 10 * 60 * 1000,
      purpose: 'register',
    });
    await sendOtpEmail(data.email, otp);

    res.status(201).json({
      success: true,
      message: config.isEmailConfigured
        ? 'Registration successful. Please check your email for the OTP.'
        : 'Registration successful. Use the dev OTP shown below (email not configured).',
      userId: user._id,
      ...(config.isEmailConfigured ? {} : { devOtp: otp }),
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { emailOrUsername, password } = loginSchema.parse(req.body);
    const user = await User.findOne({
      $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername }],
    });
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await comparePassword(password, user.password);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const token = signToken({
      userId: user._id.toString(),
      role: user.isAdmin ? 'admin' : user.role,
      activeRole: user.activeRole || user.role,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        activeRole: user.activeRole || user.role,
        canSwitchRoles: user.canSwitchRoles || user.role === 'both',
        kycStatus: user.kycStatus,
        kycRejectionReason: user.kycRejectionReason,
        isAdmin: user.isAdmin,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function sendOtp(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, purpose = 'verify' } = req.body;
    if (!email) throw new AppError('Email required');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email.toLowerCase(), {
      otp,
      expires: Date.now() + 10 * 60 * 1000,
      purpose,
    });
    await sendOtpEmail(email, otp);
    res.json({
      success: true,
      message: config.isEmailConfigured
        ? 'OTP sent'
        : 'OTP generated (dev mode — check server terminal or devOtp in response)',
      ...(config.isEmailConfigured ? {} : { devOtp: otp }),
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, otp } = req.body;
    const stored = otpStore.get(email?.toLowerCase());
    if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
      throw new AppError('Invalid or expired OTP', 400);
    }
    otpStore.delete(email.toLowerCase());
    await User.findOneAndUpdate({ email: email.toLowerCase() }, { isEmailVerified: true });
    res.json({ success: true, message: 'OTP verified' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      res.json({ success: true, message: 'If account exists, OTP sent' });
      return;
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email.toLowerCase(), {
      otp,
      expires: Date.now() + 10 * 60 * 1000,
      purpose: 'reset',
    });
    await sendOtpEmail(email, otp);
    res.json({
      success: true,
      message: config.isEmailConfigured
        ? 'If account exists, OTP sent to email'
        : 'If account exists, use devOtp from response (email not configured)',
      ...(config.isEmailConfigured ? {} : { devOtp: otp }),
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, otp, newPassword } = req.body;
    const stored = otpStore.get(email?.toLowerCase());
    if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
      throw new AppError('Invalid or expired OTP', 400);
    }
    const hashed = await hashPassword(newPassword);
    await User.findOneAndUpdate({ email: email.toLowerCase() }, { password: hashed });
    otpStore.delete(email.toLowerCase());
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
}

export async function forgotUsername(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (user) {
      await sendOtpEmail(email, `Your username is: ${user.username}`);
    }
    res.json({ success: true, message: 'If account exists, username sent to email' });
  } catch (err) {
    next(err);
  }
}

export async function selectRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { role, email, password } = req.body;
    if (!['sender', 'traveler', 'both'].includes(role)) throw new AppError('Invalid role');

    let userId = req.user?.userId;
    let isInitialSetup = false;

    // Fallback: if no token, allow email+password auth for role selection right after registration
    if (!userId && email && password) {
      const user = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username: email }],
      });
      if (!user) throw new AppError('User not found', 404);
      const valid = await import('../services/auth.service').then(m => m.comparePassword(password, user.password));
      if (!valid) throw new AppError('Invalid credentials', 401);
      userId = user._id.toString();
      isInitialSetup = true;
    }

    if (!userId) throw new AppError('Unauthorized', 401);

    const existingUser = await User.findById(userId);
    if (!existingUser) throw new AppError('User not found', 404);

    // If this is initial role setup during registration
    if (isInitialSetup) {
      const canSwitch = role === 'both';
      const initialActiveRole = role === 'both' ? 'sender' : role;
      
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          role, 
          activeRole: initialActiveRole,
          canSwitchRoles: canSwitch 
        },
        { new: true }
      ).select('-password');
      
      res.json({ success: true, user });
      return;
    }

    // If user is trying to switch roles after registration
    // Check if they have permission to switch
    if (!existingUser.canSwitchRoles && existingUser.role !== 'both') {
      throw new AppError('You do not have permission to switch roles. Your account is locked to ' + existingUser.role + ' mode.', 403);
    }

    // Only allow switching between sender and traveler, not changing the base role
    if (!['sender', 'traveler'].includes(role)) {
      throw new AppError('Invalid role for switching', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { activeRole: role },
      { new: true }
    ).select('-password');
    
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}
