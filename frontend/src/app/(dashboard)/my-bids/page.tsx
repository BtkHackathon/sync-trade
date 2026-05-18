'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, TrendingDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { bidsApi } from '@/lib/api';
import { formatCurrency, formatDateTime, timeLeft } from '@/lib/utils';
import type { Bid, ApiResponse } from '@/types';

export default function MyBidsPage() {
  const qc = useQueryClient();

  const { data: bids, isLoading } = useQuery({
    queryKey: ['my-bids', 'all'],
    queryFn: () => bidsApi.mine(),
    select: (r) => (r.data as ApiResponse<Bid[]>).data ?? [],
  });

  const { mutate: withdraw, isPending: withdrawing } = useMutation({
    mutationFn: (id: string) => bidsApi.withdraw(id),
    onSuccess: () => {
      toast.success('Teklif geri çekildi.');
      void qc.invalidateQueries({ queryKey: ['my-bids'] });
    },
    onError: () => toast.error('Geri çekme işlemi başarısız.'),
  });

  const activeBids = bids?.filter((b) => b.status === 'ACTIVE') ?? [];
  const pastBids = bids?.filter((b) => b.status !== 'ACTIVE') ?? [];

  return (
    <div>
      <Header
        title="Tekliflerim"
        subtitle={`${activeBids.length} aktif teklif`}
      />

      <div className="p-6 space-y-6">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl shimmer" />
            ))}
          </div>
        )}

        {/* Aktif teklifler */}
        {!isLoading && activeBids.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-[#0F172A] text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Aktif Tekliflerim ({activeBids.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {activeBids.map((bid) => (
                <div key={bid.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/auctions/${bid.auctionId}`}
                      className="text-sm font-medium text-[#0F172A] hover:text-blue-700 truncate block"
                    >
                      {bid.auction?.title ?? bid.auctionId}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      {bid.auction?.status === 'OPEN' && bid.auction.endsAt && (
                        <>
                          <span className="text-emerald-600 font-medium">
                            {timeLeft(bid.auction.endsAt)} kaldı
                          </span>
                          <span>·</span>
                        </>
                      )}
                      {formatDateTime(bid.updatedAt)}
                    </p>
                    {bid.note && (
                      <p className="text-xs text-slate-400 mt-0.5 italic truncate">
                        &quot;{bid.note}&quot;
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-emerald-700">
                      {formatCurrency(Number(bid.amount))}
                    </p>
                    {bid.auction?.lowestBidAmount && (
                      <p className="text-xs text-slate-500">
                        En düşük:{' '}
                        {formatCurrency(Number(bid.auction.lowestBidAmount))}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/auctions/${bid.auctionId}`}>
                      <Button size="sm" variant="outline" className="border-slate-200 h-8">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    {bid.auction?.status === 'OPEN' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={withdrawing}
                        onClick={() => withdraw(bid.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs"
                      >
                        {withdrawing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Geri Çek'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Geçmiş teklifler */}
        {!isLoading && pastBids.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-500 text-sm">
                Geçmiş Teklifler ({pastBids.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {pastBids.map((bid) => (
                <div
                  key={bid.id}
                  className="flex items-center gap-4 px-5 py-4 opacity-70"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/auctions/${bid.auctionId}`}
                      className="text-sm font-medium text-[#0F172A] hover:text-blue-700 truncate block"
                    >
                      {bid.auction?.title ?? bid.auctionId}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(bid.updatedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-500 line-through">
                      {formatCurrency(Number(bid.amount))}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-xs border-slate-200 text-slate-500"
                    >
                      Geri Çekildi
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && (!bids || bids.length === 0) && (
          <div className="bg-white rounded-xl border border-slate-200 py-16 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-[#0F172A]">Henüz teklif vermediniz</p>
              <p className="text-slate-500 text-sm mt-1">
                Açık ihaleleri inceleyin ve ilk teklifinizi verin.
              </p>
            </div>
            <Link href="/auctions">
              <Button className="bg-[#0F172A] hover:bg-[#1e293b] text-white gap-2">
                İhaleleri Gör <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
