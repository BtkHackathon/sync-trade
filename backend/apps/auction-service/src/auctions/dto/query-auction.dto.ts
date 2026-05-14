import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { AuctionStatus } from '@app/common';

export class QueryAuctionDto {
  @ApiPropertyOptional({ enum: AuctionStatus, example: AuctionStatus.OPEN })
  @IsOptional()
  @IsEnum(AuctionStatus)
  status?: AuctionStatus;

  @ApiPropertyOptional({ description: 'Belirli bir alıcıya ait ihaleler ("Benim ihalelerim" için)' })
  @IsOptional()
  @IsUUID()
  buyerId?: string;

  @ApiPropertyOptional({ example: 'Ofis Mobilyasi' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'koltuk', description: 'Title, description veya category icinde arar.' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
