import { io, type Socket } from 'socket.io-client';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3005';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socket || !socket.connected) {
    socket?.disconnect();
    socket = io(`${WS_URL}/auctions`, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function joinAuction(auctionId: string): void {
  socket?.emit('join-auction', { auctionId });
}

export function leaveAuction(auctionId: string): void {
  socket?.emit('leave-auction', { auctionId });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
