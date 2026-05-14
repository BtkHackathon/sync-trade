import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@app/common';

/**
 * Swagger + health acik; diger tum /api/* istekleri JWT ister.
 */
@Injectable()
export class GatewayJwtAuthGuard extends JwtAuthGuard {
  constructor(reflector: Reflector) {
    super(reflector);
  }

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const raw = (req.originalUrl ?? req.url ?? '') as string;
    const path = raw.split('?')[0];

    const publicPrefixes = ['/api/health', '/api/auth/register', '/api/auth/login', '/api/docs'];
    for (const p of publicPrefixes) {
      if (path === p || path.startsWith(`${p}/`)) {
        return true;
      }
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}
