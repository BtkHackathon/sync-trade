'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import { Sparkles, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { SpecUpload } from '@/components/auction/SpecUpload';
import { auctionsApi } from '@/lib/api';
import type { SpecAnalysisResult, ApiResponse, Auction } from '@/types';

const CATEGORIES = [
  'Hammadde',
  'Makine & Ekipman',
  'Hizmet',
  'Lojistik',
  'BT & Yazılım',
  'İnşaat',
  'Tekstil',
  'Gıda',
  'Sağlık',
  'Diğer',
];

const UNITS = ['adet', 'kg', 'ton', 'metre', 'm²', 'm³', 'litre', 'kutu', 'palet'];

interface FormState {
  title: string;
  description: string;
  category: string;
  quantity: string;
  unit: string;
  maxBudget: string;
  deliveryDeadline: string;
  endsAt: string;
  deliveryAddress: string;
  requirements: string[];
}

const EMPTY: FormState = {
  title: '',
  description: '',
  category: '',
  quantity: '',
  unit: 'adet',
  maxBudget: '',
  deliveryDeadline: '',
  endsAt: '',
  deliveryAddress: '',
  requirements: [],
};

function AiField({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="absolute -top-2 right-2">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500 text-white text-[10px] font-medium">
          <Sparkles className="w-2.5 h-2.5" />
          AI
        </span>
      </div>
    </div>
  );
}

export default function CreateAuctionPage() {
  const router = useRouter();
  const { company } = useAuthStore();

  useEffect(() => {
    if (company && company.role !== 'BUYER') {
      router.replace('/auctions');
    }
  }, [company, router]);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const [newReq, setNewReq] = useState('');

  function patch(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleAiResult(result: SpecAnalysisResult) {
    const filled: (keyof FormState)[] = [];

    const updates: Partial<FormState> = {};

    if (result.title) { updates.title = result.title; filled.push('title'); }
    if (result.category) { updates.category = result.category; filled.push('category'); }
    if (result.quantity) { updates.quantity = String(result.quantity); filled.push('quantity'); }
    if (result.unit) { updates.unit = result.unit; filled.push('unit'); }
    if (result.estimatedBudget) {
      updates.maxBudget = String(result.estimatedBudget);
      filled.push('maxBudget');
    }
    if (result.deadline) {
      // ISO ya da YYYY-MM-DD formatına getir
      const d = new Date(result.deadline);
      if (!isNaN(d.getTime())) {
        updates.deliveryDeadline = d.toISOString().split('T')[0];
        filled.push('deliveryDeadline');
      }
    }
    if (result.requirements?.length) {
      updates.requirements = result.requirements;
      filled.push('requirements');
    }

    setForm((f) => ({ ...f, ...updates }));
    setAiFilledFields(new Set(filled));
    toast.success('AI form alanlarını doldurdu! İsterseniz düzenleyebilirsiniz.');
  }

  function addRequirement() {
    if (!newReq.trim()) return;
    setForm((f) => ({ ...f, requirements: [...f.requirements, newReq.trim()] }));
    setNewReq('');
  }

  function removeRequirement(i: number) {
    setForm((f) => ({
      ...f,
      requirements: f.requirements.filter((_, idx) => idx !== i),
    }));
  }

  const { mutate: createAuction, isPending } = useMutation({
    mutationFn: () =>
      auctionsApi.create({
        title: form.title,
        description: form.description,
        category: form.category,
        quantity: Number(form.quantity),
        unit: form.unit,
        maxBudget: Number(form.maxBudget),
        deliveryDeadline: new Date(form.deliveryDeadline).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        deliveryAddress: form.deliveryAddress || undefined,
        requirements: form.requirements,
      }),
    onSuccess: (res) => {
      const auction = (res.data as ApiResponse<Auction>).data;
      toast.success('İhale taslağı oluşturuldu!');
      router.push(`/auctions/${auction.id}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'İhale oluşturulamadı.';
      toast.error(msg);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createAuction();
  }

  const isAi = (field: keyof FormState) => aiFilledFields.has(field);

  return (
    <div>
      <Header title="Yeni İhale Oluştur" subtitle="Taslak olarak kaydedilir" />

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 max-w-6xl">
          {/* Sol: AI şartname yükleme */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-[#0F172A] text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  AI Şartname Analizi
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  PDF şartnamenizi yükleyin, Gemini AI ihale formunu otomatik doldursun.
                </p>
              </div>
              <SpecUpload onAnalysisComplete={handleAiResult} />
            </div>

            {/* Bilgi kutusu */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-800 mb-2">Nasıl çalışır?</p>
              <ol className="text-xs text-blue-700 space-y-1.5">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  PDF şartnamenizi yükleyin
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  Gemini AI metni analiz eder
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  Form alanları otomatik dolar
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">4.</span>
                  İstediğiniz alanı düzenleyin
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">5.</span>
                  İhaleyi taslak olarak kaydedin
                </li>
              </ol>
            </div>
          </div>

          {/* Sağ: Form */}
          <form
            onSubmit={handleSubmit}
            className="xl:col-span-3 bg-white rounded-xl border border-slate-200 p-6 space-y-5"
          >
            <h3 className="font-semibold text-[#0F172A] text-sm border-b border-slate-100 pb-4">
              İhale Bilgileri
            </h3>

            {/* Başlık */}
            <div className="space-y-2">
              <Label className="text-[#334155] font-medium text-sm">
                İhale Başlığı <span className="text-red-500">*</span>
              </Label>
              {isAi('title') ? (
                <AiField>
                  <Input
                    value={form.title}
                    onChange={(e) => patch('title', e.target.value)}
                    className="border-blue-200 bg-blue-50/30"
                    required
                  />
                </AiField>
              ) : (
                <Input
                  placeholder="Örn: 500 Adet Ofis Koltuğu Alımı"
                  value={form.title}
                  onChange={(e) => patch('title', e.target.value)}
                  className="bg-white border-slate-200"
                  required
                />
              )}
            </div>

            {/* Açıklama */}
            <div className="space-y-2">
              <Label className="text-[#334155] font-medium text-sm">Açıklama</Label>
              <Textarea
                placeholder="İhale hakkında detaylı bilgi…"
                value={form.description}
                onChange={(e) => patch('description', e.target.value)}
                rows={3}
                className="bg-white border-slate-200 resize-none"
              />
            </div>

            {/* Kategori + Miktar + Birim */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#334155] font-medium text-sm">
                  Kategori <span className="text-red-500">*</span>
                </Label>
                {isAi('category') ? (
                  <AiField>
                    <Select
                      value={form.category}
                      onValueChange={(v) => patch('category', v)}
                      required
                    >
                      <SelectTrigger className="border-blue-200 bg-blue-50/30">
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </AiField>
                ) : (
                  <Select
                    value={form.category}
                    onValueChange={(v) => patch('category', v)}
                    required
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[#334155] font-medium text-sm">
                  Miktar <span className="text-red-500">*</span>
                </Label>
                {isAi('quantity') ? (
                  <AiField>
                    <Input
                      type="number"
                      value={form.quantity}
                      onChange={(e) => patch('quantity', e.target.value)}
                      className="border-blue-200 bg-blue-50/30"
                      min={1}
                      required
                    />
                  </AiField>
                ) : (
                  <Input
                    type="number"
                    placeholder="100"
                    value={form.quantity}
                    onChange={(e) => patch('quantity', e.target.value)}
                    className="border-slate-200"
                    min={1}
                    required
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[#334155] font-medium text-sm">Birim</Label>
                <Select value={form.unit} onValueChange={(v) => patch('unit', v)}>
                  <SelectTrigger className={isAi('unit') ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bütçe */}
            <div className="space-y-2">
              <Label className="text-[#334155] font-medium text-sm">
                Maksimum Bütçe (₺) <span className="text-red-500">*</span>
              </Label>
              {isAi('maxBudget') ? (
                <AiField>
                  <Input
                    type="number"
                    value={form.maxBudget}
                    onChange={(e) => patch('maxBudget', e.target.value)}
                    className="border-blue-200 bg-blue-50/30"
                    min={1}
                    required
                  />
                </AiField>
              ) : (
                <Input
                  type="number"
                  placeholder="500000"
                  value={form.maxBudget}
                  onChange={(e) => patch('maxBudget', e.target.value)}
                  className="border-slate-200"
                  min={1}
                  required
                />
              )}
            </div>

            {/* Tarihler */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#334155] font-medium text-sm">
                  İhale Bitiş Tarihi <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => patch('endsAt', e.target.value)}
                  className="border-slate-200"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#334155] font-medium text-sm">
                  Teslimat Tarihi <span className="text-red-500">*</span>
                </Label>
                {isAi('deliveryDeadline') ? (
                  <AiField>
                    <Input
                      type="date"
                      value={form.deliveryDeadline}
                      onChange={(e) => patch('deliveryDeadline', e.target.value)}
                      className="border-blue-200 bg-blue-50/30"
                      required
                    />
                  </AiField>
                ) : (
                  <Input
                    type="date"
                    value={form.deliveryDeadline}
                    onChange={(e) => patch('deliveryDeadline', e.target.value)}
                    className="border-slate-200"
                    required
                  />
                )}
              </div>
            </div>

            {/* Teslimat adresi */}
            <div className="space-y-2">
              <Label className="text-[#334155] font-medium text-sm">
                Teslimat Adresi
              </Label>
              <Input
                placeholder="İstanbul, Türkiye"
                value={form.deliveryAddress}
                onChange={(e) => patch('deliveryAddress', e.target.value)}
                className="border-slate-200"
              />
            </div>

            {/* Gereksinimler */}
            <div className="space-y-2">
              <Label className="text-[#334155] font-medium text-sm">
                Gereksinimler
              </Label>
              {form.requirements.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.requirements.map((r, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                        isAi('requirements')
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isAi('requirements') && <Sparkles className="w-2.5 h-2.5" />}
                      {r}
                      <button
                        type="button"
                        onClick={() => removeRequirement(i)}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="ISO 9001 Sertifikası…"
                  value={newReq}
                  onChange={(e) => setNewReq(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                  className="border-slate-200 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRequirement}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2 border-t border-slate-100">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-11 bg-[#0F172A] hover:bg-[#1e293b] text-white font-medium"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Oluşturuluyor…
                  </span>
                ) : (
                  'İhale Taslağını Kaydet'
                )}
              </Button>
              <p className="text-xs text-slate-500 text-center mt-2">
                Taslak olarak kaydedilir. Daha sonra &quot;Yayınla&quot; ile aktif edebilirsiniz.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
