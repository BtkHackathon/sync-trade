import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAuctionDto {
  @ApiProperty({ example: '500 Adet Ergonomik Ofis Koltugu Alimi' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title: string;

  @ApiProperty({
    example:
      'Manisa ofisi icin yuksek sirtli, bel destekli ergonomik calisma koltugu.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2500)
  description: string;

  @ApiProperty({ example: 'Ofis Mobilyasi' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category: string;

  @ApiProperty({ example: 500, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'adet' })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  unit: string;

  @ApiProperty({ example: 1000000, minimum: 1 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  maxBudget: number;

  @ApiProperty({ example: '2026-06-15T00:00:00.000Z' })
  @IsDateString()
  deliveryDeadline: string;

  @ApiProperty({ example: '2026-05-20T15:00:00.000Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ example: 'Manisa OSB, 45030 Manisa' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  deliveryAddress?: string;

  @ApiPropertyOptional({
    example: ['CE sertifikasi zorunlu', 'Garanti: min 3 yil'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({
    example: 'https://cdn.synctrade.dev/specs/ofis-koltugu.pdf',
  })
  @IsOptional()
  @IsString()
  specDocumentUrl?: string;
}
