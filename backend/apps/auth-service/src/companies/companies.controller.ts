import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateSupplierProfileDto } from './dto/update-supplier-profile.dto';
import { Roles, CurrentCompany, JwtPayload, CompanyRole } from '@app/common';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('suppliers')
  @ApiOperation({ summary: 'Tüm tedarikçileri listele' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getSuppliers(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.companiesService.getSuppliers(+page, +limit);
  }

  @Get('me')
  @ApiOperation({ summary: 'Kendi şirket profilini getir' })
  getMe(@CurrentCompany() company: JwtPayload) {
    return this.companiesService.findById(company.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Şirket detayını getir' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findById(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Kendi şirket bilgilerini güncelle' })
  updateMe(
    @CurrentCompany() company: JwtPayload,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(company.sub, dto);
  }

  @Get('me/supplier-profile')
  @Roles(CompanyRole.SUPPLIER)
  @ApiOperation({ summary: 'Kendi tedarikçi profilini getir' })
  getMySupplierProfile(@CurrentCompany() company: JwtPayload) {
    return this.companiesService.findById(company.sub);
  }

  @Patch('me/supplier-profile')
  @Roles(CompanyRole.SUPPLIER)
  @ApiOperation({
    summary: 'Tedarikçi profilini güncelle (sertifikalar, uzmanlıklar)',
  })
  updateSupplierProfile(
    @CurrentCompany() company: JwtPayload,
    @Body() dto: UpdateSupplierProfileDto,
  ) {
    return this.companiesService.updateSupplierProfile(company.sub, dto);
  }
}
