import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Global olarak tüm servislere uygulanır.
 * - AllExceptionsFilter: tüm hataları yakala ve standart formatta döndür
 * - ResponseInterceptor: başarılı yanıtları { success, data, timestamp } ile sar
 * - JwtAuthGuard: tüm endpoint'leri JWT ile koru (@Public() ile bypass edilebilir)
 * - RolesGuard: @Roles() decorator'ı ile rol kontrolü
 */
@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [PassportModule],
})
export class CommonModule {}
