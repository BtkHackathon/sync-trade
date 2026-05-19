import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function timeLeft(endsAt: string | null | undefined): string {
  if (!endsAt) return '—';
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Sona erdi';
  const totalSecs = Math.floor(diff / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  if (days > 0) return `${days}g ${hours}s`;
  if (hours > 0) return `${hours}s ${mins}dk`;
  return `${mins}dk`;
}

export function riskColor(level: string): string {
  const l = (level ?? '').toUpperCase();
  if (l === 'LOW') return 'text-emerald-700 bg-emerald-100';
  if (l === 'HIGH') return 'text-red-700 bg-red-100';
  return 'text-orange-700 bg-orange-100';
}

export function riskLabel(level: string): string {
  const l = (level ?? '').toUpperCase();
  if (l === 'LOW') return 'Düşük Risk';
  if (l === 'HIGH') return 'Yüksek Risk';
  return 'Orta Risk';
}

export function fraudColor(level: string): string {
  if (level === 'NONE') return 'text-emerald-700 bg-emerald-100';
  if (level === 'HIGH') return 'text-red-700 bg-red-100';
  if (level === 'MEDIUM') return 'text-orange-700 bg-orange-100';
  return 'text-yellow-700 bg-yellow-100';
}

