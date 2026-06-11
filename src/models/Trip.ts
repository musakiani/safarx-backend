import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITrip extends Document {
  travelerId: Types.ObjectId;
  sourceCity: string;
  sourceCountry: string;
  destinationCity: string;
  destinationCountry: string;
  departureDate: Date;
  arrivalDate?: Date;
  arrivalTime?: string;
  availableCapacityKg: number;
  volumeLiters?: number;
  transportMode?: string;
  acceptedItemTypes?: string[];
  suggestedReward?: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    travelerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sourceCity: { type: String, required: true },
    sourceCountry: { type: String, required: true },
    destinationCity: { type: String, required: true },
    destinationCountry: { type: String, required: true },
    departureDate: { type: Date, required: true },
    arrivalDate: Date,
    availableCapacityKg: { type: Number, required: true },
    volumeLiters: Number,
    transportMode: String,
    acceptedItemTypes: [String],
    suggestedReward: Number,
    notes: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Trip = mongoose.model<ITrip>('Trip', TripSchema);
