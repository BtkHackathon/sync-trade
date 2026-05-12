import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'info@tekstilfabrikasi.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Gizli@Sifre123' })
  @IsString()
  @MinLength(8)
  password: string;
}
