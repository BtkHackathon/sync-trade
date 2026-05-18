import { ConfigService } from '@nestjs/config';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export function resolveCorsOrigins(raw?: string): string[] {
  const origins = raw
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins && origins.length > 0 ? origins : DEFAULT_CORS_ORIGINS;
}

export function buildCorsOptions(config: ConfigService) {
  return {
    origin: resolveCorsOrigins(config.get<string>('CORS_ORIGINS')),
  };
}

export function buildSocketCorsOptions() {
  return {
    origin: resolveCorsOrigins(process.env.CORS_ORIGINS),
  };
}
