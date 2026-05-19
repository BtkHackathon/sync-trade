'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  Sparkles,
  Trophy,
  Shield,
  AlertTriangle,
  Loader2,
  TrendingDown,
  CheckCircle,
  XCircle,
  Zap,
  ShieldOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiApi } from '@/lib/api';
import { formatCurrency, riskColor, riskLabel, fraudColor } from '@/lib/utils';
import type { AiReport, ApiResponse, SupplierRanking } from '@/types';

interface AIDashboardProps {
  auctionId: string;
  isOwner?: boolean;
  onAward?: (bidId: string) => void;
  existingReportId?: string;
}

// ── Renk paleti ──────────────────────────────────────────────────────────────
const RANK_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
const RISK_COLOR: Record<string, string> = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
};

// ── Tooltip bileşenleri ──────────────────────────────────────────────────────
function BidTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-[#0F172A]">{d.name}</p>
      <p className="text-emerald-700 font-bold">{formatCurrency(d.amount)}</p>
      <p className={`font-medium ${RISK_COLOR[d.riskLevel] ? '' : ''}`} style={{ color: RISK_COLOR[d.riskLevel] }}>
        Risk: {d.riskLevel}
      </p>
    </div>
  );
}

function ScoreTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-[#0F172A]">{d.name}</p>
      <p className="text-blue-700 font-bold">AI Skoru: {d.aiScore}/100</p>
      <p className="text-slate-500">Güvenilirlik: {d.reliabilityScore}/10</p>
    </div>
  );
}

// ── Dairesel skor ────────────────────────────────────────────────────────────
function CircularScore({ score, label, max = 100 }: { score: number; label: string; max?: number }) {
  const pct = score / max;
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - pct * circ;
  const color = pct >= 0.8 ? '#10B981' : pct >= 0.6 ? '#3B82F6' : pct >= 0.4 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-[#0F172A]">{score}</span>
        </div>
      </div>
      <span className="text-xs text-slate-500 text-center">{label}</span>
    </div>
  );
}

// ── Tedarikçi satırı ─────────────────────────────────────────────────────────
function RankingRow({ ranking, onAward, delay }: { ranking: SupplierRanking; onAward?: () => void; delay: number }) {
  return (
    <div
      className="slide-up flex items-center gap-3 p-4 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all min-w-0 overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        ranking.rank === 1 ? 'bg-emerald-600 text-white' :
        ranking.rank === 2 ? 'bg-blue-500 text-white' :
        ranking.rank === 3 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
      }`}>
        {ranking.rank === 1 ? <Trophy className="w-4 h-4" /> : ranking.rank}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[#0F172A] truncate">{ranking.supplierName}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${riskColor(ranking.riskLevel)}`}>
            {riskLabel(ranking.riskLevel)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {ranking.strengths.slice(0, 2).map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-2.5 h-2.5" />{s}
            </span>
          ))}
          {ranking.risks.slice(0, 1).map((r) => (
            <span key={r} className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">
              <XCircle className="w-2.5 h-2.5" />{r}
            </span>
          ))}
        </div>
      </div>

      <div className="text-right flex-shrink-0 space-y-1">
        <p className="text-sm font-bold text-emerald-700">{formatCurrency(ranking.bidAmount)}</p>
        <p className="text-xs text-blue-700 font-semibold">{ranking.aiScore}/100</p>
      </div>

      {onAward && ranking.rank === 1 && (
        <Button size="sm" onClick={onAward} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 flex-shrink-0">
          <Trophy className="w-3.5 h-3.5 mr-1" />Onayla
        </Button>
      )}
    </div>
  );
}

// ── Ana bileşen ──────────────────────────────────────────────────────────────
export function AIDashboard({ auctionId, isOwner = false, onAward }: AIDashboardProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: reportData, refetch, isLoading } = useQuery({
    queryKey: ['ai-report', auctionId],
    queryFn: () => aiApi.getReport(auctionId),
    select: (r) => (r.data as ApiResponse<AiReport>).data,
    retry: false,
  });

  const { mutate: generateReport } = useMutation({
    mutationFn: () => aiApi.analyzeAuction(auctionId),
    onMutate: () => setIsGenerating(true),
    onSuccess: () => {
      toast.success('AI analizi tamamlandı!');
      void refetch();
      setIsGenerating(false);
    },
    onError: (err) => {
      const msg =
        axios.isAxiosError(err)
          ? (err.response?.data as { message?: string })?.message ?? err.message
          : err instanceof Error ? err.message : 'Analiz oluşturulamadı. Tekrar deneyin.';
      toast.error(msg);
      setIsGenerating(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[100, 80, 90].map((w, i) => (
          <div key={i} className="h-20 rounded-xl shimmer" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <p className="font-semibold text-[#0F172A]">AI Analizi Henüz Yapılmadı</p>
          <p className="text-slate-500 text-sm mt-1">
            {isOwner
              ? 'Gemini AI tüm teklifleri değerlendirerek en uygun tedarikçiyi öneriyor.'
              : 'İhale sahibi henüz AI analizini başlatmamış. Rapor hazır olduğunda burada görünecek.'}
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => generateReport()} disabled={isGenerating} className="bg-[#0F172A] hover:bg-[#1e293b] text-white gap-2">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Gemini Analiz Ediyor…</>
            ) : (
              <><Sparkles className="w-4 h-4" />AI Analizini Başlat</>
            )}
          </Button>
        )}
      </div>
    );
  }

  const analysis = reportData.analysisResult;
  const fraud = analysis.fraudDetection;
  const hasFraudAlert = fraud.suspicionLevel !== 'NONE';
  const rankings = analysis.supplierRankings;
  const winnerRanking = rankings[0];

  // ── Grafik verileri ─────────────────────────────────────────────────────────
  const bidChartData = rankings.map((r, i) => ({
    name: r.supplierName.length > 14 ? r.supplierName.slice(0, 13) + '…' : r.supplierName,
    fullName: r.supplierName,
    amount: r.bidAmount,
    riskLevel: r.riskLevel,
    fill: RANK_COLORS[i] ?? '#94A3B8',
  }));

  const scoreChartData = rankings.map((r, i) => ({
    name: r.supplierName.length > 14 ? r.supplierName.slice(0, 13) + '…' : r.supplierName,
    fullName: r.supplierName,
    aiScore: r.aiScore,
    reliabilityScore: Math.round(r.reliabilityScore * 10),
    fill: RANK_COLORS[i] ?? '#94A3B8',
  }));

  const maxBudget = analysis.lowestBid.amount > 0
    ? Math.max(...rankings.map(r => r.bidAmount)) * 1.15
    : undefined;

  const radarData = winnerRanking ? [
    { subject: 'Fiyat', value: Math.round((analysis.lowestBid.amount / winnerRanking.bidAmount) * 100) },
    { subject: 'Güvenilirlik', value: Math.round(winnerRanking.reliabilityScore * 10) },
    { subject: 'AI Skoru', value: winnerRanking.aiScore },
    { subject: 'Risk Uyumu', value: winnerRanking.riskLevel === 'LOW' ? 90 : winnerRanking.riskLevel === 'MEDIUM' ? 55 : 20 },
    { subject: 'Sıralama', value: Math.max(0, 100 - (winnerRanking.rank - 1) * 20) },
  ] : [];

  return (
    <div className="space-y-5 w-full overflow-hidden">
      {/* Başlık banner */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1e3a5f] rounded-xl p-5 flex flex-wrap items-center gap-4 slide-up">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold">Gemini AI Analizi Tamamlandı</p>
            {reportData.generatedWithFallback && (
              <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">
                Deterministik mod
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-0.5">
            {rankings.length} tedarikçi değerlendirildi · {reportData.processingTimeMs}ms
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" />
        </div>
      </div>

      {/* Fraud uyarısı */}
      {hasFraudAlert && (
        <div className={`rounded-xl border p-4 flex gap-3 slide-up ${
          fraud.suspicionLevel === 'HIGH' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'
        }`}>
          <ShieldOff className={`w-5 h-5 flex-shrink-0 mt-0.5 ${fraud.suspicionLevel === 'HIGH' ? 'text-red-600' : 'text-orange-600'}`} />
          <div>
            <div className="flex items-center gap-2">
              <p className={`text-sm font-semibold ${fraud.suspicionLevel === 'HIGH' ? 'text-red-800' : 'text-orange-800'}`}>
                {fraud.suspicionLevel === 'HIGH' ? 'Yüksek Kartel Şüphesi!' : 'Fiyat Anlaşması Riski'}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fraudColor(fraud.suspicionLevel)}`}>
                {fraud.suspicionLevel}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">{fraud.reasoning}</p>
            {fraud.suspiciousSuppliers.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">Şüpheli: {fraud.suspiciousSuppliers.join(', ')}</p>
            )}
          </div>
        </div>
      )}

      {/* Özet kartları */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-[#0F172A]">En Düşük Teklif</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(analysis.lowestBid.amount)}</p>
          <p className="text-sm text-slate-600">{analysis.lowestBid.supplierName}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200 p-5 space-y-3 slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-semibold text-[#0F172A]">AI Önerisi</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(analysis.recommendedBid.amount)}</p>
          <p className="text-sm text-slate-600">{analysis.recommendedBid.supplierName}</p>
          <p className="text-xs text-blue-700 bg-blue-50 rounded-lg p-2">{analysis.recommendedBid.reason}</p>
        </div>
      </div>

      {/* ── GRAFİK 1: Teklif Karşılaştırması ── */}
      {bidChartData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 slide-up overflow-hidden" style={{ animationDelay: '200ms' }}>
          <p className="text-sm font-semibold text-[#0F172A] mb-1 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            Teklif Karşılaştırması
          </p>
          <p className="text-xs text-slate-500 mb-4">Tedarikçilerin teklif tutarları (düşük = iyi)</p>
          <div className="w-full" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bidChartData} margin={{ top: 8, right: 4, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis
                  tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip content={<BidTooltip />} cursor={{ fill: '#F8FAFC' }} />
                {analysis.lowestBid.amount > 0 && (
                  <ReferenceLine y={analysis.lowestBid.amount} stroke="#10B981" strokeDasharray="4 3" />
                )}
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {bidChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} opacity={i === 0 ? 1 : 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {bidChartData.map((d, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.fill }} />
                {d.fullName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── GRAFİK 2: AI Skor Sıralaması ── */}
      {scoreChartData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 slide-up overflow-hidden" style={{ animationDelay: '260ms' }}>
          <p className="text-sm font-semibold text-[#0F172A] mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            AI Skor Sıralaması
          </p>
          <p className="text-xs text-slate-500 mb-4">Fiyat, güvenilirlik ve teslimat geçmişi birleştirilmiş skor (yüksek = iyi)</p>
          <div className="w-full" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreChartData} margin={{ top: 8, right: 4, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ScoreTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <ReferenceLine y={60} stroke="#94A3B8" strokeDasharray="4 3" />
                <Bar dataKey="aiScore" radius={[6, 6, 0, 0]}>
                  {scoreChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} opacity={i === 0 ? 1 : 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── GRAFİK 3: Kazanan Tedarikçi Radar ── */}
      {winnerRanking && radarData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 slide-up overflow-hidden" style={{ animationDelay: '320ms' }}>
          <p className="text-sm font-semibold text-[#0F172A] mb-1 flex items-center gap-2 min-w-0">
            <Shield className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">{winnerRanking.supplierName} — Performans Profili</span>
          </p>
          <p className="text-xs text-slate-500 mb-4">AI önerilen kazananın çok boyutlu değerlendirmesi</p>
          {/* Radar */}
          <div className="w-full" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="65%">
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748B' }} />
                <Radar dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.18} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Dairesel skorlar — yatay, grafiğin altında */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <CircularScore score={Math.round(winnerRanking.reliabilityScore * 10)} label="Güvenilirlik" />
            <CircularScore score={winnerRanking.aiScore} label="AI Skoru" />
            <CircularScore
              score={
                (winnerRanking.riskLevel ?? '').toUpperCase() === 'LOW'
                  ? 90
                  : (winnerRanking.riskLevel ?? '').toUpperCase() === 'MEDIUM'
                  ? 55
                  : 20
              }
              label="Risk Uyumu"
            />
          </div>
        </div>
      )}

      {/* Tedarikçi sıralaması */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden slide-up" style={{ animationDelay: '380ms' }}>
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-[#0F172A]">Tedarikçi Sıralaması</p>
          <p className="text-xs text-slate-500 mt-0.5">{analysis.summary}</p>
        </div>
        <div className="p-4 space-y-3">
          {rankings.map((ranking, i) => (
            <RankingRow
              key={ranking.supplierId}
              ranking={ranking}
              delay={420 + i * 60}
              onAward={onAward && ranking.rank === 1 ? () => onAward(ranking.supplierId) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Pazar analizi */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 slide-up" style={{ animationDelay: '560ms' }}>
        <p className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          Gemini Pazar Analizi
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">{analysis.marketInsights}</p>
        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs font-semibold text-blue-800 mb-1">Nihai Öneri</p>
          <p className="text-sm text-blue-700">{analysis.finalRecommendation}</p>
        </div>
      </div>

      {/* RAG bağlamı */}
      {reportData.ragContextUsed.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 slide-up" style={{ animationDelay: '620ms' }}>
          <p className="text-sm font-semibold text-[#0F172A] mb-1 flex items-center gap-2">
            <span className="w-4 h-4 flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
              </svg>
            </span>
            RAG — Tedarikçi Hafızası Kullanıldı
          </p>
          <p className="text-xs text-slate-500 mb-3">
            Gemini AI bu analizi yaparken pgvector'den{' '}
            <strong>{reportData.ragContextUsed.length}</strong> geçmiş tedarikçi kaydını bağlam olarak kullandı.
          </p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {reportData.ragContextUsed.map((ctx, i) => (
              <div key={i} className="text-xs font-mono bg-slate-50 border border-slate-200 rounded p-2 text-slate-600 truncate">
                {ctx}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
