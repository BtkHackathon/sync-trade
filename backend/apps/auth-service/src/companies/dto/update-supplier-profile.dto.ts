import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateSupplierProfileDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['ISO 9001:2015', 'CE Belgesi'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Ofis Mobilyası', 'Ergonomik Ürünler'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional({
    example: '15 yıllık kurumsal mobilya üretim deneyimi.',
  })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({ example: 'Aylik 50000 adet uretim kapasitesi' })
  @IsOptional()
  @IsString()
  capacity?: string;
}
