import mongoose, { Schema, Document, Types } from 'mongoose';
import { BookingStatus } from '../types';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface IBooking extends Document {
  deliveryId: Types.ObjectId;
  tripId: Types.ObjectId;
  senderId: Types.ObjectId;
  travelerId: Types.ObjectId;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  message?: string;
  agreedPrice: number;
  currency: string;
  paidAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    deliveryId: { type: Schema.Types.ObjectId, ref: 'DeliveryRequest', required: true },
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    travelerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    message: String,
    agreedPrice: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    paidAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
