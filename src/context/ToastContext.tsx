import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-100 flex flex-col gap-3 w-full max-w-[380px] pointer-events-none p-4">
        <AnimatePresence>
          {toasts.map((toast) => {
            let icon = <Info className="w-5 h-5 text-blue-500" />;
            let borderColor = 'border-blue-200/50';
            let bgColor = 'bg-white/85';
            let iconBg = 'bg-blue-50 text-blue-500';

            if (toast.type === 'success') {
              icon = <CheckCircle className="w-5 h-5 text-emerald-600" />;
              borderColor = 'border-emerald-200/50';
              bgColor = 'bg-emerald-50/90';
              iconBg = 'bg-emerald-100 text-emerald-600';
            } else if (toast.type === 'error') {
              icon = <AlertCircle className="w-5 h-5 text-red-600" />;
              borderColor = 'border-red-200/50';
              bgColor = 'bg-red-50/90';
              iconBg = 'bg-red-100 text-red-600';
            } else if (toast.type === 'warning') {
              icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
              borderColor = 'border-amber-200/50';
              bgColor = 'bg-amber-50/90';
              iconBg = 'bg-amber-100 text-amber-600';
            }

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.2 } }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border ${borderColor} ${bgColor} shadow-xl backdrop-blur-md max-w-full overflow-hidden`}
              >
                <div className={`p-1.5 rounded-xl shrink-0 ${iconBg}`}>
                  {icon}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-xs font-bold text-slate-800 leading-normal">
                    {toast.message}
                  </p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:bg-slate-100/50 rounded-lg text-slate-400 hover:text-slate-600 transition shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
