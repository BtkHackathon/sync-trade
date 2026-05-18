'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  TrendingDown,
  Wifi,
  WifiOff,
  CheckCircle,
  Trophy,
  Crown,
  ShieldCheck,
} from 'lucide-react';
import { getSocket, joinAuction, leaveAuction } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
import { SupplierAnalysis } from '@/components/auction/SupplierAnalysis';
import type { Bid, BidUpdateEvent } from '@/types';

interface LiveBidRoomProps {
  auctionId: string;
  bids: Bid[];
  lowestBidAmount?: string;
  isBuyer?: boolean;
  isOpen?: boolean;   // sadece OPEN ihalelerde WebSocket bağlantısı kurulsun
}

interface DisplayBid {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  note?: string;
  updatedAt: string;
  isFlashing: boolean;
}

export function LiveBidRoom({ auctionId, bids, lowestBidAmount, isBuyer, isOpen }: LiveBidRoomProps) {
  const { token } = useAuthStore();
  const qc = useQueryClient();

  const [connected, setConnected] = useState(false);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const [displayBids, setDisplayBids] = useState<DisplayBid[]>(() =>
    bids.map((b) => ({
      id: b.id,
      supplierId: b.supplierId,
      supplierName: b.supplier?.name ?? `Tedarikçi ${b.supplierId.slice(0, 6)}`,
      amount: Number(b.amount),
      note: b.note,
      updatedAt: b.updatedAt,
      isFlashing: false,
    })),
  );

  // Prop değişince güncelle (ilk yükleme için)
  useEffect(() => {
    setDisplayBids(
      bids.map((b) => ({
        id: b.id,
        supplierId: b.supplierId,
        supplierName: b.supplier?.name ?? `Tedarikçi ${b.supplierId.slice(0, 6)}`,
        amount: Number(b.amount),
        note: b.note,
        updatedAt: b.updatedAt,
        isFlashing: false,
      })),
    );
  }, [bids]);

  useEffect(() => {
    // CLOSED / AWARDED ihalelerde WebSocket'e gerek yok — teklifler REST ile çekilir
    if (!token || !isOpen) return;
    const socket = getSocket(token);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    joinAuction(auctionId);

    socket.on('bid-update', (payload: BidUpdateEvent) => {
      if (payload.auctionId !== auctionId) return;
      setLiveCount(payload.totalBidCount);

      setDisplayBids((prev) => {
        const existing = prev.find((b) => b.supplierId === payload.supplierId);
        let next: DisplayBid[];
        if (existing) {
          next = prev.map((b) =>
            b.supplierId === payload.supplierId
              ? { ...b, amount: payload.amount, updatedAt: payload.timestamp, isFlashing: true }
              : b,
          );
        } else {
          next = [
            ...prev,
            {
              id: payload.bidId,
              supplierId: payload.supplierId,
              supplierName: payload.supplierName,
              amount: payload.amount,
              updatedAt: payload.timestamp,
              isFlashing: true,
            },
          ];
        }
        return next.sort((a, b) => a.amount - b.amount);
      });

      // Flash efektini 1.4s sonra kaldır
      const timer = flashTimers.current.get(payload.supplierId);
      if (timer) clearTimeout(timer);
      flashTimers.current.set(
        payload.supplierId,
        setTimeout(() => {
          setDisplayBids((prev) =>
            prev.map((b) =>
              b.supplierId === payload.supplierId ? { ...b, isFlashing: false } : b,
            ),
          );
        }, 1400),
      );

      if (payload.isNewLowest) {
        toast.success(
          `${payload.supplierName} yeni en düşük teklifi verdi: ${formatCurrency(payload.amount)}`,
          { duration: 3000 },
        );
      }

      void qc.invalidateQueries({ queryKey: ['auction', auctionId] });
    });

    socket.on('bid-withdrawn', () => {
      void qc.invalidateQueries({ queryKey: ['auction', auctionId] });
    });

    socket.on('auction-closed', () => {
      toast.info('İhale süresi doldu. Sonuçlar hesaplanıyor…');
      void qc.invalidateQueries({ queryKey: ['auction', auctionId] });
    });

    socket.on('auction-awarded', () => {
      toast.success('İhale sonuçlandı!');
      void qc.invalidateQueries({ queryKey: ['auction', auctionId] });
    });

    return () => {
      leaveAuction(auctionId);
      socket.off('bid-update');
      socket.off('bid-withdrawn');
      socket.off('auction-closed');
      socket.off('auction-awarded');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [auctionId, token, qc]);

  const lowestAmount = lowestBidAmount ? Number(lowestBidAmount) : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Başlık */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <TrendingDown className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-[#0F172A] text-sm">
            {isOpen ? 'Canlı Teklifler' : 'Teklif Listesi'}
          </h3>
          {(liveCount !== null || bids.length > 0) && (
            <span className="text-xs text-slate-500">
              ({liveCount ?? bids.length} teklif)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isOpen ? (
            connected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 text-xs font-medium">Canlı</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 text-xs">Bağlanıyor…</span>
              </>
            )
          ) : (
            <span className="text-xs text-slate-400">Geçmiş kayıt</span>
          )}
        </div>
      </div>

      {/* Tablo */}
      {displayBids.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          Henüz teklif verilmedi. İlk teklifi siz verin!
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {/* Kolon başlıkları */}
          <div className="grid grid-cols-12 px-5 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide bg-slate-50">
            <div className="col-span-1">#</div>
            <div className={isBuyer ? 'col-span-4' : 'col-span-5'}>Tedarikçi</div>
            <div className="col-span-3 text-right">Teklif</div>
            <div className="col-span-2 text-right hidden sm:block">Fark</div>
            {!isBuyer && <div className="col-span-2 text-right hidden sm:block">Zaman</div>}
            {isBuyer && <div className="col-span-2 text-right hidden sm:block">Skor</div>}
          </div>

          {displayBids.map((bid, idx) => {
            const isLeader = idx === 0;
            const diff =
              lowestAmount && !isLeader
                ? bid.amount - lowestAmount
                : null;
            const originalBid = bids.find((b) => b.supplierId === bid.supplierId);
            const reliabilityScore = originalBid?.supplier?.supplierProfile?.reliabilityScore;
            const isVerified = originalBid?.supplier?.isVerified;

            return (
              <div
                key={bid.supplierId}
                className={`transition-colors ${
                  bid.isFlashing
                    ? 'bid-flash'
                    : isLeader
                    ? 'bg-emerald-50/60'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="grid grid-cols-12 items-center px-5 py-3.5">
                  {/* Sıra */}
                  <div className="col-span-1">
                    {isLeader ? (
                      <Trophy className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                    )}
                  </div>

                  {/* Tedarikçi */}
                  <div className={`flex items-center gap-2 min-w-0 ${isBuyer ? 'col-span-4' : 'col-span-5'}`}>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isLeader
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {bid.supplierName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-medium truncate ${isLeader ? 'text-emerald-800' : 'text-[#0F172A]'}`}>
                          {bid.supplierName}
                        </p>
                        {isVerified && (
                          <span title="Doğrulanmış tedarikçi"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /></span>
                        )}
                      </div>
                      {isLeader && (
                        <div className="flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5 text-emerald-600" />
                          <span className="text-xs text-emerald-600 font-medium">En düşük</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tutar */}
                  <div className="col-span-3 text-right">
                    <span className={`text-sm font-bold ${isLeader ? 'text-emerald-700' : 'text-[#0F172A]'}`}>
                      {formatCurrency(bid.amount)}
                    </span>
                  </div>

                  {/* Fark */}
                  <div className="col-span-2 text-right hidden sm:block">
                    {diff !== null ? (
                      <span className="text-xs text-orange-600 font-medium">
                        +{formatCurrency(diff)}
                      </span>
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                    )}
                  </div>

                  {/* Güvenilirlik skoru (buyer) veya zaman (supplier) */}
                  <div className="col-span-2 text-right hidden sm:block">
                    {isBuyer ? (
                      reliabilityScore !== undefined ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          reliabilityScore >= 80
                            ? 'bg-emerald-100 text-emerald-700'
                            : reliabilityScore >= 50
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {reliabilityScore}/100
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">
                        {new Date(bid.updatedAt).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Alıcıya özel: tedarikçi risk analizi */}
                {isBuyer && (
                  <div className="px-5 pb-3">
                    <SupplierAnalysis
                      supplierId={bid.supplierId}
                      supplierName={bid.supplierName}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
