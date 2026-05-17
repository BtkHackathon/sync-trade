import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompanyRole, CurrentCompany, JwtPayload, Roles } from '@app/common';
import { AnalysisService } from './analysis.service';
import { AnalyzeSpecDto } from './dto/analyze-spec.dto';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  @Post('auctions/:auctionId/analyze')
  @Roles(CompanyRole.BUYER)
  @ApiOperation({
    summary: 'Kapali ihale icin AI risk ve kazanan onerisi uret',
  })
  @ApiParam({ name: 'auctionId', description: 'Auction ID' })
  analyzeAuction(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' })) auctionId: string,
    @CurrentCompany() company: JwtPayload,
  ) {
    return this.analysis.analyzeClosedAuction(auctionId, company);
  }

  @Post('detect-fraud/:auctionId')
  @Roles(CompanyRole.BUYER)
  @ApiOperation({
    summary: 'Ihale tekliflerinde fraud/kartel riskini analiz et',
  })
  @ApiParam({ name: 'auctionId', description: 'Auction ID' })
  detectFraud(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' })) auctionId: string,
    @CurrentCompany() company: JwtPayload,
  ) {
    return this.analysis.detectFraud(auctionId, company);
  }

  @Post('analyze-supplier/:id')
  @Roles(CompanyRole.BUYER)
  @ApiOperation({ summary: 'Tedarikci guven ve performans riskini analiz et' })
  @ApiParam({ name: 'id', description: 'Supplier company ID' })
  analyzeSupplier(
    @Param('id', new ParseUUIDPipe({ version: '4' })) supplierId: string,
    @CurrentCompany() company: JwtPayload,
  ) {
    return this.analysis.analyzeSupplier(supplierId, company);
  }

  @Post('analyze-spec')
  @Roles(CompanyRole.BUYER)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Sartname metni/PDF dosyasindan ihale form alanlari cikar',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Optional raw specification text',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Optional PDF or text file',
        },
      },
    },
  })
  analyzeSpec(
    @Body() dto: AnalyzeSpecDto,
    @CurrentCompany() company: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.analysis.analyzeSpec({
      text: dto.text,
      file,
      buyerId: company.sub,
    });
  }

  @Get('reports/:auctionId')
  @ApiOperation({ summary: 'Ihale icin kayitli AI raporunu getir' })
  @ApiParam({ name: 'auctionId', description: 'Auction ID' })
  getReport(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' })) auctionId: string,
    @CurrentCompany() company: JwtPayload,
  ) {
    return this.analysis.getReport(auctionId, company);
  }
}
