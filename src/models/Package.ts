import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPackage extends Document {
  deliveryId: Types.ObjectId;
  senderId: Types.ObjectId;
  title: string;
  weightKg: number;
  photos: string[];
  createdAt: Date;
}

const PackageSchema = new Schema<IPackage>(
  {
    deliveryId: { type: Schema.Types.ObjectId, ref: 'DeliveryRequest', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    weightKg: { type: Number, required: true },
    photos: [String],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Package = mongoose.model<IPackage>('Package', PackageSchema);
