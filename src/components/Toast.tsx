import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';

// --- Toast Component ---

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const bgColor = 
    type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
    type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 
    'bg-sky-500/10 border-sky-500/30 text-sky-400';

  return (
    <div className={`glass-panel border px-4 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-[250px] animate-slide-in-right ${bgColor}`}>
      <span className="font-mono text-sm">{message}</span>
      <button onClick={() => onClose(id)} className="ml-4 text-white/50 hover:text-white transition">
        &times;
      </button>
    </div>
  );
};

// --- Toast Context & Provider ---

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Omit<ToastProps, 'onClose'>[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const handleClose = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onClose={handleClose} />
          </div>
        ))}
      </div>
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

// --- ConfirmDialog Component ---

export interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
  inputPlaceholder?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  inputPlaceholder
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputPlaceholder && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputPlaceholder]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        onConfirm(inputPlaceholder ? inputValue : undefined);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, onConfirm, inputPlaceholder, inputValue]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="glass-panel p-6 rounded-xl border border-white/10 shadow-2xl max-w-sm w-full mx-4"
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-bold text-primary font-mono mb-2 uppercase tracking-wide">{title}</h3>
        <p className="text-sm text-gray-300 font-mono mb-4">{message}</p>
        
        {inputPlaceholder && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={inputPlaceholder}
            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono mb-4 focus:outline-none focus:border-primary transition"
          />
        )}
        
        <div className="flex justify-end gap-3 mt-6">
          <button 
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-mono font-bold hover:bg-white/5 transition"
          >
            CANCEL
          </button>
          <button 
            onClick={() => onConfirm(inputPlaceholder ? inputValue : undefined)}
            className="px-4 py-2 rounded-lg bg-primary text-slate-950 text-xs font-mono font-black tracking-wider hover:bg-primary/90 transition"
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
};
