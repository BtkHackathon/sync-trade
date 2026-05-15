import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AnalyzeSpecDto {
  @ApiPropertyOptional({
    description: 'Raw tender/specification text. Use this when no PDF/text file is uploaded.',
    example:
      'Manisa ofisimiz icin 500 adet ergonomik calisma koltugu gerekiyor. Maksimum butce 1.000.000 TL. Teslimat 15 Haziran.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  text?: string;
}
