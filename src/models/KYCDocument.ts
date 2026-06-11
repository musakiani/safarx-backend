import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IKYCDocument extends Document {
  userId: Types.ObjectId;
  kycProfileId: Types.ObjectId;
  type: 'cnic_front' | 'cnic_back' | 'selfie' | 'other';
  url: string;
  uploadedAt: Date;
}

const KYCDocumentSchema = new Schema<IKYCDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  kycProfileId: { type: Schema.Types.ObjectId, ref: 'KYCProfile', required: true },
  type: { type: String, enum: ['cnic_front', 'cnic_back', 'selfie', 'other'], required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

export const KYCDocument = mongoose.model<IKYCDocument>('KYCDocument', KYCDocumentSchema);
