import { Logger } from '@nestjs/common';
import {
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/auctions',
  cors: { origin: '*' },
})
export class AuctionGateway implements OnGatewayInit {
  private readonly logger = new Logger(AuctionGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit() {
    this.logger.log('WebSocket namespace /auctions hazir');
  }

  @SubscribeMessage('join-auction')
  handleJoin(client: Socket, payload: { auctionId: string }) {
    const room = payload?.auctionId;
    if (!room) {
      return { ok: false, error: 'auctionId gerekli' };
    }
    void client.join(room);
    return { ok: true, auctionId: room };
  }

  @SubscribeMessage('leave-auction')
  handleLeave(client: Socket, payload: { auctionId: string }) {
    const room = payload?.auctionId;
    if (!room) {
      return { ok: false, error: 'auctionId gerekli' };
    }
    void client.leave(room);
    return { ok: true, auctionId: room };
  }

  /** Redis bridge bu metodu cagirir */
  emitAuctionEvent(auctionId: string, eventName: string, payload: unknown) {
    if (!auctionId || !this.server) {
      return;
    }
    this.server.to(auctionId).emit(eventName, payload);
  }
}
