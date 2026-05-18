'use client';

import { useAuthStore } from '@/store/auth.store';
import { ShieldCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationPanel } from '@/components/layout/NotificationPanel';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { company } = useAuthStore();

  const isBuyer = company?.role === 'BUYER';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-30 shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[#0F172A] truncate">{title}</h1>
          {subtitle && (
            <span className="text-slate-400 text-sm hidden md:inline truncate">
              — {subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {actions}

        {/* Bildirim paneli */}
        <NotificationPanel />

        {/* Rol + doğrulama */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full',
              isBuyer
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isBuyer ? 'bg-blue-500' : 'bg-emerald-500',
              )}
            />
            {isBuyer ? 'Alıcı' : 'Tedarikçi'}
          </span>

          {company?.isVerified ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Doğrulanmış
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              Doğrulanmadı
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
