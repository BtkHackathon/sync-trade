import { Controller, Get } from '@nestjs/common';
import { Public } from '@app/common';

@Controller()
export class GatewayController {
  @Get('status')
  @Public()
  getStatus() {
    return { status: 'ok', service: 'gateway' };
  }
}
