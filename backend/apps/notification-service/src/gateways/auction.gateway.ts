// TODO: @WebSocketGateway({ cors: true, namespace: '/auctions' }) ekle
// TODO: @SubscribeMessage('join-auction') → client'ı auctionId odasına al
// TODO: @SubscribeMessage('leave-auction') → odadan çıkar
// TODO: Redis Pub/Sub'a abone ol: 'bid.placed' kanalı
//   → Mesaj geldiğinde server.to(auctionId).emit('bid-update', data)
// TODO: @SubscribeMessage('join-auction') için JWT doğrulama (WsAuthGuard)

// NOT: @socket.io/redis-adapter kullan (çoklu instance için)
