import { SetMetadata } from '@nestjs/common';
import { CompanyRole } from '../enums/company-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: CompanyRole[]) => SetMetadata(ROLES_KEY, roles);
