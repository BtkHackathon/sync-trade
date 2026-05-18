'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Gavel,
  ListOrdered,
  Building2,
  LogOut,
  ChevronRight,
  Bot,
  Plus,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { disconnectSocket } from '@/lib/socket';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('BUYER' | 'SUPPLIER')[];
  badge?: string;
  description?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Genel Bakış',
    href: '/',
    icon: Home,
    description: 'Özet ve son aktiviteler',
  },
  {
    label: 'İhaleler',
    href: '/auctions',
    icon: Gavel,
    description: 'Tüm ihaleler',
  },
  {
    label: 'İhale Oluştur',
    href: '/auctions/create',
    icon: Plus,
    roles: ['BUYER'],
    description: 'AI destekli ihale aç',
  },
  {
    label: 'Tekliflerim',
    href: '/my-bids',
    icon: ListOrdered,
    roles: ['SUPPLIER'],
    description: 'Verdiğim teklifler',
  },
  {
    label: 'Firma Profili',
    href: '/profile',
    icon: Building2,
    description: 'Firma bilgileri',
  },
];

const AI_TOOLS: NavItem[] = [
  {
    label: 'AI Araçları',
    href: '/ai',
    icon: Bot,
    roles: ['BUYER'],
    description: 'Gemini AI analiz merkezi',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { company, logout } = useAuthStore();

  function handleLogout() {
    disconnectSocket();
    logout();
    toast.success('Başarıyla çıkış yapıldı.');
    router.push('/login');
  }

  const initials = company?.name
    ?.split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  const role = company?.role;

  const filtered = NAV_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

  const filteredAi = AI_TOOLS.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

  function NavLink({ item }: { item: NavItem }) {
    const isActive =
      item.href === '/'
        ? pathname === '/'
        : pathname.startsWith(item.href) &&
          !(item.href === '/auctions' && pathname === '/auctions/create');
    const Icon = item.icon;

    // "İhale Oluştur" → /auctions/create özel case
    const createActive = item.href === '/auctions/create' && pathname === '/auctions/create';
    const active = item.href === '/auctions/create' ? createActive : isActive;

    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
          active
            ? 'bg-white/10 text-white'
            : 'text-slate-400 hover:text-white hover:bg-white/5',
        )}
      >
        <Icon
          className={cn(
            'w-4 h-4 flex-shrink-0 transition-colors',
            active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300',
          )}
        />
        <span className="flex-1 leading-none">{item.label}</span>
        {active && <ChevronRight className="w-3.5 h-3.5 text-blue-400/60 flex-shrink-0" />}
      </Link>
    );
  }

  return (
    <aside className="w-60 min-h-screen bg-[#0F172A] flex flex-col fixed left-0 top-0 z-40 border-r border-white/5">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm group-hover:bg-blue-400 transition-colors">
            <TrendingDown className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-semibold tracking-tight text-sm block">
              SyncTrade
            </span>
            <span className="text-slate-500 text-xs">
              {role === 'BUYER' ? 'Alıcı Paneli' : 'Tedarikçi Paneli'}
            </span>
          </div>
        </Link>
      </div>

      {/* Gemini rozeti */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Bot className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-blue-300 text-xs font-medium">Gemini AI Aktif</span>
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        </div>
      </div>

      {/* Ana nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
          Menü
        </p>
        {filtered.map((item) => (
          <NavLink key={item.href + item.label} item={item} />
        ))}

        {/* AI araçları — sadece alıcılar */}
        {filteredAi.length > 0 && (
          <>
            <div className="pt-3">
              <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                AI Araçları
              </p>
            </div>
            {filteredAi.map((item) => (
              <NavLink key={item.href + item.label} item={item} />
            ))}
          </>
        )}
      </nav>

      {/* Kullanıcı */}
      <div className="border-t border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-300 text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {company?.name ?? '—'}
            </p>
            <p className="text-slate-500 text-xs truncate">
              {role === 'BUYER' ? 'Alıcı' : 'Tedarikçi'} ·{' '}
              {company?.isVerified ? (
                <span className="text-emerald-500">Doğrulanmış</span>
              ) : (
                <span className="text-slate-600">Beklemede</span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
