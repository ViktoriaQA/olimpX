import { Request } from 'express';
import { User } from '../models/user';

export interface AuthenticatedRequest extends Request {
  user?: User;
}
