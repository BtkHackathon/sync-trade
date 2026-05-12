import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@app/database';
import { CompanyRole } from '@app/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.company.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Bu e-posta adresi zaten kayıtlı.');
    }

    if (dto.taxId) {
      const existingTax = await this.prisma.company.findUnique({ where: { taxId: dto.taxId } });
      if (existingTax) {
        throw new ConflictException('Bu vergi numarası zaten kayıtlı.');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const company = await this.prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: dto.role,
          sector: dto.sector,
          taxId: dto.taxId,
          phone: dto.phone,
          address: dto.address,
          city: dto.city,
          country: dto.country,
        },
      });

      if (dto.role === CompanyRole.SUPPLIER) {
        await tx.supplierProfile.create({
          data: {
            companyId: created.id,
            certifications: dto.certifications ?? [],
            specializations: dto.specializations ?? [],
          },
        });
      }

      return created;
    });

    this.logger.log(`Yeni şirket kaydı: ${company.email} (${company.role})`);

    return this.buildAuthResponse(company);
  }

  async login(dto: LoginDto) {
    const company = await this.prisma.company.findUnique({ where: { email: dto.email } });
    if (!company) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, company.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    return this.buildAuthResponse(company);
  }

  async getProfile(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { supplierProfile: true },
    });

    if (!company) throw new NotFoundException('Şirket bulunamadı.');

    const { passwordHash: _pw, ...rest } = company;
    return rest;
  }

  private buildAuthResponse(company: {
    id: string;
    email: string;
    role: any;
    name: string;
  }) {
    const payload = {
      sub: company.id,
      email: company.email,
      role: company.role,
      name: company.name,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        role: company.role,
      },
    };
  }
}
