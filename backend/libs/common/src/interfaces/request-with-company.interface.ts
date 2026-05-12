import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';

export interface RequestWithCompany extends Request {
  user: JwtPayload;
}
