'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  endsAt: string;
  onExpired?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calc(endsAt: string): TimeLeft {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0)
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const totalSecs = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    minutes: Math.floor((totalSecs % 3600) / 60),
    seconds: totalSecs % 60,
    expired: false,
  };
}

function Digit({
  value,
  label,
  urgent,
}: {
  value: number;
  label: string;
  urgent: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold tabular-nums transition-colors ${
          urgent
            ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
            : 'bg-[#0F172A] text-white shadow-md'
        }`}
      >
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-xs text-slate-500 mt-1.5">{label}</span>
    </div>
  );
}

export function CountdownTimer({ endsAt, onExpired }: CountdownTimerProps) {
  const [time, setTime] = useState<TimeLeft>(() => calc(endsAt));

  useEffect(() => {
    const id = setInterval(() => {
      const next = calc(endsAt);
      setTime(next);
      if (next.expired) {
        clearInterval(id);
        onExpired?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt, onExpired]);

  const urgent = !time.expired && time.days === 0 && time.hours === 0 && time.minutes < 5;

  if (time.expired) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-100 border border-slate-200">
        <Clock className="w-5 h-5 text-slate-400" />
        <span className="font-semibold text-slate-500">İhale süresi doldu</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className={`w-4 h-4 ${urgent ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
        <span className={`text-sm font-medium ${urgent ? 'text-red-600' : 'text-slate-500'}`}>
          {urgent ? 'İhale kapanmak üzere!' : 'Kalan Süre'}
        </span>
      </div>

      <div className="flex items-end gap-2">
        {time.days > 0 && (
          <Digit value={time.days} label="Gün" urgent={urgent} />
        )}
        <Digit value={time.hours} label="Saat" urgent={urgent} />
        <div className="text-2xl font-bold text-slate-400 mb-5">:</div>
        <Digit value={time.minutes} label="Dakika" urgent={urgent} />
        <div className="text-2xl font-bold text-slate-400 mb-5">:</div>
        <Digit value={time.seconds} label="Saniye" urgent={urgent} />
      </div>
    </div>
  );
}
