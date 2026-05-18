'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { AuthResponse } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const { accessToken, company } = res.data.data as AuthResponse;
      setAuth(accessToken, company);
      toast.success(`Hoş geldiniz, ${company.name}!`);
      router.push('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Giriş yapılamadı. E-posta veya şifreyi kontrol edin.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Başlık */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 lg:hidden mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center">
            <span className="text-white text-xs font-bold">ST</span>
          </div>
          <span className="text-[#0F172A] font-semibold">SyncTrade</span>
        </div>
        <h2 className="text-2xl font-bold text-[#0F172A]">Giriş yapın</h2>
        <p className="text-slate-500 text-sm">
          Hesabınıza erişmek için bilgilerinizi girin.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#334155] font-medium text-sm">
            E-posta
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="firma@ornek.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="h-11 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#334155] font-medium text-sm">
            Şifre
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="h-11 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-[#0F172A] hover:bg-[#1e293b] text-white font-medium transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Giriş yapılıyor…
            </span>
          ) : (
            'Giriş Yap'
          )}
        </Button>
      </form>

      {/* Hızlı demo */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Demo Hesapları
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setEmail('buyer@demo.com');
              setPassword('Demo1234!');
            }}
            className="text-left px-3 py-2 rounded-md border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <p className="text-xs font-medium text-[#0F172A]">Alıcı (Buyer)</p>
            <p className="text-xs text-slate-500">buyer@demo.com</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail('supplier@demo.com');
              setPassword('Demo1234!');
            }}
            className="text-left px-3 py-2 rounded-md border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <p className="text-xs font-medium text-[#0F172A]">Tedarikçi</p>
            <p className="text-xs text-slate-500">supplier@demo.com</p>
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-slate-500">
        Hesabınız yok mu?{' '}
        <Link
          href="/register"
          className="text-blue-600 font-medium hover:underline"
        >
          Kayıt olun
        </Link>
      </p>
    </div>
  );
}
