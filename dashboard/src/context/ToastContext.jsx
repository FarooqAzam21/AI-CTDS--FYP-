import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const toastStyles = {
  success: {
    icon: CheckCircle,
    bg: 'bg-[#36D399]/10',
    border: 'border-[#36D399]/25',
    text: 'text-[#36D399]',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-[#FF3D57]/10',
    border: 'border-[#FF3D57]/25',
    text: 'text-[#FF3D57]',
  },
  info: {
    icon: Info,
    bg: 'bg-[#FF6A3D]/10',
    border: 'border-[#FF6A3D]/25',
    text: 'text-[#FF6A3D]',
  },
};

const AppToast = ({ toast, onClose }) => {
  const style = toastStyles[toast.type] || toastStyles.info;
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      className={`fixed bottom-6 right-6 z-[2000] flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-xl min-w-[280px] max-w-[420px] ${style.bg} ${style.border}`}
    >
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${style.text}`} />
      <p className={`text-[13px] leading-relaxed flex-1 ${style.text}`}>{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};

const ConfirmDialog = ({ dialog, onConfirm, onCancel }) => {
  if (!dialog) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-content max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-2">{dialog.title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{dialog.message}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {dialog.cancelLabel || 'Cancel'}
          </button>
          <button
            type="button"
            className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {dialog.confirmLabel || 'Confirm'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const toastTimer = useRef(null);
  const dialogResolver = useRef(null);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 4500) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      dialogResolver.current = resolve;
      setDialog({
        message,
        title: options.title || 'Confirm action',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        danger: options.danger ?? false,
      });
    });
  }, []);

  const handleConfirm = () => {
    dialogResolver.current?.(true);
    dialogResolver.current = null;
    setDialog(null);
  };

  const handleCancel = () => {
    dialogResolver.current?.(false);
    dialogResolver.current = null;
    setDialog(null);
  };

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}
      <AnimatePresence>
        {toast && <AppToast toast={toast} onClose={dismissToast} />}
      </AnimatePresence>
      <AnimatePresence>
        {dialog && (
          <ConfirmDialog dialog={dialog} onConfirm={handleConfirm} onCancel={handleCancel} />
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
