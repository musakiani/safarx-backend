import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ success: false, message: err.errors[0]?.message || 'Validation error' });
    return;
  }
  const status = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal server error';
  console.error(err);
  res.status(status).json({ success: false, message });
}
