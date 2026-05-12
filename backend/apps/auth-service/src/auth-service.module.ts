import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/database';
import { CommonModule } from '@app/common';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    CommonModule,
    AuthModule,
    CompaniesModule,
  ],
})
export class AuthServiceModule {}
