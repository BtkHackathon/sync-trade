'use client';

import { create } from 'zustand';

export type NotifType = 'bid' | 'auction-open' | 'auction-close' | 'award' | 'fraud';

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  auctionId?: string;
  read: boolean;
  createdAt: Date;
}

interface NotificationsState {
  items: Notification[];
  push: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAllRead: () => void;
  unreadCount: () => number;
  clear: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],

  push: (n) =>
    set((s) => ({
      items: [
        {
          ...n,
          id: crypto.randomUUID(),
          read: false,
          createdAt: new Date(),
        },
        ...s.items.slice(0, 49), // maks 50 bildirim tut
      ],
    })),

  markAllRead: () =>
    set((s) => ({
      items: s.items.map((i) => ({ ...i, read: true })),
    })),

  unreadCount: () => get().items.filter((i) => !i.read).length,

  clear: () => set({ items: [] }),
}));
