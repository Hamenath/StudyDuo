import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, Info, WifiOff, X, AlertCircle } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../../hooks/usePWAInstall';
import type { ToastMessage } from '../../context/StudyDuoContext';

export const Avatar: React.FC<{
  name: string;
  initials: string;
  color: string;
  photoURL?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ name, initials, color, photoURL, size = 'md', className = '' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const sizes: Record<string, string> = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  if (photoURL && !imgFailed) {
    return (
      <img
        src={photoURL}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizes[size]} rounded-full object-cover shrink-0 border border-[#E9EAF0] ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      style={{ backgroundColor: color || '#7956D8' }}
      className={`${sizes[size]} rounded-full text-white font-semibold flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {initials}
    </div>
  );
};

export const ModalSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, size = 'md', children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#242337]/40 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        } max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white border border-[#E9EAF0] shadow-xl overflow-hidden`}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-[#E9EAF0]" />
        </div>
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-[#E9EAF0]">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#242337] leading-snug">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-[#66687A]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-xl text-[#66687A] hover:bg-[#F8F9FC] hover:text-[#242337] transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 sm:px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, description, confirmLabel, danger = true, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <ModalSheet open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-[#66687A] leading-relaxed">{description}</p>
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-4 py-2.5 text-sm font-medium text-[#242337] hover:bg-[#F8F9FC] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`min-h-[44px] rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
            danger ? 'bg-[#E66F77] hover:bg-[#D55B64]' : 'bg-[#7956D8] hover:bg-[#6643C7]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalSheet>
  );
};

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, description, actionLabel, onAction }) => (
  <div className="rounded-2xl bg-white border border-[#E9EAF0] px-6 py-12 text-center">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0EBFF] text-[#7956D8]">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-[#242337]">{title}</h3>
    <p className="mx-auto mt-1.5 max-w-md text-sm text-[#66687A] leading-relaxed">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#7956D8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6643C7] transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#F0EBFF] text-[#7956D8] font-semibold hover:bg-[#E4DAFF] transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'min-h-[40px] px-3 py-2 text-xs' : 'min-h-[44px] w-full px-4 py-2.5 text-sm'
        }`}
      >
        <Download className="h-4 w-4" />
        Install StudyDuo
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#E9EAF0] bg-white text-[#242337] font-medium hover:bg-[#F8F9FC] transition-colors whitespace-nowrap shrink-0 ${
            compact ? 'min-h-[40px] px-3 py-2 text-xs' : 'min-h-[44px] w-full px-4 py-2.5 text-sm'
          }`}
        >
          <Download className="h-4 w-4 text-[#7956D8]" />
          Install on iOS
        </button>
        <ModalSheet open={showIOSGuide} onClose={() => setShowIOSGuide(false)} title="Install StudyDuo on iOS">
          <ol className="space-y-3 text-sm text-[#242337]">
            <li>1. Tap the <strong>Share</strong> icon in Safari’s bottom toolbar.</li>
            <li>2. Scroll down and select <strong>Add to Home Screen</strong>.</li>
            <li>3. Tap <strong>Add</strong> to launch StudyDuo full-screen like a native app.</li>
          </ol>
          <button
            type="button"
            onClick={() => setShowIOSGuide(false)}
            className="mt-5 w-full min-h-[44px] rounded-xl bg-[#7956D8] text-sm font-semibold text-white"
          >
            Got it
          </button>
        </ModalSheet>
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div
      role="status"
      className="fixed bottom-20 lg:bottom-5 left-5 z-50 flex items-center gap-2 rounded-xl bg-[#FFF6E5] border border-[#F3BD59] px-3.5 py-2 text-xs font-semibold text-[#242337] shadow-md"
    >
      <WifiOff className="h-4 w-4 text-[#C28A1E]" />
      Offline mode — changes sync when reconnected.
    </div>
  );
};

export const ToastStack: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-3.5 shadow-lg ${
            toast.tone === 'error'
              ? 'border-[#E66F77]/50'
              : toast.tone === 'info'
              ? 'border-[#7956D8]/30'
              : 'border-[#38A879]/40'
          }`}
        >
          {toast.tone === 'error' ? (
            <AlertCircle className="h-5 w-5 text-[#E66F77] shrink-0 mt-0.5" />
          ) : toast.tone === 'info' ? (
            <Info className="h-5 w-5 text-[#7956D8] shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-[#38A879] shrink-0 mt-0.5" />
          )}
          <p className="text-sm text-[#242337] flex-1 leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="p-1 rounded-lg text-[#88899B] hover:text-[#242337]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
