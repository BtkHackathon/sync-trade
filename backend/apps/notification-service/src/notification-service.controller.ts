import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Notification')
@Controller()
export class NotificationServiceController {
  @Get('status')
  @ApiOperation({ summary: 'Notification service health status' })
  getStatus() {
    return { status: 'ok', service: 'notification' };
  }

  @Get('websocket-events')
  @ApiOperation({ summary: 'Socket event contract for the notification hub' })
  getWebsocketEvents() {
    return {
      namespace: '/auctions',
      events: [
        { name: 'join-auction', description: 'Join an auction room with auctionId' },
        { name: 'leave-auction', description: 'Leave an auction room' },
        { name: 'bid-update', description: 'Published when a new bid is placed' },
        { name: 'bid-withdrawn', description: 'Published when a bid is withdrawn' },
        { name: 'auction-opened', description: 'Published when an auction is opened' },
        { name: 'auction-closed', description: 'Published when an auction is closed' },
        { name: 'auction-awarded', description: 'Published when an auction is awarded' },
        { name: 'ai-analysis-started', description: 'Published when AI analysis begins' },
        { name: 'ai-analysis-completed', description: 'Published when AI analysis is completed' },
      ],
    };
  }
}
