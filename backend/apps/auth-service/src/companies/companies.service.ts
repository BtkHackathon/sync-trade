import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateSupplierProfileDto } from './dto/update-supplier-profile.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { supplierProfile: true },
    });

    if (!company) throw new NotFoundException('Şirket bulunamadı.');

    const { passwordHash: _pw, ...rest } = company;
    return rest;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Şirket bulunamadı.');

    const updated = await this.prisma.company.update({
      where: { id },
      data: dto,
      include: { supplierProfile: true },
    });

    const { passwordHash: _pw, ...rest } = updated;
    return rest;
  }

  async updateSupplierProfile(
    companyId: string,
    dto: UpdateSupplierProfileDto,
  ) {
    const profile = await this.prisma.supplierProfile.findUnique({
      where: { companyId },
    });

    if (!profile) throw new NotFoundException('Tedarikçi profili bulunamadı.');

    return this.prisma.supplierProfile.update({
      where: { companyId },
      data: dto,
    });
  }

  async getSuppliers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [suppliers, total] = await Promise.all([
      this.prisma.company.findMany({
        where: { role: 'SUPPLIER' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplierProfile: {
            select: {
              reliabilityScore: true,
              certifications: true,
              specializations: true,
              capacity: true,
              completedAuctions: true,
              onTimeDeliveryRate: true,
            },
          },
        },
        omit: { passwordHash: true },
      }),
      this.prisma.company.count({ where: { role: 'SUPPLIER' } }),
    ]);

    return {
      data: suppliers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
