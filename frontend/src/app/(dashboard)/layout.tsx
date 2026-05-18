'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationsStore } from '@/store/notifications.store';
import { getSocket } from '@/lib/socket';
import { formatCurrency } from '@/lib/utils';
import type { BidUpdateEvent, AuctionClosedEvent, AuctionAwardedEvent } from '@/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const { push } = useNotificationsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, []);

  // Global WebSocket bağlantısı — kullanıcı dashboard'dayken tüm eventleri yakala
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    socket.on('bid-update', (payload: BidUpdateEvent) => {
      if (payload.isNewLowest) {
        push({
          type: 'bid',
          title: 'Yeni En Düşük Teklif',
          body: `${payload.supplierName} → ${formatCurrency(payload.amount)}`,
          auctionId: payload.auctionId,
        });
      }
    });

    socket.on('auction-closed', (payload: AuctionClosedEvent) => {
      push({
        type: 'auction-close',
        title: 'İhale Kapandı',
        body: 'AI analizi artık çalıştırılabilir.',
        auctionId: payload.auctionId,
      });
    });

    socket.on('auction-awarded', (payload: AuctionAwardedEvent) => {
      push({
        type: 'award',
        title: 'İhale Sonuçlandı',
        body: `Kazanan teklif: ${formatCurrency(payload.winningAmount)}`,
        auctionId: payload.auctionId,
      });
    });

    return () => {
      socket.off('bid-update');
      socket.off('auction-closed');
      socket.off('auction-awarded');
    };
  }, [token, push]);

  // SSR ve ilk client render'ı aynı yapıyı dönsün → hydration mismatch önlenir
  if (!mounted) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <div className="w-60 shrink-0" />
        <main className="flex-1 ml-60 min-h-screen" />
      </div>
    );
  }

  if (!isAuthenticated()) return null;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen">{children}</main>
    </div>
  );
}
