'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { AuthResponse, CompanyRole } from '@/types';

const SECTORS = [
  'Tekstil',
  'İnşaat',
  'Gıda',
  'Elektronik',
  'Makine',
  'Kimya',
  'Otomotiv',
  'Sağlık',
  'Lojistik',
  'Diğer',
];

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'BUYER' as CompanyRole,
    sector: '',
    taxId: '',
    city: '',
    country: 'TR',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function patch(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.register(form);
      const { accessToken, company } = res.data.data as AuthResponse;
      setAuth(accessToken, company);
      toast.success('Hoş geldiniz! Hesabınız oluşturuldu.');
      router.push('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Kayıt olunamadı. Lütfen bilgileri kontrol edin.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 lg:hidden mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center">
            <span className="text-white text-xs font-bold">ST</span>
          </div>
          <span className="text-[#0F172A] font-semibold">SyncTrade</span>
        </div>
        <h2 className="text-2xl font-bold text-[#0F172A]">Hesap oluşturun</h2>
        <p className="text-slate-500 text-sm">
          Birkaç dakikada platforma üye olun.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Firma adı */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[#334155] font-medium text-sm">
            Firma Adı
          </Label>
          <Input
            id="name"
            placeholder="Örnek A.Ş."
            value={form.name}
            onChange={(e) => patch('name', e.target.value)}
            required
            className="h-11 bg-white border-slate-200 focus:border-blue-500"
          />
        </div>

        {/* E-posta */}
        <div className="space-y-2">
          <Label htmlFor="reg-email" className="text-[#334155] font-medium text-sm">
            E-posta
          </Label>
          <Input
            id="reg-email"
            type="email"
            placeholder="firma@ornek.com"
            value={form.email}
            onChange={(e) => patch('email', e.target.value)}
            required
            className="h-11 bg-white border-slate-200 focus:border-blue-500"
          />
        </div>

        {/* Şifre */}
        <div className="space-y-2">
          <Label htmlFor="reg-password" className="text-[#334155] font-medium text-sm">
            Şifre
          </Label>
          <div className="relative">
            <Input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="En az 8 karakter"
              value={form.password}
              onChange={(e) => patch('password', e.target.value)}
              required
              className="h-11 bg-white border-slate-200 focus:border-blue-500 pr-10"
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

        {/* Rol + Sektör */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[#334155] font-medium text-sm">Rol</Label>
            <Select
              value={form.role}
              onValueChange={(v) => patch('role', v)}
            >
              <SelectTrigger className="h-11 bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUYER">Alıcı (Buyer)</SelectItem>
                <SelectItem value="SUPPLIER">Tedarikçi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[#334155] font-medium text-sm">Sektör</Label>
            <Select
              value={form.sector}
              onValueChange={(v) => patch('sector', v)}
            >
              <SelectTrigger className="h-11 bg-white border-slate-200">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vergi No + Şehir */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="taxId" className="text-[#334155] font-medium text-sm">
              Vergi No
            </Label>
            <Input
              id="taxId"
              placeholder="0000000000"
              value={form.taxId}
              onChange={(e) => patch('taxId', e.target.value)}
              className="h-11 bg-white border-slate-200 focus:border-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city" className="text-[#334155] font-medium text-sm">
              Şehir
            </Label>
            <Input
              id="city"
              placeholder="İstanbul"
              value={form.city}
              onChange={(e) => patch('city', e.target.value)}
              className="h-11 bg-white border-slate-200 focus:border-blue-500"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-[#0F172A] hover:bg-[#1e293b] text-white font-medium"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Kayıt oluşturuluyor…
            </span>
          ) : (
            'Hesap Oluştur'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Zaten hesabınız var mı?{' '}
        <Link href="/login" className="text-blue-600 font-medium hover:underline">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
