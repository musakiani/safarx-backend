import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, KYCStatus } from '../types';

export interface IUser extends Document {
  email: string;
  username: string;
  password: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  activeRole?: UserRole;
  canSwitchRoles: boolean;
  profilePhoto?: string;
  kycStatus: KYCStatus;
  kycRejectionReason?: string;
  trustScore: number;
  isEmailVerified: boolean;
  isAdmin: boolean;
  language: string;
  addresses: {
    label: string;
    street: string;
    city: string;
    country: string;
    isDefault: boolean;
  }[];
  notificationSettings: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    bookingUpdates: boolean;
    deliveryUpdates: boolean;
    marketing: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    phone: String,
    role: { type: String, enum: ['sender', 'traveler', 'both', 'admin'], default: 'sender' },
    activeRole: { type: String, enum: ['sender', 'traveler', 'admin'] },
    canSwitchRoles: { type: Boolean, default: false },
    profilePhoto: String,
    kycStatus: {
      type: String,
      enum: ['not_started', 'pending', 'approved', 'rejected'],
      default: 'not_started',
    },
    kycRejectionReason: { type: String, default: null },
    trustScore: { type: Number, default: 5.0 },
    isEmailVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    language: { type: String, default: 'en' },
    addresses: [
      {
        label: String,
        street: String,
        city: String,
        country: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    notificationSettings: {
      pushEnabled: { type: Boolean, default: true },
      emailEnabled: { type: Boolean, default: true },
      bookingUpdates: { type: Boolean, default: true },
      deliveryUpdates: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
