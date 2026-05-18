'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Mail, Phone, MapPin, ShieldCheck, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Header } from '@/components/layout/Header';
import { companiesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatDate } from '@/lib/utils';
import type { Company, ApiResponse } from '@/types';

export default function ProfilePage() {
  const { company: authCompany } = useAuthStore();

  const { data: freshCompany } = useQuery({
    queryKey: ['company-me'],
    queryFn: () => companiesApi.getMe(),
    select: (r) => (r.data as ApiResponse<Company>).data,
  });

  const company = freshCompany ?? authCompany;

  if (!company) return null;

  const isBuyer = company.role === 'BUYER';

  return (
    <div>
      <Header title="Firma Profili" />

      <div className="p-6 space-y-6 max-w-3xl">
        {/* Ana kart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#0F172A] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl font-bold">
                {company.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-[#0F172A]">{company.name}</h2>
                <Badge
                  className={
                    isBuyer
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }
                  variant="outline"
                >
                  {isBuyer ? 'Alıcı' : 'Tedarikçi'}
                </Badge>
                {company.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" />
                    Doğrulanmış
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm mt-1">
                {company.sector ?? 'Sektör belirtilmemiş'}
                {company.city && ` · ${company.city}`}
                {company.country && `, ${company.country}`}
              </p>
              {company.createdAt && (
                <p className="text-slate-400 text-xs mt-1">
                  Kayıt: {formatDate(company.createdAt)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              {company.email}
            </div>
            {company.phone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {company.phone}
              </div>
            )}
            {company.taxId && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                VKN: {company.taxId}
              </div>
            )}
            {company.address && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {company.address}
              </div>
            )}
          </div>
        </div>

        {/* Tedarikçi profili */}
        {!isBuyer && company.supplierProfile && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-[#0F172A] text-sm">
                Tedarikçi Performans Metrikleri
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Güvenilirlik Skoru</span>
                  <span className="font-bold text-emerald-700">
                    {company.supplierProfile.reliabilityScore}/100
                  </span>
                </div>
                <Progress
                  value={company.supplierProfile.reliabilityScore}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Zamanında Teslimat</span>
                  <span className="font-bold text-blue-700">
                    %{Math.round(company.supplierProfile.onTimeDeliveryRate * 100)}
                  </span>
                </div>
                <Progress
                  value={company.supplierProfile.onTimeDeliveryRate * 100}
                  className="h-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                <p className="text-2xl font-bold text-[#0F172A]">
                  {company.supplierProfile.completedAuctions}
                </p>
                <p className="text-xs text-slate-500">Tamamlanan İhale</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                <p className="text-2xl font-bold text-[#0F172A]">
                  {company.supplierProfile.cancelledAuctions}
                </p>
                <p className="text-xs text-slate-500">İptal Edilen</p>
              </div>
            </div>

            {company.supplierProfile.certifications.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Sertifikalar
                </p>
                <div className="flex flex-wrap gap-2">
                  {company.supplierProfile.certifications.map((c) => (
                    <Badge
                      key={c}
                      variant="outline"
                      className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50"
                    >
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {company.supplierProfile.specializations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Uzmanlık Alanları
                </p>
                <div className="flex flex-wrap gap-2">
                  {company.supplierProfile.specializations.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="text-xs border-blue-200 text-blue-700 bg-blue-50"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
