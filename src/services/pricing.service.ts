import Groq from 'groq-sdk';
import { config } from '../config';

interface PricingParams {
  fromCity: string;
  toCity: string;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  packageType?: string;
}

interface CompetitorPrice {
  name: string;
  price: number;
  deliveryDays: string;
}

interface PricingResult {
  competitors: CompetitorPrice[];
  averageMarketPrice: number;
  safarxPrice: number;
  savings: number;
  savingsPercent: number;
  distanceKm: number;
  reasoning: string;
}

// Fallback prices if AI fails or returns bad data
const FALLBACK_COMPETITORS: CompetitorPrice[] = [
  { name: 'TCS', price: 650, deliveryDays: '1-2 days' },
  { name: 'Leopard Courier', price: 600, deliveryDays: '1-2 days' },
  { name: 'M&P', price: 550, deliveryDays: '2-3 days' },
  { name: 'Blue EX', price: 580, deliveryDays: '2-3 days' },
];

function buildFallbackResult(distanceKm = 500): PricingResult {
  const avgPrice = FALLBACK_COMPETITORS.reduce((s, c) => s + c.price, 0) / FALLBACK_COMPETITORS.length;
  const safarxPrice = Math.round(avgPrice * 0.85);
  return {
    competitors: FALLBACK_COMPETITORS,
    averageMarketPrice: Math.round(avgPrice),
    safarxPrice,
    savings: Math.round(avgPrice - safarxPrice),
    savingsPercent: 15,
    distanceKm,
    reasoning: 'Based on standard market rates',
  };
}

export async function getDynamicPricing(params: PricingParams): Promise<PricingResult> {
  // If no Groq key configured, return fallback immediately
  if (!config.groqApiKey) {
    return buildFallbackResult();
  }

  const groq = new Groq({ apiKey: config.groqApiKey });

  const volumetricWeight =
    params.lengthCm && params.widthCm && params.heightCm
      ? (params.lengthCm * params.widthCm * params.heightCm) / 5000
      : null;

  const chargeableWeight = volumetricWeight
    ? Math.max(params.weightKg, volumetricWeight)
    : params.weightKg;

  const prompt = `You are a Pakistani courier pricing expert. Give realistic pricing estimates for shipping a parcel from ${params.fromCity} to ${params.toCity} in Pakistan.

Parcel details:
- Actual weight: ${params.weightKg} kg
- Chargeable weight: ${chargeableWeight.toFixed(2)} kg
${params.lengthCm ? `- Dimensions: ${params.lengthCm}cm x ${params.widthCm}cm x ${params.heightCm}cm` : ''}
- Package type: ${params.packageType || 'general'}

Respond ONLY with a valid JSON object, no extra text, no markdown:
{
  "distanceKm": 1200,
  "competitors": [
    { "name": "TCS", "price": 650, "deliveryDays": "1-2 days" },
    { "name": "Leopard Courier", "price": 600, "deliveryDays": "1-2 days" },
    { "name": "M&P", "price": 550, "deliveryDays": "2-3 days" },
    { "name": "Blue EX", "price": 580, "deliveryDays": "2-3 days" }
  ],
  "reasoning": "short reason here"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() ?? '';

    // Extract JSON — AI sometimes wraps in markdown code blocks
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Pricing] AI returned non-JSON response, using fallback');
      return buildFallbackResult();
    }

    let data: { distanceKm?: unknown; competitors?: unknown[]; reasoning?: unknown };
    try {
      data = JSON.parse(jsonMatch[0]);
    } catch {
      console.warn('[Pricing] JSON parse failed, using fallback');
      return buildFallbackResult();
    }

    // Validate competitors array
    const rawCompetitors = Array.isArray(data.competitors) ? data.competitors : [];
    const validCompetitors: CompetitorPrice[] = rawCompetitors
      .filter(
        (c): c is CompetitorPrice =>
          typeof c === 'object' &&
          c !== null &&
          typeof (c as CompetitorPrice).name === 'string' &&
          typeof (c as CompetitorPrice).price === 'number' &&
          (c as CompetitorPrice).price > 0 &&
          isFinite((c as CompetitorPrice).price),
      )
      .map((c) => ({
        name: String(c.name),
        price: Math.round(Number(c.price)),
        deliveryDays: String(c.deliveryDays ?? '2-3 days'),
      }));

    // If AI returned no valid competitors, fall back
    if (validCompetitors.length === 0) {
      console.warn('[Pricing] No valid competitors in AI response, using fallback');
      return buildFallbackResult(Number(data.distanceKm) || 500);
    }

    const avgPrice =
      validCompetitors.reduce((sum, c) => sum + c.price, 0) / validCompetitors.length;

    // Guard against NaN/Infinity
    if (!isFinite(avgPrice) || avgPrice <= 0) {
      return buildFallbackResult(Number(data.distanceKm) || 500);
    }

    const discount = 0.15;
    const safarxPrice = Math.round(avgPrice * (1 - discount));
    const savings = Math.round(avgPrice - safarxPrice);
    const distanceKm =
      typeof data.distanceKm === 'number' && isFinite(data.distanceKm) && data.distanceKm > 0
        ? Math.round(data.distanceKm)
        : 500;

    return {
      competitors: validCompetitors,
      averageMarketPrice: Math.round(avgPrice),
      safarxPrice,
      savings,
      savingsPercent: Math.round(discount * 100),
      distanceKm,
      reasoning: typeof data.reasoning === 'string' ? data.reasoning : '',
    };
  } catch (err) {
    // Any unexpected error — return fallback so app never crashes
    console.error('[Pricing] Unexpected error, using fallback:', err);
    return buildFallbackResult();
  }
}
