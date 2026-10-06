"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  if (!mounted) return null;

  // Keep fixed positioning independent of animated or clipped page ancestors.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`modal-shell glass-strong neon-border relative flex w-full min-w-0 flex-col overflow-hidden ${sizes[size]} rounded-sm shadow-[0_0_60px_rgba(239,255,0,0.25)]`}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 p-4 sm:p-6">
              {title && (
                <h2 className="font-display text-xl font-bold uppercase tracking-widest text-white">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6 sm:pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
