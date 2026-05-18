'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Bot,
  FileText,
  ShieldAlert,
  UserCheck,
  Trophy,
  BrainCircuit,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Zap,
  Database,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { auctionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatDate } from '@/lib/utils';
import type { ApiResponse, PaginatedData, Auction } from '@/types';

const AI_FEATURES = [
  {
    icon: FileText,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    title: 'Şartname Analizi',
    description:
      'PDF şartnamenizi yükleyin. Gemini AI içeriği okuyarak ihale formunu otomatik doldurur. Ürün adı, miktar, bütçe ve teslim tarihi tahmin edilir.',
    trigger: 'İhale oluştururken kullanılır',
    href: '/auctions/create',
    linkLabel: 'İhale Oluştur',
    badge: 'Otomatik',
  },
  {
    icon: ShieldAlert,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    title: 'Kartel & Fiyat Anlaşması Tespiti',
    description:
      'Gemini AI, tedarikçi teklifleri arasındaki örüntüleri analiz eder. IP bazlı koordinasyon, yapay fiyat seviyeleri ve şüpheli teklif zamanlamaları tespit edilir.',
    trigger: 'Açık ve kapalı ihalelerde çalışır',
    href: '/auctions',
    linkLabel: 'İhaleye Git',
    badge: 'Kritik',
  },
  {
    icon: UserCheck,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    title: 'Tedarikçi Risk Analizi',
    description:
      'Her tedarikçi için geçmiş performans, sertifikalar ve uzmanlık alanları değerlendirilerek 0–100 güven skoru ve risk seviyesi hesaplanır.',
    trigger: 'Teklif tablosunda her tedarikçi için',
    href: '/auctions',
    linkLabel: 'İhaleye Git',
    badge: 'Per-Supplier',
  },
  {
    icon: Trophy,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    title: 'İhale Karar Analizi',
    description:
      'İhale kapandığında Gemini AI tüm teklifleri değerlendirerek kazanan önerisi, pazar analizi ve nihai tavsiye üretir. Fraud tespiti de dahildir.',
    trigger: 'İhale kapatıldıktan sonra tetiklenir',
    href: '/auctions',
    linkLabel: 'Kapalı İhalelere Git',
    badge: 'Post-Close',
  },
  {
    icon: BrainCircuit,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    title: 'RAG — Tedarikçi Hafızası',
    description:
      'Her analiz sonrası tedarikçi verileri pgvector ile vektör veritabanına yazılır. Sonraki analizlerde Gemini bu geçmiş bağlamı kullanır. Manuel tetikleme gerekmez.',
    trigger: 'Otomatik — her analizde arka planda çalışır',
    href: null,
    linkLabel: null,
    badge: 'Otomatik',
  },
];

function FeatureCard({
  feature,
}: {
  feature: (typeof AI_FEATURES)[0];
}) {
  const Icon = feature.icon;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${feature.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
          {feature.badge}
        </span>
      </div>

      <div>
        <h3 className="font-semibold text-[#0F172A] text-sm">{feature.title}</h3>
        <p className="text-slate-500 text-xs leading-relaxed mt-1.5">
          {feature.description}
        </p>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Zap className="w-3 h-3" />
          {feature.trigger}
        </div>
        {feature.href && feature.linkLabel && (
          <Link
            href={feature.href}
            className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
          >
            {feature.linkLabel}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function AIPage() {
  const router = useRouter();
  const { company } = useAuthStore();

  useEffect(() => {
    if (company && company.role !== 'BUYER') {
      router.replace('/auctions');
    }
  }, [company, router]);

  const { data: closedAuctions } = useQuery({
    queryKey: ['auctions', 'closed-for-ai'],
    queryFn: () => auctionsApi.list({ status: 'CLOSED', limit: 5 }),
    select: (r) => (r.data as ApiResponse<PaginatedData<Auction>>).data?.items ?? [],
  });

  const { data: awardedAuctions } = useQuery({
    queryKey: ['auctions', 'awarded-for-ai'],
    queryFn: () => auctionsApi.list({ status: 'AWARDED', limit: 5 }),
    select: (r) => (r.data as ApiResponse<PaginatedData<Auction>>).data?.items ?? [],
  });

  const analysisReady = [
    ...(closedAuctions ?? []),
    ...(awardedAuctions ?? []),
  ].slice(0, 6);

  if (company?.role !== 'BUYER') return null;

  return (
    <div>
      <Header
        title="AI Araçları"
        subtitle="Gemini AI Destekli Analiz Merkezi"
      />

      <div className="p-6 space-y-6">
        {/* Başlık banner */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1e3a5f] rounded-xl p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <Bot className="w-7 h-7 text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-bold text-lg">Gemini AI — Analiz Merkezi</h2>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              SyncTrade'in 5 yapay zeka özelliği burada yönetilir. Şartname analizinden
              kartel tespitine, tedarikçi risk skorlamasından RAG tabanlı hafızaya kadar
              tüm AI süreçleri Gemini API üzerinde çalışır.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <p className="text-blue-300 text-xs font-semibold">Google Gemini</p>
              <p className="text-slate-500 text-xs">text-embedding-004 · gemini-2.0-flash</p>
            </div>
            <Sparkles className="w-6 h-6 text-blue-400" />
          </div>
        </div>

        {/* Özellik kartları */}
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Mevcut AI Özellikleri
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {AI_FEATURES.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </div>
        </div>

        {/* Analiz bekleyen ihaleler */}
        {analysisReady.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-[#0F172A] text-sm">
                AI Analizi Bekleyen / Tamamlanan İhaleler
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {analysisReady.map((auction) => (
                <Link
                  key={auction.id}
                  href={`/auctions/${auction.id}?tab=ai`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    auction.status === 'AWARDED' ? 'bg-blue-500' : 'bg-orange-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {auction.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {auction.bidCount} teklif · {formatDate(auction.endsAt)} kapandı
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      auction.aiReportId
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {auction.aiReportId ? 'Rapor Hazır' : 'Analiz Bekleniyor'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {analysisReady.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 py-12 text-center space-y-3">
            <Bot className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <p className="font-medium text-[#0F172A] text-sm">
                Henüz kapanan ihale yok
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Bir ihaleyi kapatıp AI analizini buradan takip edebilirsiniz.
              </p>
            </div>
            <Link href="/auctions/create">
              <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline">
                İlk ihalenizi oluşturun <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
