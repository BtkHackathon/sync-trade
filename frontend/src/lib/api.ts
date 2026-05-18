import axios from 'axios';
import type {
  AuthResponse,
  CreateAuctionDto,
  LoginDto,
  RegisterDto,
} from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  timeout: 30_000,
});

// Token'ı request'e ekle (store import döngüsünü önlemek için localStorage'dan oku)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('synctrade-auth');
      if (raw) {
        const parsed = JSON.parse(raw) as { state?: { token?: string } };
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // localStorage parse hatası sessizce görmezden gel
    }
  }
  return config;
});

// 401 → login sayfasına yönlendir
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (
      typeof window !== 'undefined' &&
      axios.isAxiosError(error) &&
      error.response?.status === 401
    ) {
      localStorage.removeItem('synctrade-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (dto: LoginDto) =>
    api.post<{ success: boolean; data: AuthResponse }>('/auth/login', dto),

  register: (dto: RegisterDto) =>
    api.post<{ success: boolean; data: AuthResponse }>('/auth/register', dto),

  me: () => api.get('/auth/me'),
};

// ── Companies ─────────────────────────────────────────────────────────────
export const companiesApi = {
  getMe: () => api.get('/companies/me'),
  getById: (id: string) => api.get(`/companies/${id}`),
  getSuppliers: (params?: { page?: number; limit?: number }) =>
    api.get('/companies/suppliers', { params }),
  update: (data: Record<string, unknown>) => api.patch('/companies/me', data),
  getSupplierProfile: () => api.get('/companies/me/supplier-profile'),
  updateSupplierProfile: (data: Record<string, unknown>) =>
    api.patch('/companies/me/supplier-profile', data),
};

// ── Auctions ──────────────────────────────────────────────────────────────
export const auctionsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; sector?: string }) =>
    api.get('/auctions', { params }),

  get: (id: string) => api.get(`/auctions/${id}`),

  create: (dto: CreateAuctionDto) => api.post('/auctions', dto),

  update: (id: string, dto: Partial<CreateAuctionDto>) =>
    api.patch(`/auctions/${id}`, dto),

  open: (id: string) => api.patch(`/auctions/${id}/open`),

  close: (id: string) => api.patch(`/auctions/${id}/close`),

  cancel: (id: string) => api.delete(`/auctions/${id}`),

  award: (id: string, bidId: string) =>
    api.post(`/auctions/${id}/award/${bidId}`),
};

// ── Bids ──────────────────────────────────────────────────────────────────
export const bidsApi = {
  place: (dto: { auctionId: string; amount: number; note?: string }) =>
    api.post('/bids', dto),

  mine: () => api.get('/bids/my'),

  forAuction: (auctionId: string) => api.get(`/bids/auction/${auctionId}`),

  withdraw: (id: string) => api.delete(`/bids/${id}`),
};

// ── AI ────────────────────────────────────────────────────────────────────
export const aiApi = {
  analyzeSpec: (formData: FormData) =>
    // Content-Type axios tarafından boundary ile otomatik ayarlanır
    api.post('/ai/analyze-spec', formData),

  analyzeAuction: (auctionId: string) =>
    api.post(`/ai/auctions/${auctionId}/analyze`),

  getReport: (auctionId: string) => api.get(`/ai/reports/${auctionId}`),

  detectFraud: (auctionId: string) =>
    api.post(`/ai/detect-fraud/${auctionId}`),

  analyzeSupplier: (supplierId: string) =>
    api.post(`/ai/analyze-supplier/${supplierId}`),
};
