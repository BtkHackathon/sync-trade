'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Gavel,
  Clock,
  TrendingDown,
  Users,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { auctionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDate, timeLeft } from '@/lib/utils';
import type { Auction, ApiResponse, PaginatedData } from '@/types';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; dot: string; bg: string }> = {
    DRAFT: { label: 'Taslak', dot: 'bg-slate-400', bg: 'bg-slate-100 text-slate-600' },
    OPEN: { label: 'Açık', dot: 'bg-emerald-500 animate-pulse', bg: 'bg-emerald-100 text-emerald-700' },
    CLOSED: { label: 'Kapandı', dot: 'bg-orange-400', bg: 'bg-orange-100 text-orange-700' },
    AWARDED: { label: 'Sonuçlandı', dot: 'bg-blue-500', bg: 'bg-blue-100 text-blue-700' },
    CANCELLED: { label: 'İptal', dot: 'bg-red-400', bg: 'bg-red-100 text-red-700' },
  };
  const s = map[status] ?? { label: status, dot: 'bg-slate-400', bg: 'bg-slate-100 text-slate-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function AuctionCard({ auction, isBuyer }: { auction: Auction; isBuyer: boolean }) {
  const isOpen = auction.status === 'OPEN';
  const priceDiff =
    auction.lowestBidAmount
      ? Math.round(
          ((Number(auction.maxBudget) - Number(auction.lowestBidAmount)) /
            Number(auction.maxBudget)) *
            100,
        )
      : null;

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group flex flex-col gap-4"
    >
      {/* Üst satır */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0F172A] text-sm leading-tight truncate group-hover:text-blue-700 transition-colors">
            {auction.title}
          </p>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span>{auction.category}</span>
            <span>·</span>
            <span>
              {auction.quantity} {auction.unit}
            </span>
          </p>
        </div>
        <StatusBadge status={auction.status} />
      </div>

      {/* Orta: rakamlar */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Bütçe</p>
          <p className="text-sm font-bold text-[#0F172A]">
            {formatCurrency(Number(auction.maxBudget))}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">En Düşük</p>
          <p className="text-sm font-bold text-emerald-700">
            {auction.lowestBidAmount
              ? formatCurrency(Number(auction.lowestBidAmount))
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Tasarruf</p>
          <p className="text-sm font-bold text-blue-700">
            {priceDiff !== null ? `%${priceDiff}` : '—'}
          </p>
        </div>
      </div>

      {/* Alt satır */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {auction.bidCount} teklif
          </span>
          {isOpen ? (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <Clock className="w-3.5 h-3.5" />
              {timeLeft(auction.endsAt)} kaldı
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(auction.endsAt)}
            </span>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
      </div>
    </Link>
  );
}

export default function AuctionsPage() {
  const { company } = useAuthStore();
  const isBuyer = company?.role === 'BUYER';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['auctions', statusFilter],
    queryFn: () =>
      auctionsApi.list({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        limit: 50,
      }),
    select: (r) => (r.data as ApiResponse<PaginatedData<Auction>>).data,
  });

  const auctions = (data?.items ?? []).filter((a) =>
    search
      ? a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.category.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <div>
      <Header
        title="İhaleler"
        subtitle={isBuyer ? 'İhale yönetimi' : 'Teklif verebileceğiniz ihaleler'}
        actions={
          isBuyer ? (
            <Link href="/auctions/create">
              <Button
                size="sm"
                className="bg-[#0F172A] hover:bg-[#1e293b] text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Yeni İhale
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="p-6 space-y-5">
        {/* Filtreler */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="İhale veya kategori ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-white border-slate-200"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-40 bg-white border-slate-200 gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tüm Durumlar</SelectItem>
              <SelectItem value="DRAFT">Taslak</SelectItem>
              <SelectItem value="OPEN">Açık</SelectItem>
              <SelectItem value="CLOSED">Kapandı</SelectItem>
              <SelectItem value="AWARDED">Sonuçlandı</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Özet sayılar */}
        {data && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Gavel className="w-4 h-4" />
            <span>
              Toplam <strong className="text-[#0F172A]">{data.meta.total}</strong> ihale
            </span>
            {auctions.length !== data.meta.total && (
              <span>· filtreli: {auctions.length}</span>
            )}
          </div>
        )}

        {/* Yükleniyor */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-5 h-44 shimmer"
              />
            ))}
          </div>
        )}

        {/* İhale kartları */}
        {!isLoading && auctions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} isBuyer={isBuyer} />
            ))}
          </div>
        )}

        {/* Boş durum */}
        {!isLoading && auctions.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 py-16 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-[#0F172A]">Sonuç bulunamadı</p>
              <p className="text-slate-500 text-sm mt-1">
                {isBuyer
                  ? 'Henüz ihale oluşturmadınız. İlk ihalenizi oluşturun.'
                  : 'Şu an açık ihale bulunmuyor.'}
              </p>
            </div>
            {isBuyer && (
              <Link href="/auctions/create">
                <Button className="bg-[#0F172A] hover:bg-[#1e293b] text-white gap-2">
                  <Plus className="w-4 h-4" />
                  İlk İhalenizi Oluşturun
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
