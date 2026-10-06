"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "warning";
interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

const ToastCtx = createContext<{
  push: (message: string, variant?: ToastVariant) => void;
}>({ push: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

const ICONS: Record<ToastVariant, any> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS: Record<ToastVariant, string> = {
  success: "border-emerald-400/40 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.35)]",
  error: "border-red-500/40 text-red-200 shadow-[0_0_24px_rgba(239,68,68,0.35)]",
  warning: "border-amber-400/40 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.35)]",
  info: "border-cyber-400/40 text-cyber-100 shadow-[0_0_24px_rgba(239,255,0,0.35)]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((cur) => [...cur, { id, message, variant }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toast-stack pointer-events-none fixed bottom-4 right-4 max-w-[calc(100vw-2rem)] z-[100] flex flex-col gap-2 sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.variant];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                transition={{ type: "spring", damping: 22, stiffness: 240 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-lg border bg-black/80 px-4 py-3 backdrop-blur-xl ${COLORS[t.variant]}`}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm leading-snug">{t.message}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
    </MotionConfig>
  );
}

/** Convenience hook for showing one-off toast from non-client modules. */
export function useAutoToast(trigger: any, message: string, variant: ToastVariant = "info") {
  const { push } = useToast();
  useEffect(() => {
    if (trigger) push(message, variant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
}