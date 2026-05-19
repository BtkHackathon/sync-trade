'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Loader2,
  AlertTriangle,
  Users,
  Zap,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiApi } from '@/lib/api';
import type { ApiResponse, FraudDetectionResult } from '@/types';

interface FraudDetectionProps {
  auctionId: string;
  bidCount: number;
}

type FraudLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

const LEVEL_CONFIG: Record<
  FraudLevel,
  { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; border: string; text: string; badge: string }
> = {
  NONE: {
    label: 'Şüphe Yok',
    icon: ShieldCheck,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  LOW: {
    label: 'Düşük Risk',
    icon: ShieldAlert,
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  MEDIUM: {
    label: 'Orta Risk — İnceleme Önerilir',
    icon: AlertTriangle,
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    badge: 'bg-orange-100 text-orange-700',
  },
  HIGH: {
    label: 'Yüksek Risk — Kartel Şüphesi!',
    icon: ShieldOff,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-700',
  },
};

export function FraudDetection({ auctionId, bidCount }: FraudDetectionProps) {
  const [result, setResult] = useState<FraudDetectionResult | null>(null);

  const { mutate: detect, isPending } = useMutation({
    mutationFn: () => aiApi.detectFraud(auctionId),
    onSuccess: (res) => {
      const data = (res.data as ApiResponse<FraudDetectionResult>).data;
      setResult(data);
      if (data.suspicionLevel === 'HIGH') {
        toast.error('Yüksek kartel riski tespit edildi! İhaleyi dikkatlice inceleyin.');
      } else if (data.suspicionLevel === 'NONE') {
        toast.success('Anlamlı bir fiyat anlaşması riski tespit edilmedi.');
      } else {
        toast.warning(`${data.suspicionLevel} seviyede şüphe tespit edildi.`);
      }
    },
    onError: () => toast.error('Fraud analizi başarısız. Tekrar deneyin.'),
  });

  if (bidCount < 2) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#0F172A]">Kartel Tespiti</p>
            <p className="text-xs text-slate-500 mt-1">
              Kartel analizi için en az 2 farklı tedarikçi teklifi gereklidir. Şu an{' '}
              <strong>{bidCount}</strong> teklif bulunuyor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Açıklama kartı */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">
                Kartel & Fiyat Anlaşması Tespiti
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-md">
                Teklif fiyat aralığı, zamanlama örüntüleri, IP adresi paylaşımı ve
                güvenilirlik-fiyat uyumsuzluğu gibi göstergeler istatistiksel olarak
                analiz edilerek olası kartel davranışı tespit edilir.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  {bidCount} teklif analiz edilecek
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                  <Zap className="w-3.5 h-3.5" />
                  İstatistiksel örüntü analizi
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => detect()}
            disabled={isPending}
            size="sm"
            className="bg-[#0F172A] hover:bg-[#1e293b] text-white gap-2 shrink-0 h-10"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analiz ediliyor…
              </>
            ) : result ? (
              <>
                <ShieldAlert className="w-4 h-4" />
                Tekrar Analiz Et
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                Kartel Tespiti Yap
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Sonuç */}
      {result && (() => {
        const level = result.suspicionLevel as FraudLevel;
        const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.NONE;
        const Icon = cfg.icon;

        return (
          <div
            className={`rounded-xl border p-5 space-y-4 slide-up ${cfg.bg} ${cfg.border}`}
          >
            {/* Başlık */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.badge}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {level}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${cfg.text} opacity-80`}>
                  {bidCount} teklif istatistiksel olarak analiz edildi
                </p>
              </div>
            </div>

            {/* Analiz metni */}
            <div className={`rounded-lg p-3 border ${cfg.border} bg-white/50`}>
              <p className="text-xs font-semibold text-slate-600 mb-1">Analiz Gerekçesi</p>
              <p className={`text-sm leading-relaxed ${cfg.text}`}>{result.reasoning}</p>
            </div>

            {/* Şüpheli tedarikçiler */}
            {result.suspiciousSuppliers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">
                  Şüpheli Tedarikçiler ({result.suspiciousSuppliers.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.suspiciousSuppliers.map((s) => (
                    <span
                      key={s}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${cfg.badge} ${cfg.border}`}
                    >
                      <ShieldOff className="w-3 h-3" />
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Eylem önerisi */}
            {(level === 'HIGH' || level === 'MEDIUM') && (
              <div className="flex items-start gap-2 p-3 bg-white/70 rounded-lg border border-current/10">
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.text}`} />
                <p className={`text-xs ${cfg.text}`}>
                  {level === 'HIGH'
                    ? 'Bu ihaleyi iptal etmeyi veya şüpheli tedarikçileri hariç tutarak yeniden açmayı değerlendirin. Rekabet Kurumu\'na bildirim yapılabilir.'
                    : 'Tedarikçi tekliflerini manuel olarak inceleyin. Şüpheli fiyat örüntüleri tespit edildi.'}
                </p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
