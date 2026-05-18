'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Gavel,
  TrendingDown,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { auctionsApi, bidsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { Auction, ApiResponse, PaginatedData, Bid } from '@/types';
import { formatCurrency, formatDate, timeLeft } from '@/lib/utils';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
        <p className="text-slate-500 text-sm">{label}</p>
      </div>
    </div>
  );
}

function AuctionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    DRAFT: { label: 'Taslak', class: 'bg-slate-100 text-slate-600' },
    OPEN: { label: 'Açık', class: 'bg-emerald-100 text-emerald-700' },
    CLOSED: { label: 'Kapandı', class: 'bg-orange-100 text-orange-700' },
    AWARDED: { label: 'Sonuçlandı', class: 'bg-blue-100 text-blue-700' },
    CANCELLED: { label: 'İptal', class: 'bg-red-100 text-red-700' },
  };
  const s = map[status] ?? { label: status, class: 'bg-slate-100 text-slate-500' };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.class}`}>
      {s.label}
    </span>
  );
}

export default function DashboardPage() {
  const { company } = useAuthStore();
  const isBuyer = company?.role === 'BUYER';

  const { data: auctionsData } = useQuery({
    queryKey: ['auctions', 'dashboard'],
    queryFn: () => auctionsApi.list({ limit: 5 }),
    select: (r) =>
      (r.data as ApiResponse<PaginatedData<Auction>>).data,
  });

  const { data: myBidsData } = useQuery({
    queryKey: ['my-bids', 'dashboard'],
    queryFn: () => bidsApi.mine(),
    enabled: !isBuyer,
    select: (r) => (r.data as ApiResponse<Bid[]>).data,
  });

  const auctions = auctionsData?.items ?? [];
  const openCount = auctions.filter((a) => a.status === 'OPEN').length;
  const awardedCount = auctions.filter((a) => a.status === 'AWARDED').length;

  return (
    <div>
      <Header
        title="Genel Bakış"
        subtitle={`Hoş geldiniz, ${company?.name ?? ''}`}
        actions={
          isBuyer ? (
            <Link href="/auctions/create">
              <Button size="sm" className="bg-[#0F172A] hover:bg-[#1e293b] text-white gap-2">
                <Plus className="w-4 h-4" />
                Yeni İhale
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Toplam İhale"
            value={auctionsData?.meta.total ?? 0}
            icon={Gavel}
            color="bg-[#0F172A]"
          />
          <StatCard
            label="Aktif İhale"
            value={openCount}
            icon={Clock}
            color="bg-blue-500"
          />
          <StatCard
            label="Sonuçlanan"
            value={awardedCount}
            icon={CheckCircle}
            color="bg-emerald-500"
          />
          <StatCard
            label={isBuyer ? 'Ortalama Teklif' : 'Aktif Teklifim'}
            value={isBuyer ? '—' : (myBidsData?.filter((b) => b.status === 'ACTIVE').length ?? 0)}
            icon={TrendingDown}
            color="bg-orange-500"
          />
        </div>

        {/* AI Feature Banner */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1e3a5f] rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">
                Gemini AI — Akıllı Şartname Analizi
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                PDF şartnamenizi yükleyin, AI ihale formunu otomatik doldursun.
              </p>
            </div>
          </div>
          {isBuyer && (
            <Link href="/auctions/create">
              <Button
                size="sm"
                variant="outline"
                className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10 gap-1.5 text-xs"
              >
                Dene <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>

        {/* Son ihaleler */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-[#0F172A] text-sm">
              Son İhaleler
            </h2>
            <Link
              href="/auctions"
              className="text-blue-600 text-xs font-medium hover:underline flex items-center gap-1"
            >
              Tümünü Gör <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {auctions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              {isBuyer
                ? 'Henüz ihale oluşturmadınız.'
                : 'Şu an açık ihale bulunmuyor.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {auctions.slice(0, 5).map((auction) => (
                <Link
                  key={auction.id}
                  href={`/auctions/${auction.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        {auction.title}
                      </p>
                      <AuctionStatusBadge status={auction.status} />
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{auction.category}</span>
                      <span>·</span>
                      <span>{auction.bidCount} teklif</span>
                      {auction.status === 'OPEN' && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600 font-medium">
                            {timeLeft(auction.endsAt)} kaldı
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {formatCurrency(Number(auction.maxBudget))}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(auction.createdAt)}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tedarikçi: kendi teklifleri */}
        {!isBuyer && myBidsData && myBidsData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-[#0F172A] text-sm">Son Tekliflerim</h2>
              <Link
                href="/my-bids"
                className="text-blue-600 text-xs font-medium hover:underline flex items-center gap-1"
              >
                Tümünü Gör <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {myBidsData.slice(0, 4).map((bid) => (
                <div key={bid.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {bid.auction?.title ?? bid.auctionId}
                    </p>
                    <p className="text-xs text-slate-500">
                      {bid.auction?.status && (
                        <AuctionStatusBadge status={bid.auction.status} />
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">
                      {formatCurrency(Number(bid.amount))}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        bid.status === 'ACTIVE'
                          ? 'text-emerald-600 border-emerald-200 text-xs'
                          : 'text-slate-500 border-slate-200 text-xs'
                      }
                    >
                      {bid.status === 'ACTIVE' ? 'Aktif' : 'Geri Çekildi'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
