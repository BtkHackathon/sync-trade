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
import { CompanyRole, JwtPayload, buildSocketCorsOptions } from '@app/common';
import { PrismaService } from '@app/database';

@WebSocketGateway({
  namespace: '/auctions',
  cors: buildSocketCorsOptions(),
})
export class AuctionGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(AuctionGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket namespace /auctions hazir');
  }

  handleConnection(client: Socket) {
    const raw =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);

    const token = raw?.startsWith('Bearer ') ? raw.slice(7) : raw;

    if (!token) {
      this.reject(client, 'Kimlik dogrulama gerekli');
      return;
    }

    try {
      client.data.user = this.jwtService.verify<JwtPayload>(token);
    } catch {
      this.reject(client, 'Gecersiz ya da suresi dolmus token');
    }
  }

  @SubscribeMessage('join-auction')
  async handleJoin(client: Socket, payload: { auctionId: string }) {
    const auctionId = payload?.auctionId;
    const user = client.data.user as JwtPayload | undefined;

    if (!auctionId) {
      return { ok: false, error: 'auctionId gerekli' };
    }

    if (!user || !(await this.canJoinAuction(auctionId, user))) {
      this.logger.warn(
        `Room join reddedildi client=${client.id} auction=${auctionId}`,
      );
      return { ok: false, error: 'Bu ihale odasina erisim yetkiniz yok' };
    }

    await client.join(auctionId);
    return { ok: true, auctionId };
  }

  @SubscribeMessage('leave-auction')
  async handleLeave(client: Socket, payload: { auctionId: string }) {
    const auctionId = payload?.auctionId;
    if (!auctionId) {
      return { ok: false, error: 'auctionId gerekli' };
    }

    await client.leave(auctionId);
    return { ok: true, auctionId };
  }

  emitAuctionEvent(auctionId: string, eventName: string, payload: unknown) {
    if (!auctionId || !this.server) {
      return;
    }
    this.server.to(auctionId).emit(eventName, payload);
  }

  private async canJoinAuction(
    auctionId: string,
    user: JwtPayload,
  ): Promise<boolean> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: {
        buyerId: true,
        status: true,
        bids: {
          where: { supplierId: user.sub },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!auction) {
      return false;
    }

    if (user.role === CompanyRole.BUYER) {
      return auction.buyerId === user.sub;
    }

    if (user.role === CompanyRole.SUPPLIER) {
      return auction.status === 'OPEN' || auction.bids.length > 0;
    }

    return false;
  }

  private reject(client: Socket, message: string): void {
    this.logger.warn(`Baglanti reddedildi [${client.id}]: ${message}`);
    client.emit('error', { message });
    client.disconnect();
  }
}
