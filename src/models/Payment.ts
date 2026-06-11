import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentStatus } from '../types';

export interface IPayment extends Document {
  bookingId: Types.ObjectId;
  senderId: Types.ObjectId;
  travelerId: Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeClientSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    travelerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded'],
      default: 'pending',
    },
    stripePaymentIntentId: String,
    stripeClientSecret: String,
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
