import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { Request, Response } from 'express';

type UpstreamKey = 'auth' | 'auction' | 'bid' | 'ai';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async upstream(key: UpstreamKey, req: Request, res: Response): Promise<void> {
    const base = this.baseUrl(key);
    const targetUrl = `${base}${req.originalUrl}`;

    try {
      const upstream = await firstValueFrom(
        this.http.request({
          method: req.method,
          url: targetUrl,
          headers: this.forwardHeaders(req),
          data: this.shouldSendBody(req.method) ? req.body : undefined,
          validateStatus: () => true,
          maxRedirects: 0,
        }),
      );

      res.status(upstream.status);
      for (const [name, value] of Object.entries(upstream.headers)) {
        if (value === undefined) continue;
        const lower = name.toLowerCase();
        if (
          ['transfer-encoding', 'connection', 'content-encoding'].includes(
            lower,
          )
        ) {
          continue;
        }
        res.setHeader(name, value as string | string[]);
      }
      res.send(upstream.data);
    } catch (err) {
      this.logger.error(
        `Upstream ${key} hata: ${targetUrl}`,
        err instanceof Error ? err.stack : String(err),
      );
      if (!res.headersSent) {
        res.status(502).json({
          message: 'Upstream servise ulaşılamadı.',
          target: targetUrl,
        });
      }
    }
  }

  private baseUrl(key: UpstreamKey): string {
    const defaults: Record<UpstreamKey, string> = {
      auth: 'http://localhost:3001',
      auction: 'http://localhost:3002',
      bid: 'http://localhost:3003',
      ai: 'http://localhost:3004',
    };
    const envKeys: Record<UpstreamKey, string> = {
      auth: 'AUTH_SERVICE_URL',
      auction: 'AUCTION_SERVICE_URL',
      bid: 'BID_SERVICE_URL',
      ai: 'AI_SERVICE_URL',
    };
    return this.config.get<string>(envKeys[key], defaults[key]);
  }

  private forwardHeaders(req: Request): Record<string, string> {
    const out: Record<string, string> = {};
    const allow = [
      'authorization',
      'content-type',
      'accept',
      'accept-language',
      'x-request-id',
    ];
    for (const key of allow) {
      const v = req.headers[key];
      if (typeof v === 'string' && v.length > 0) {
        out[key] = v;
      }
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
      req.socket.remoteAddress ??
      '';
    if (clientIp) {
      out['x-forwarded-for'] = clientIp;
    }

    return out;
  }

  private shouldSendBody(method: string): boolean {
    return !['GET', 'HEAD'].includes(method.toUpperCase());
  }
}
