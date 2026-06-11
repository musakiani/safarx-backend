import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDispute extends Document {
  bookingId: Types.ObjectId;
  raisedBy: Types.ObjectId;
  reason: string;
  description?: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    description: String,
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'closed'],
      default: 'open',
    },
    resolution: String,
  },
  { timestamps: true }
);

export const Dispute = mongoose.model<IDispute>('Dispute', DisputeSchema);
