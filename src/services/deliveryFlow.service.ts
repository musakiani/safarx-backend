import { DeliveryStatus } from '../types';

const ALLOWED: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending_pickup: ['picked_up'],
  picked_up: ['in_transit'],
  in_transit: ['proof_submitted'],
  proof_submitted: ['delivered'],
  delivered: ['completed', 'disputed'],
  completed: [],
  disputed: [],
};

export function canTransition(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export const TRAVELER_STATUSES: DeliveryStatus[] = [
  'picked_up',
  'in_transit',
  'proof_submitted',
  'delivered',
];

export const SENDER_STATUSES: DeliveryStatus[] = ['completed', 'disputed'];
