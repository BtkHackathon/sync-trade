import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CompanyRole, CurrentCompany, JwtPayload, Roles } from '@app/common';
import { BidsService } from './bids.service';
import { PlaceBidDto } from './dto/place-bid.dto';

@ApiTags('Bids')
@ApiBearerAuth()
@Controller('bids')
export class BidsController {
  constructor(private readonly bids: BidsService) {}

  @Post()
  @Roles(CompanyRole.SUPPLIER)
  @ApiOperation({ summary: 'Teklif ver veya tutari dusur (tersine ihale)' })
  place(
    @CurrentCompany() company: JwtPayload,
    @Body() dto: PlaceBidDto,
    @Req() req: Request,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const ipFromForwarded =
      typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined;
    const ip = ipFromForwarded ?? req.ip ?? null;
    return this.bids.placeBid(company.sub, dto, ip);
  }

  @Get('auction/:auctionId')
  @Roles(CompanyRole.BUYER)
  @ApiOperation({ summary: 'Ihalenin aktif teklifleri (yalnizca ihale sahibi)' })
  listForAuction(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' })) auctionId: string,
    @CurrentCompany() company: JwtPayload,
  ) {
    return this.bids.listForAuction(auctionId, company);
  }

  @Get('my')
  @Roles(CompanyRole.SUPPLIER)
  @ApiOperation({ summary: 'Kendi tekliflerim' })
  listMine(@CurrentCompany() company: JwtPayload) {
    return this.bids.listMine(company.sub);
  }

  @Delete(':id')
  @Roles(CompanyRole.SUPPLIER)
  @ApiOperation({ summary: 'Aktif teklifi geri cek (ihale acikken)' })
  withdraw(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentCompany() company: JwtPayload,
  ) {
    return this.bids.withdraw(id, company.sub);
  }
}
