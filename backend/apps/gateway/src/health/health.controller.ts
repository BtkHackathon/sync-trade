import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Gateway sağlık kontrolü' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
