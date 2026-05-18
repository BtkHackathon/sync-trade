'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TrendingDown, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { bidsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { ApiResponse, Bid } from '@/types';

interface BidFormProps {
  auctionId: string;
  maxBudget: number;
  lowestBid?: number;
  myCurrentBid?: Bid;
}

export function BidForm({ auctionId, maxBudget, lowestBid, myCurrentBid }: BidFormProps) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(
    myCurrentBid ? String(Number(myCurrentBid.amount)) : '',
  );
  const [note, setNote] = useState(myCurrentBid?.note ?? '');

  const ceiling = lowestBid ? lowestBid - 1 : maxBudget;

  const { mutate: placeBid, isPending } = useMutation({
    mutationFn: () =>
      bidsApi.place({ auctionId, amount: Number(amount), note: note || undefined }),
    onSuccess: (res) => {
      const bid = (res.data as ApiResponse<Bid>).data;
      toast.success(
        myCurrentBid
          ? `Teklifiniz güncellendi: ${formatCurrency(Number(bid.amount))}`
          : `Teklif verildi: ${formatCurrency(Number(bid.amount))}`,
      );
      void qc.invalidateQueries({ queryKey: ['auction', auctionId] });
      void qc.invalidateQueries({ queryKey: ['my-bids'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Teklif verilemedi.';
      toast.error(msg);
    },
  });

  const { mutate: withdrawBid, isPending: withdrawing } = useMutation({
    mutationFn: () => bidsApi.withdraw(myCurrentBid!.id),
    onSuccess: () => {
      toast.success('Teklifiniz geri çekildi.');
      setAmount('');
      setNote('');
      void qc.invalidateQueries({ queryKey: ['auction', auctionId] });
      void qc.invalidateQueries({ queryKey: ['my-bids'] });
    },
    onError: () => toast.error('Teklif geri çekilemedi.'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0) return toast.error('Geçerli bir tutar girin.');
    if (n > maxBudget)
      return toast.error(`Teklif bütçeyi (${formatCurrency(maxBudget)}) aşamaz.`);
    if (lowestBid && n >= lowestBid)
      return toast.error(
        `En düşük teklifin (${formatCurrency(lowestBid)}) altında teklif vermelisiniz.`,
      );
    placeBid();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <TrendingDown className="w-4 h-4 text-emerald-600" />
        <h3 className="font-semibold text-[#0F172A] text-sm">
          {myCurrentBid ? 'Teklifinizi Güncelleyin' : 'Teklif Verin'}
        </h3>
      </div>

      {/* Referans fiyatlar */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Azami Bütçe</span>
          <span className="font-semibold text-[#0F172A]">{formatCurrency(maxBudget)}</span>
        </div>
        {lowestBid && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">En Düşük Teklif</span>
            <span className="font-bold text-emerald-700">{formatCurrency(lowestBid)}</span>
          </div>
        )}
        {myCurrentBid && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Mevcut Teklifiniz</span>
            <span className="font-semibold text-blue-700">
              {formatCurrency(Number(myCurrentBid.amount))}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[#334155] font-medium text-sm">
            Teklif Tutarı (₺) <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            placeholder={lowestBid ? `${lowestBid - 1} veya daha az` : formatCurrency(maxBudget).replace('₺', '').trim()}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1}
            max={ceiling}
            required
            className="h-11 border-slate-200 font-semibold text-emerald-700"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[#334155] font-medium text-sm">Not (isteğe bağlı)</Label>
          <Textarea
            placeholder="Ek bilgi, sertifikalar…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="border-slate-200 resize-none text-sm"
          />
        </div>

        <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Ters açık artırmada en düşük geçerli teklif kazanır. Bir ihaledeki teklifinizi
            güncelleyebilirsiniz.
          </span>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-11"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Gönderiliyor…
              </span>
            ) : myCurrentBid ? (
              'Teklifi Güncelle'
            ) : (
              'Teklif Ver'
            )}
          </Button>

          {myCurrentBid && (
            <Button
              type="button"
              variant="outline"
              disabled={withdrawing}
              onClick={() => withdrawBid()}
              className="border-red-200 text-red-600 hover:bg-red-50 h-11"
            >
              {withdrawing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Geri Çek'
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
