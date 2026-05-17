import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyRole, CurrentCompany, JwtPayload, Roles } from '@app/common';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { QueryAuctionDto } from './dto/query-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';

@ApiTags('Auctions')
@ApiBearerAuth()
@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Post()
  @Roles(CompanyRole.BUYER)
  @ApiOperation({ summary: 'Yeni ihale olustur (BUYER)' })
  create(@CurrentCompany() company: JwtPayload, @Body() dto: CreateAuctionDto) {
    return this.auctionsService.create(company.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Ihaleleri listele' })
  findAll(@Query() query: QueryAuctionDto) {
    return this.auctionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ihale detayini getir' })
  @ApiParam({ name: 'id', description: 'Auction id' })
  findOne(@Param('id') id: string, @CurrentCompany() company: JwtPayload) {
    return this.auctionsService.findOne(id, company);
  }

  @Patch(':id')
  @Roles(CompanyRole.BUYER)
  @ApiOperation({ summary: 'Taslak ihaleyi guncelle (sadece sahibi BUYER)' })
  @ApiParam({ name: 'id', description: 'Auction id' })
  update(
    @Param('id') id: string,
    @CurrentCompany() company: JwtPayload,
    @Body() dto: UpdateAuctionDto,
  ) {
    return this.auctionsService.update(id, company.sub, dto);
  }

  @Patch(':id/open')
  @Roles(CompanyRole.BUYER)
  @ApiOperation({ summary: 'Taslak ihaleyi yayina ac' })
  @ApiParam({ name: 'id', description: 'Auction id' })
  open(@Param('id') id: string, @CurrentCompany() company: JwtPayload) {
    return this.auctionsService.open(id, company.sub);
  }

  @Patch(':id/close')
  @Roles(CompanyRole.BUYER)
  @ApiOperation({ summary: 'Acik ihaleyi kapat' })
  @ApiParam({ name: 'id', description: 'Auction id' })
  close(@Param('id') id: string, @CurrentCompany() company: JwtPayload) {
    return this.auctionsService.close(id, company.sub);
  }

  @Delete(':id')
  @Roles(CompanyRole.BUYER)
  @ApiOperation({ summary: 'Ihaleyi iptal et (DRAFT veya OPEN)' })
  @ApiParam({ name: 'id', description: 'Auction id' })
  cancel(@Param('id') id: string, @CurrentCompany() company: JwtPayload) {
    return this.auctionsService.cancel(id, company.sub);
  }

  @Post(':id/award/:bidId')
  @Roles(CompanyRole.BUYER)
  @ApiOperation({ summary: 'Kapali ihalede kazanan teklifi sec' })
  @ApiParam({ name: 'id', description: 'Auction id' })
  @ApiParam({ name: 'bidId', description: 'Bid id' })
  award(
    @Param('id') id: string,
    @Param('bidId') bidId: string,
    @CurrentCompany() company: JwtPayload,
  ) {
    return this.auctionsService.award(id, bidId, company.sub);
  }
}
