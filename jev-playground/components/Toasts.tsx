'use client';

import { useCallback, useRef, useState } from 'react';

export type Toast = { id: number; title: string; detail?: string };
export type ShowToast = (title: string, detail?: string) => void;

const DURATION_MS = 4000;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show: ShowToast = useCallback(
    (title, detail) => {
      const id = ++next.current;
      // Keep at most 3 on screen.
      setToasts((t) => [...t.slice(-2), { id, title, detail }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  return { toasts, show, dismiss };
}

export function Toasts({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast-check" aria-hidden>
            ✓
          </span>
          <div className="toast-body">
            <strong>{t.title}</strong>
            {t.detail && <span>{t.detail}</span>}
          </div>
          <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
