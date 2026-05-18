'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Play,
  Square,
  XCircle,
  Trophy,
  Clock,
  Users,
  Tag,
  Box,
  MapPin,
  Calendar,
  Loader2,
  ShieldAlert,
  Bot,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { CountdownTimer } from '@/components/auction/CountdownTimer';
import { LiveBidRoom } from '@/components/auction/LiveBidRoom';
import { BidForm } from '@/components/auction/BidForm';
import { AIDashboard } from '@/components/auction/AIDashboard';
import { FraudDetection } from '@/components/auction/FraudDetection';
import { auctionsApi, bidsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import type { Auction, ApiResponse, Bid } from '@/types';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  DRAFT: { label: 'Taslak', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  OPEN: { label: 'Açık', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500 animate-pulse' },
  CLOSED: { label: 'Kapandı', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  AWARDED: { label: 'Sonuçlandı', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
};

export default function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();
  const router = useRouter();
  const { company } = useAuthStore();
  const isBuyer = company?.role === 'BUYER';

  const [activeTab, setActiveTab] = useState<string>('bids');

  const { data: auction, isLoading } = useQuery({
    queryKey: ['auction', id],
    queryFn: () => auctionsApi.get(id),
    select: (r) => (r.data as ApiResponse<Auction>).data,
    refetchInterval: 30_000,
  });

  const { data: bids } = useQuery({
    queryKey: ['bids', id],
    queryFn: () => bidsApi.forAuction(id),
    select: (r) => (r.data as ApiResponse<Bid[]>).data ?? [],
    enabled: !!auction && (isBuyer || auction.status === 'OPEN'),
  });

  const { data: myBids } = useQuery({
    queryKey: ['my-bids'],
    queryFn: () => bidsApi.mine(),
    select: (r) =>
      ((r.data as ApiResponse<Bid[]>).data ?? []).filter(
        (b) => b.auctionId === id && b.status === 'ACTIVE',
      ),
    enabled: !isBuyer,
  });

  const { mutate: openAuction, isPending: opening } = useMutation({
    mutationFn: () => auctionsApi.open(id),
    onSuccess: () => {
      toast.success('İhale yayınlandı!');
      void qc.invalidateQueries({ queryKey: ['auction', id] });
    },
    onError: () => toast.error('İhale yayınlanamadı.'),
  });

  const { mutate: closeAuction, isPending: closing } = useMutation({
    mutationFn: () => auctionsApi.close(id),
    onSuccess: () => {
      toast.success('İhale kapatıldı.');
      void qc.invalidateQueries({ queryKey: ['auction', id] });
      setActiveTab('ai');
    },
    onError: () => toast.error('İhale kapatılamadı.'),
  });

  const { mutate: cancelAuction, isPending: cancelling } = useMutation({
    mutationFn: () => auctionsApi.cancel(id),
    onSuccess: () => {
      toast.success('İhale iptal edildi.');
      router.push('/auctions');
    },
    onError: () => toast.error('İhale iptal edilemedi.'),
  });

  const { mutate: awardAuction, isPending: awarding } = useMutation({
    mutationFn: (bidId: string) => auctionsApi.award(id, bidId),
    onSuccess: () => {
      toast.success('İhale sonuçlandı! Kazanan tedarikçi bilgilendirildi.');
      void qc.invalidateQueries({ queryKey: ['auction', id] });
    },
    onError: () => toast.error('İhale sonuçlandırılamadı.'),
  });

  if (isLoading) {
    return (
      <div>
        <Header title="İhale Detayı" />
        <div className="p-6 space-y-4">
          {[100, 70, 90, 80].map((w, i) => (
            <div
              key={i}
              className="h-16 rounded-xl shimmer"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div>
        <Header title="İhale Bulunamadı" />
        <div className="p-6 text-center text-slate-500">
          Bu ihale mevcut değil veya erişim izniniz yok.
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[auction.status] ?? STATUS_CONFIG.DRAFT;
  const isOwner = isBuyer && auction.buyerId === company?.id;
  const myCurrentBid = myBids?.[0];
  const lowestBid = auction.lowestBidAmount ? Number(auction.lowestBidAmount) : undefined;

  // Kazanan tedarikçiyi bids listesinden türet
  const winnerBid = bids?.find(b => b.supplierId === auction.awardedBid?.supplierId);

  // Kazanan bid ID'yi bul
  function handleAward(supplierId: string) {
    const winnerBid = bids?.find(
      (b) => b.supplierId === supplierId && b.status === 'ACTIVE',
    );
    if (!winnerBid) return toast.error('Kazanan teklif bulunamadı.');
    awardAuction(winnerBid.id);
  }

  return (
    <div>
      <Header
        title={auction.title}
        subtitle={auction.category}
        actions={
          <div className="flex items-center gap-2">
            {/* Alıcı aksiyonları */}
            {isOwner && auction.status === 'DRAFT' && (
              <Button
                size="sm"
                onClick={() => openAuction()}
                disabled={opening}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Yayınla
              </Button>
            )}
            {isOwner && auction.status === 'OPEN' && (
              <Button
                size="sm"
                onClick={() => closeAuction()}
                disabled={closing}
                variant="outline"
                className="border-orange-200 text-orange-700 hover:bg-orange-50 gap-2"
              >
                {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                Kapat
              </Button>
            )}
            {isOwner && (auction.status === 'DRAFT' || auction.status === 'OPEN') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => cancelAuction()}
                disabled={cancelling}
                className="border-red-200 text-red-600 hover:bg-red-50 gap-2"
              >
                <XCircle className="w-4 h-4" />
                İptal
              </Button>
            )}
            {isOwner && auction.status === 'CLOSED' && (
              <Button
                size="sm"
                onClick={() => setActiveTab('ai')}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Trophy className="w-4 h-4" />
                Sonuçları Gör
              </Button>
            )}
            {auction.status === 'AWARDED' && (winnerBid?.supplier?.name ?? auction.awardedBid?.supplierId) && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <Trophy className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="text-xs">
                  <span className="text-emerald-600 font-medium">Kazanan: </span>
                  <span className="text-emerald-800 font-bold">
                    {winnerBid?.supplier?.name ?? auction.awardedBid?.supplierId}
                  </span>
                </div>
              </div>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Üst bilgi kartı */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${status.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
                {auction.status === 'OPEN' && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    CANLI
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                {auction.description || 'Açıklama bulunmuyor.'}
              </p>
            </div>

            {/* Geri sayım (sadece açık ihalelerde) */}
            {auction.status === 'OPEN' && (
              <div className="flex-shrink-0">
                <CountdownTimer
                  endsAt={auction.endsAt}
                  onExpired={() =>
                    void qc.invalidateQueries({ queryKey: ['auction', id] })
                  }
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Detay bilgileri */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Kategori</p>
                <p className="text-sm font-semibold text-[#0F172A]">{auction.category}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Box className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Miktar</p>
                <p className="text-sm font-semibold text-[#0F172A]">
                  {auction.quantity} {auction.unit}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Teslimat</p>
                <p className="text-sm font-semibold text-[#0F172A]">
                  {formatDate(auction.deliveryDeadline)}
                </p>
              </div>
            </div>
            {auction.deliveryAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Teslimat Adresi</p>
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {auction.deliveryAddress}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Fiyat özeti */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Azami Bütçe</p>
              <p className="text-lg font-bold text-[#0F172A]">
                {formatCurrency(Number(auction.maxBudget))}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
              <p className="text-xs text-emerald-600 mb-1">En Düşük Teklif</p>
              <p className="text-lg font-bold text-emerald-700">
                {lowestBid ? formatCurrency(lowestBid) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
              <p className="text-xs text-blue-600 mb-1">Tasarruf</p>
              <p className="text-lg font-bold text-blue-700">
                {lowestBid
                  ? `%${Math.round(((Number(auction.maxBudget) - lowestBid) / Number(auction.maxBudget)) * 100)}`
                  : '—'}
              </p>
            </div>
          </div>

          {/* Gereksinimler */}
          {auction.requirements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Gereksinimler
              </p>
              <div className="flex flex-wrap gap-2">
                {auction.requirements.map((r) => (
                  <Badge
                    key={r}
                    variant="outline"
                    className="text-xs border-slate-200 text-slate-600"
                  >
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tablar */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="bids" className="gap-2 text-sm">
              <Users className="w-4 h-4" />
              Teklifler
              {auction.bidCount > 0 && (
                <span className="bg-slate-200 text-slate-700 text-xs px-1.5 py-0.5 rounded-full">
                  {auction.bidCount}
                </span>
              )}
            </TabsTrigger>

            {/* Fraud Tespiti — sadece ihale sahibi alıcıya */}
            {isOwner && auction.bidCount >= 1 && (
              <TabsTrigger value="fraud" className="gap-2 text-sm">
                <ShieldAlert className="w-4 h-4" />
                Kartel Tespiti
              </TabsTrigger>
            )}

            {/* AI Analizi — ihale sahibi alıcı VEYA teklif vermiş tedarikçi */}
            {(auction.status === 'CLOSED' || auction.status === 'AWARDED') &&
              (isOwner || (!isBuyer && (myBids?.length ?? 0) > 0)) && (
              <TabsTrigger value="ai" className="gap-2 text-sm">
                <Bot className="w-4 h-4" />
                AI Analizi
              </TabsTrigger>
            )}

            <TabsTrigger value="info" className="gap-2 text-sm">
              <Clock className="w-4 h-4" />
              Bilgiler
            </TabsTrigger>
          </TabsList>

          {/* Teklifler tab */}
          <TabsContent value="bids" className="mt-5">
            <div
              className={`grid gap-5 ${
                !isBuyer && auction.status === 'OPEN' ? 'grid-cols-3' : 'grid-cols-1'
              }`}
            >
              <div className={!isBuyer && auction.status === 'OPEN' ? 'col-span-2' : ''}>
                <LiveBidRoom
                  auctionId={id}
                  bids={bids ?? []}
                  lowestBidAmount={auction.lowestBidAmount}
                  isBuyer={isBuyer}
                  isOpen={auction.status === 'OPEN'}
                />
              </div>

              {/* Tedarikçi teklif formu */}
              {!isBuyer && auction.status === 'OPEN' && (
                <div>
                  <BidForm
                    auctionId={id}
                    maxBudget={Number(auction.maxBudget)}
                    lowestBid={lowestBid}
                    myCurrentBid={myCurrentBid}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Kartel Tespiti tab */}
          {isOwner && auction.bidCount >= 1 && (
            <TabsContent value="fraud" className="mt-5">
              <FraudDetection
                auctionId={id}
                bidCount={auction.bidCount}
              />
            </TabsContent>
          )}

          {/* AI analizi tab */}
          {(auction.status === 'CLOSED' || auction.status === 'AWARDED') &&
            (isOwner || (!isBuyer && (myBids?.length ?? 0) > 0)) && (
            <TabsContent value="ai" className="mt-5">
              <AIDashboard
                auctionId={id}
                isOwner={isOwner}
                onAward={
                  isOwner && auction.status === 'CLOSED'
                    ? (supplierId) => handleAward(supplierId)
                    : undefined
                }
                existingReportId={auction.aiReportId}
              />
            </TabsContent>
          )}

          {/* Bilgiler tab */}
          <TabsContent value="info" className="mt-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs mb-1">Oluşturulma</p>
                  <p className="font-medium text-[#0F172A]">
                    {formatDateTime(auction.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Bitiş</p>
                  <p className="font-medium text-[#0F172A]">
                    {formatDateTime(auction.endsAt)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Alıcı Firma</p>
                  <p className="font-medium text-[#0F172A]">{auction.buyer.name}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Sektör</p>
                  <p className="font-medium text-[#0F172A]">
                    {auction.buyer.sector ?? '—'}
                  </p>
                </div>
              </div>

              {auction.awardedBid && (
                <>
                  <Separator />
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-emerald-600" />
                      <p className="text-sm font-semibold text-emerald-800">Kazanan Tedarikçi</p>
                    </div>
                    <p className="text-base font-bold text-emerald-900">
                      {winnerBid?.supplier?.name ?? auction.awardedBid.supplierId}
                    </p>
                    {winnerBid?.supplier && (
                      <p className="text-xs text-emerald-700">
                        {[winnerBid.supplier.sector, winnerBid.supplier.city, winnerBid.supplier.email]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    {winnerBid && (
                      <p className="text-xs font-medium text-emerald-800">
                        Kazanan Teklif: {formatCurrency(Number(winnerBid.amount))}
                      </p>
                    )}
                    <p className="text-xs text-emerald-600">
                      {formatDateTime(auction.awardedBid.awardedAt)} tarihinde sonuçlandırıldı.
                    </p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
