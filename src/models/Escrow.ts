import mongoose, { Schema, Document, Types } from 'mongoose';
import { EscrowStatus } from '../types';

export interface IEscrow extends Document {
  paymentId: Types.ObjectId;
  bookingId: Types.ObjectId;
  amount: number;
  currency: string;
  platformCommissionRate: number;
  platformCommission: number;
  travelerPayout: number;
  status: EscrowStatus;
  heldAt?: Date;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EscrowSchema = new Schema<IEscrow>(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    platformCommissionRate: { type: Number, default: 0.1 },
    platformCommission: { type: Number, default: 0 },
    travelerPayout: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'held', 'released', 'refunded'],
      default: 'pending',
    },
    heldAt: Date,
    releasedAt: Date,
  },
  { timestamps: true }
);

export const Escrow = mongoose.model<IEscrow>('Escrow', EscrowSchema);
