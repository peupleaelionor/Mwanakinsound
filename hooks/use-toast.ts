'use client';

import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'error';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'> & { id?: string }) => void;
  dismiss: (id: string) => void;
}

/**
 * Minimal toast store. Auto-dismisses after 4s. Consumed by <Toaster/> and
 * fired from anywhere via `toast(...)`.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = t.id ?? Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/** Imperative helper. */
export function toast(input: { title: string; description?: string; variant?: ToastVariant }) {
  useToastStore.getState().push({ variant: 'default', ...input });
}
