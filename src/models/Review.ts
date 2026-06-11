import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  bookingId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  revieweeId: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    revieweeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ReviewSchema.index({ bookingId: 1, reviewerId: 1 }, { unique: true });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
