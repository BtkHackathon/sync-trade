import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@ApiExcludeController()
@Controller('auth')
export class AuthProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All()
  forwardRoot(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.upstream('auth', req, res);
  }

  @All('*')
  forwardNested(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.upstream('auth', req, res);
  }
}

@ApiExcludeController()
@Controller('companies')
export class CompaniesProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All()
  forwardRoot(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.upstream('auth', req, res);
  }

  @All('*')
  forwardNested(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.upstream('auth', req, res);
  }
}

@ApiExcludeController()
@Controller('auctions')
export class AuctionsProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All()
  forwardRoot(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.upstream('auction', req, res);
  }

  @All('*')
  forwardNested(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.upstream('auction', req, res);
  }
}

@ApiExcludeController()
@Controller('bids')
export class BidsProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All()
  forwardRoot(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.upstream('bid', req, res);
  }

  @All('*')
  forwardNested(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.upstream('bid', req, res);
  }
}

@ApiExcludeController()
@Controller('ai')
export class AiProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All()
  forwardRoot(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.upstream('ai', req, res);
  }

  @All('*')
  forwardNested(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.upstream('ai', req, res);
  }
}
