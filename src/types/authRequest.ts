import { Request } from 'express';
import { JwtPayload } from './index';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
