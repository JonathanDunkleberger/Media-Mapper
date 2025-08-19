"use client";
import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export interface Toast { id: string; message: string; type?: 'info' | 'error' | 'success'; ttl?: number }
interface ToastContextValue { push: (msg: string, opts?: { type?: Toast['type']; ttl?: number }) => void }

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, opts?: { type?: Toast['type']; ttl?: number }) => {
    const id = Math.random().toString(36).slice(2);
    const ttl = opts?.ttl ?? 4000;
    const type = opts?.type ?? 'info';
    setToasts(t => [...t, { id, message, type, ttl }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ttl);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed z-50 bottom-4 right-4 flex flex-col gap-2 items-end">
        {toasts.map(t => (
          <div key={t.id} className={`rounded px-3 py-2 text-sm shadow ring-1 ring-white/10 max-w-xs ${t.type === 'error' ? 'bg-rose-600 text-white' : t.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-white/90'}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider />');
  return ctx.push;
}
