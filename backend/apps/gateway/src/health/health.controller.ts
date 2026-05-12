import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

// TODO: Tüm servislere ping at, sağlık durumlarını toplu döndür
// TODO: @Public() decorator ekle (auth gerektirmesin)

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Gateway sağlık kontrolü' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
