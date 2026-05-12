import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsArray,
} from 'class-validator';
import { CompanyRole } from '@app/common';

export class RegisterDto {
  @ApiProperty({ example: 'Tekstil Fabrikası A.Ş.' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'info@tekstilfabrikasi.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Gizli@Sifre123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: CompanyRole, example: CompanyRole.BUYER })
  @IsEnum(CompanyRole)
  role: CompanyRole;

  @ApiPropertyOptional({ example: 'Tekstil' })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: '+905551234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Bursa, Türkiye' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Bursa' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'TR' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ example: ['ISO 9001', 'OEKO-TEX'], description: 'Tedarikçi sertifikaları' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ example: ['Pamuklu kumaş', 'Polyester'], description: 'Uzmanlık alanları' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];
}
