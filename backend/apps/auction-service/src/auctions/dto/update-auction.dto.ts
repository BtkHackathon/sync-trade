import { PartialType } from '@nestjs/swagger';
import { CreateAuctionDto } from './create-auction.dto';

// TODO: CreateAuctionDto doldurulduktan sonra bu otomatik çalışır
export class UpdateAuctionDto extends PartialType(CreateAuctionDto) {}
