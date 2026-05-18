'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Company } from '@/types';

interface AuthState {
  token: string | null;
  company: Company | null;
  setAuth: (token: string, company: Company) => void;
  updateCompany: (company: Company) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      company: null,

      setAuth: (token, company) => set({ token, company }),

      updateCompany: (company) => set({ company }),

      logout: () => set({ token: null, company: null }),

      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'synctrade-auth',
    },
  ),
);
