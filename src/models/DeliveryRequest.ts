import mongoose, { Schema, Document, Types } from 'mongoose';
import { DeliveryStatus } from '../types';

export interface IDeliveryRequest extends Document {
  senderId: Types.ObjectId;
  title: string;
  description?: string;
  packageType?: string;
  pickupCity: string;
  pickupCountry: string;
  pickupAddress: string;
  dropoffCity: string;
  dropoffCountry: string;
  dropoffAddress: string;
  receiverName?: string;
  receiverPhone?: string;
  preferredDate: Date;
  weightKg: number;
  widthCm?: number;
  heightCm?: number;
  lengthCm?: number;
  dimensions?: string;
  photos: string[];
  proofPhotos: string[];
  status: DeliveryStatus;
  bookingId?: Types.ObjectId;
  travelerId?: Types.ObjectId;
  travelerLocation?: { lat: number | null; lng: number | null; updatedAt: Date | null };
  timeline: { status: DeliveryStatus; note?: string; at: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryRequestSchema = new Schema<IDeliveryRequest>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    packageType: String,
    pickupCity: { type: String, required: true },
    pickupCountry: { type: String, required: true },
    pickupAddress: { type: String, required: true },
    dropoffCity: { type: String, required: true },
    dropoffCountry: { type: String, required: true },
    dropoffAddress: { type: String, required: true },
    receiverName: String,
    receiverPhone: String,
    preferredDate: { type: Date, required: true },
    weightKg: { type: Number, required: true },
    widthCm: Number,
    heightCm: Number,
    lengthCm: Number,
    dimensions: String,
    photos: [String],
    proofPhotos: { type: [String], default: [] },
    status: {
      type: String,
      enum: [
        'pending_pickup',
        'picked_up',
        'in_transit',
        'proof_submitted',
        'delivered',
        'completed',
        'disputed',
      ],
      default: 'pending_pickup',
    },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    travelerId: { type: Schema.Types.ObjectId, ref: 'User' },
    travelerLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
    timeline: [
      {
        status: String,
        note: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const DeliveryRequest = mongoose.model<IDeliveryRequest>(
  'DeliveryRequest',
  DeliveryRequestSchema
);
