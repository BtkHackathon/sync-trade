import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class PlaceBidDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  auctionId: string;

  @ApiProperty({ example: 95000.5, description: 'Tersine ihale: mevcut en iyi tekliften dusuk olmali' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
