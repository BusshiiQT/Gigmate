import * as React from "react";
import { useToastCore } from "./toast";

let id = 0;

export function useToast() {
  const { toasts, setToasts } = useToastCore();

  const toast = React.useCallback(
    (opts: { title?: string; description?: string }) => {
      const toastId = `t_${++id}`;
      setToasts((prev) => [
        ...prev,
        { id: toastId, title: opts.title, description: opts.description, open: true },
      ]);
      // Auto-close after 7s (was 3s)
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 7000);
    },
    [setToasts]
  );

  return { toast, toasts };
}
