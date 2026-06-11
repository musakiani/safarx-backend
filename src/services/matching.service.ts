import { Trip } from '../models/Trip';
import { User } from '../models/User';

interface MatchParams {
  pickupCity: string;
  pickupCountry: string;
  dropoffCity: string;
  dropoffCountry: string;
  preferredDate: Date;
  weightKg: number;
}

export async function findMatchingTrips(params: MatchParams) {
  const { pickupCity, pickupCountry, dropoffCity, dropoffCountry, preferredDate, weightKg } =
    params;

  const dateStart = new Date(preferredDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(preferredDate);
  dateEnd.setHours(23, 59, 59, 999);

  const trips = await Trip.find({
    isActive: true,
    sourceCity: new RegExp(pickupCity, 'i'),
    sourceCountry: new RegExp(pickupCountry, 'i'),
    destinationCity: new RegExp(dropoffCity, 'i'),
    destinationCountry: new RegExp(dropoffCountry, 'i'),
    departureDate: { $gte: dateStart, $lte: dateEnd },
    availableCapacityKg: { $gte: weightKg },
  })
    .populate('travelerId', 'fullName trustScore profilePhoto kycStatus')
    .sort({ createdAt: -1 })
    .lean();

  const approved = trips.filter((t) => {
    const traveler = t.travelerId as unknown as { kycStatus?: string };
    return traveler?.kycStatus === 'approved';
  });

  approved.sort((a, b) => {
    const ta = (a.travelerId as unknown as { trustScore?: number })?.trustScore || 0;
    const tb = (b.travelerId as unknown as { trustScore?: number })?.trustScore || 0;
    return tb - ta;
  });

  return approved;
}
