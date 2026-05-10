import { createContext } from 'react';

export interface ToastInput {
  message: string;
  action?: { label: string; onAction: () => void };
  duration?: number;
  variant?: 'default' | 'error';
}

export interface ToastApi {
  show: (input: ToastInput) => number;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
