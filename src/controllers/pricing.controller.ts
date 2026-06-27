import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/authRequest';
import { getDynamicPricing } from '../services/pricing.service';
import { z } from 'zod';

const pricingSchema = z.object({
  fromCity: z.string().min(1),
  toCity: z.string().min(1),
  weightKg: z.number().positive(),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  packageType: z.string().optional(),
});

export async function getPricing(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const parsed = pricingSchema.safeParse({
      ...req.body,
      weightKg: Number(req.body.weightKg),
      lengthCm: req.body.lengthCm ? Number(req.body.lengthCm) : undefined,
      widthCm: req.body.widthCm ? Number(req.body.widthCm) : undefined,
      heightCm: req.body.heightCm ? Number(req.body.heightCm) : undefined,
    });

    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid input', errors: parsed.error.errors });
      return;
    }

    const result = await getDynamicPricing(parsed.data);
    res.json({ success: true, pricing: result });
  } catch (err) {
    next(err);
  }
}
