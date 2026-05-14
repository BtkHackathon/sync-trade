import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '@app/common';

@WebSocketGateway({
  namespace: '/auctions',
  cors: { origin: '*' },
})
export class AuctionGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(AuctionGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  afterInit() {
    this.logger.log('WebSocket namespace /auctions hazır');
  }

  handleConnection(client: Socket) {
    const raw =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);

    const token = raw?.startsWith('Bearer ') ? raw.slice(7) : raw;

    if (!token) {
      this.logger.warn(`Bağlantı reddedildi [${client.id}]: token yok`);
      client.emit('error', { message: 'Kimlik doğrulama gerekli' });
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.user = payload;
    } catch {
      this.logger.warn(`Bağlantı reddedildi [${client.id}]: geçersiz token`);
      client.emit('error', { message: 'Geçersiz ya da süresi dolmuş token' });
      client.disconnect();
    }
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

  emitAuctionEvent(auctionId: string, eventName: string, payload: unknown) {
    if (!auctionId || !this.server) {
      return;
    }
    this.server.to(auctionId).emit(eventName, payload);
  }
}
