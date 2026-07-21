import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Check, Info, Heart } from "lucide-react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "gold";
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div
      id="toast-container"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  key?: any;
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <Check className="w-4 h-4 text-emerald-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
    gold: <Sparkles className="w-4 h-4 text-gold-500 shrink-0 animate-pulse" />
  };

  return (
    <motion.div
      id={`toast-item-${toast.id}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-auto p-4 bg-maroon-900 border border-gold-500/40 text-cream-100 rounded shadow-2xl flex gap-3 items-center justify-between"
    >
      <div className="flex gap-2.5 items-center">
        {icons[toast.type]}
        <span className="text-xs font-sans tracking-wide font-medium">
          {toast.message}
        </span>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gold-500/50 hover:text-gold-300 text-xs font-mono p-1"
        aria-label="Close notification"
      >
        ✕
      </button>
    </motion.div>
  );
}
