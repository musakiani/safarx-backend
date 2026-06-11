import mongoose, { Schema, Document, Types } from 'mongoose';
import { KYCStatus } from '../types';

export interface IKYCProfile extends Document {
  userId: Types.ObjectId;
  fullName: string;
  dateOfBirth?: Date;
  nationality?: string;
  address?: string;
  status: KYCStatus;
  rejectionReason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const KYCProfileSchema = new Schema<IKYCProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: false },
    dateOfBirth: Date,
    nationality: String,
    address: String,
    status: {
      type: String,
      enum: ['not_started', 'pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { timestamps: true }
);

export const KYCProfile = mongoose.model<IKYCProfile>('KYCProfile', KYCProfileSchema);
