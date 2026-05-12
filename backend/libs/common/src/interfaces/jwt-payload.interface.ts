import { CompanyRole } from '../enums/company-role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: CompanyRole;
  name: string;
  iat?: number;
  exp?: number;
}
