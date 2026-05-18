'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, X, Check, Gavel, TrendingDown, Trophy, ShieldAlert, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useNotificationsStore,
  type Notification,
  type NotifType,
} from '@/store/notifications.store';

const ICON_MAP: Record<NotifType, React.ComponentType<{ className?: string }>> = {
  bid: TrendingDown,
  'auction-open': Play,
  'auction-close': Gavel,
  award: Trophy,
  fraud: ShieldAlert,
};

const COLOR_MAP: Record<NotifType, string> = {
  bid: 'bg-emerald-100 text-emerald-700',
  'auction-open': 'bg-blue-100 text-blue-700',
  'auction-close': 'bg-orange-100 text-orange-700',
  award: 'bg-purple-100 text-purple-700',
  fraud: 'bg-red-100 text-red-700',
};

function NotifRow({ n }: { n: Notification }) {
  const Icon = ICON_MAP[n.type] ?? Bell;
  const color = COLOR_MAP[n.type] ?? 'bg-slate-100 text-slate-600';
  const elapsed = Math.floor((Date.now() - n.createdAt.getTime()) / 1000);
  const timeLabel =
    elapsed < 60
      ? `${elapsed}sn önce`
      : elapsed < 3600
      ? `${Math.floor(elapsed / 60)}dk önce`
      : `${Math.floor(elapsed / 3600)}s önce`;

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors',
        n.read ? 'bg-white' : 'bg-blue-50/50',
      )}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#0F172A] leading-snug">{n.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.body}</p>
        <p className="text-[10px] text-slate-400 mt-1">{timeLabel}</p>
      </div>
      {!n.read && (
        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
      )}
    </div>
  );
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { items, markAllRead, clear, unreadCount } = useNotificationsStore();
  const count = unreadCount();

  // Dışarı tıklayınca kapat
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && count > 0) {
      setTimeout(markAllRead, 800);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell butonu */}
      <button
        onClick={handleOpen}
        className={cn(
          'relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
          open
            ? 'bg-slate-100 text-slate-700'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
        )}
        title="Bildirimler"
      >
        {count > 0 ? (
          <BellRing className="w-4 h-4 animate-[wiggle_0.5s_ease-in-out]" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Başlık */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">Bildirimler</p>
              <p className="text-xs text-slate-500">
                {items.length === 0
                  ? 'Henüz bildirim yok'
                  : `${items.length} bildirim`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {items.length > 0 && (
                <>
                  <button
                    onClick={markAllRead}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
                    title="Tümünü okundu işaretle"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={clear}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
                    title="Tümünü temizle"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  İhale eventleri burada görünecek.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Teklif, açılış, kapanış ve ödül bildirimleri.
                </p>
              </div>
            ) : (
              items.map((n) => <NotifRow key={n.id} n={n} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
