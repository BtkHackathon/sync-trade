'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bot,
  Loader2,
  Star,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { aiApi } from '@/lib/api';
import type { ApiResponse } from '@/types';

interface SupplierRiskReport {
  supplierId: string;
  supplierName: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  trustScore: number;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendedUseCases: string[];
}

interface SupplierAnalysisProps {
  supplierId: string;
  supplierName: string;
}

const RISK_COLORS = {
  LOW: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  MEDIUM: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  HIGH: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

export function SupplierAnalysis({ supplierId, supplierName }: SupplierAnalysisProps) {
  const [report, setReport] = useState<SupplierRiskReport | null>(null);
  const [expanded, setExpanded] = useState(false);

  const { mutate: analyze, isPending } = useMutation({
    mutationFn: () => aiApi.analyzeSupplier(supplierId),
    onSuccess: (res) => {
      const data = (res.data as ApiResponse<SupplierRiskReport>).data;
      setReport(data);
      setExpanded(true);
      toast.success(`${supplierName} için risk analizi tamamlandı.`);
    },
    onError: () => toast.error('Tedarikçi analizi başarısız.'),
  });

  const colors = report ? RISK_COLORS[report.riskLevel] ?? RISK_COLORS.LOW : null;

  return (
    <div className="mt-2 space-y-2">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          if (report) {
            setExpanded((v) => !v);
          } else {
            analyze();
          }
        }}
        className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 gap-1.5"
      >
        {isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Bot className="w-3 h-3" />
        )}
        {isPending
          ? 'AI Analiz Ediyor…'
          : report
          ? expanded
            ? 'Gizle'
            : 'Raporu Göster'
          : 'AI Risk Analizi'}
        {report && !isPending && (
          expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </Button>

      {report && expanded && colors && (
        <div
          className={`rounded-lg border p-3 space-y-3 slide-up ${colors.bg} ${colors.border}`}
        >
          {/* Başlık */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-4 h-4 ${colors.text}`} />
              <span className={`text-xs font-semibold ${colors.text}`}>
                {supplierName} — Risk Analizi
              </span>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}
            >
              {report.riskLevel === 'LOW'
                ? 'Düşük Risk'
                : report.riskLevel === 'MEDIUM'
                ? 'Orta Risk'
                : 'Yüksek Risk'}
            </span>
          </div>

          {/* Güven skoru */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <Star className="w-3 h-3 text-blue-500" />
                Güven Skoru
              </span>
              <span className="text-xs font-bold text-[#0F172A]">
                {report.trustScore}/100
              </span>
            </div>
            <Progress value={report.trustScore} className="h-1.5" />
          </div>

          {/* Özet */}
          <p className="text-xs text-slate-700 leading-relaxed">{report.summary}</p>

          {/* Güçlü yanlar */}
          {report.strengths.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Güçlü Yanlar
              </p>
              <div className="space-y-1">
                {report.strengths.map((s) => (
                  <div key={s} className="flex items-start gap-1.5">
                    <TrendingUp className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-emerald-800">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Riskler */}
          {report.risks.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Risk Faktörleri
              </p>
              <div className="space-y-1">
                {report.risks.map((r) => (
                  <div key={r} className="flex items-start gap-1.5">
                    <AlertCircle className="w-3 h-3 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-orange-800">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Önerilen kullanım alanları */}
          {report.recommendedUseCases.length > 0 && (
            <div className="rounded p-2 bg-white/60 border border-current/10">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Önerilen Kullanım Alanları
              </p>
              <div className="flex flex-wrap gap-1">
                {report.recommendedUseCases.map((u) => (
                  <span key={u} className="text-xs bg-white/80 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                    {u}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
