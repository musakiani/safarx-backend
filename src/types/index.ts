export type UserRole = 'sender' | 'traveler' | 'both' | 'admin';
export type KYCStatus = 'not_started' | 'pending' | 'approved' | 'rejected';
export type DeliveryStatus =
  | 'pending_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'proof_submitted'
  | 'delivered'
  | 'completed'
  | 'disputed';
export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
export type EscrowStatus = 'pending' | 'held' | 'released' | 'refunded';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  activeRole?: UserRole;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatbotRequest {
  message: string;
  conversationId?: string;
  history?: ChatMessage[];
}

export interface ChatbotResponse {
  success: boolean;
  answer?: string;
  sources?: unknown[];
  conversationId?: string;
  message?: string;
}
