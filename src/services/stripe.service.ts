import Stripe from 'stripe';
import { config } from '../config';

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!config.stripeSecretKey) return null;
  if (!stripe) {
    stripe = new Stripe(config.stripeSecretKey, { apiVersion: '2025-02-24.acacia' });
  }
  return stripe;
}

export async function createPaymentIntent(
  amount: number,
  currency: string,
  metadata: Record<string, string>
): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  const s = getStripe();
  if (!s) {
    // Dev fallback when Stripe not configured
    return {
      clientSecret: 'mock_client_secret',
      paymentIntentId: `pi_mock_${Date.now()}`,
    };
  }
  const intent = await s.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  });
  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
  };
}
