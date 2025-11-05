"use client";

import * as React from "react";

// Types
export type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  open?: boolean;
};

// Context
type ToastContextValue = {
  toasts: ToastItem[];
  setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>>;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

// Hook used by use-toast.ts
export function useToastCore() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToastCore must be used within <Toaster />");
  return ctx;
}

/**
 * ToastProvider wraps your entire app so any child can call useToast().
 * It also renders the toast list UI.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  return (
    <ToastContext.Provider value={{ toasts, setToasts }}>
      {children}
      {/* Renderer anchored to the viewport */}
      <div className="pointer-events-none fixed inset-0 z-[100] flex items-end justify-end p-4 sm:items-end">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto rounded-lg border bg-white p-3 shadow-md"
              role="status"
            >
              {t.title && <div className="text-sm font-medium">{t.title}</div>}
              {t.description && (
                <div className="mt-1 text-sm text-gray-700">{t.description}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Backwards-compat: export Toaster as an alias of ToastProvider.
 * You can use either <ToastProvider> or <Toaster>.
 */
export const Toaster = ToastProvider;

export default Toaster;
