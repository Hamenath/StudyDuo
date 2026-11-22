import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, CheckCircle2, Info, Download, ArrowRight } from 'lucide-react';
import type { AvatarConfig } from '../../lib/avatarCatalog';
import { PlayerAvatar } from '../avatar/PlayerAvatar';
import { MascotImage, type MascotKey } from './MascotArtwork';

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}> = ({ children, className = '', padding = 'md', hover = false }) => {
  const pad =
    padding === 'none'
      ? ''
      : padding === 'sm'
      ? 'p-4'
      : padding === 'lg'
      ? 'p-6 sm:p-7'
      : 'p-5';
  return (
    <div className={`sd-card ${hover ? 'sd-card-hover' : ''} ${pad} ${className}`}>
      {children}
    </div>
  );
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    withArrowCircle?: boolean;
  }
> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  withArrowCircle = false,
  className = '',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-bold rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7651E8] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none whitespace-nowrap active:scale-[0.98]';
  const variants: Record<string, string> = {
    primary:
      'bg-[#7651E8] text-white hover:bg-[#6440D6] shadow-[0_8px_20px_-8px_rgba(118,81,232,0.55)]',
    secondary:
      'bg-white text-[#20202A] border border-[#F0EDF5] hover:bg-[#F8F5FF] hover:border-[#DFD5FA]',
    ghost: 'bg-transparent text-[#777783] hover:bg-[#EFE9FF] hover:text-[#20202A]',
    danger: 'bg-[#FFF0F3] text-[#C82D4F] border border-[#FFD6DF] hover:bg-[#FFE3E9]',
    success: 'bg-[#2FB368] text-white hover:bg-[#259A57]',
  };
  const sizes: Record<string, string> = {
    sm: 'text-xs px-4 py-2 min-h-[38px]',
    md: 'text-sm px-5 py-2.5 min-h-[44px]',
    lg: 'text-base px-6 py-3 min-h-[54px]',
  };

  if (withArrowCircle) {
    return (
      <button
        className={`${base} ${variants[variant]} ${sizes[size]} ${
          fullWidth ? 'w-full' : ''
        } justify-between pl-6 pr-2 ${className}`}
        {...props}
      >
        <span className="flex-1 text-center">{children}</span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#7651E8]">
          <ArrowRight className="h-4 w-4 stroke-[2.5]" />
        </span>
      </button>
    );
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: 'purple' | 'green' | 'amber' | 'slate' | 'rose' | 'cyan';
  className?: string;
}> = ({ children, tone = 'slate', className = '' }) => {
  const tones: Record<string, string> = {
    purple: 'bg-[#E9DFFF] text-[#6842DE]',
    green: 'bg-[#E2F5E9] text-[#1F874D]',
    amber: 'bg-[#FFF0C9] text-[#B47100]',
    slate: 'bg-[#F4F2F8] text-[#777783]',
    rose: 'bg-[#FFE8F0] text-[#BE3469]',
    cyan: 'bg-[#E9DFFF] text-[#6842DE]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

export const Avatar: React.FC<{
  name: string;
  initials: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'studio';
  ring?: boolean;
  avatarConfig?: AvatarConfig;
  seedKey?: string;
  animated?: boolean;
}> = ({ name, size = 'md', ring = false, avatarConfig, seedKey, animated = false }) => {
  return (
    <PlayerAvatar
      config={avatarConfig}
      seedKey={seedKey || name}
      size={size}
      animated={animated}
      className={ring ? 'ring-2 ring-[#7651E8] ring-offset-2 ring-offset-white' : undefined}
      alt={name}
    />
  );
};

export const ProgressBar: React.FC<{
  percent: number;
  color?: string;
  trackColor?: string;
  height?: string;
  label?: string;
}> = ({ percent, color = '#7651E8', trackColor = '#EFEBF9', height = 'h-2.5', label }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between text-xs text-[#777783] mb-1.5">
          <span>{label}</span>
          <span className="font-bold text-[#20202A] tabular-nums">{clamped}%</span>
        </div>
      )}
      <div
        className={`w-full ${height} rounded-full overflow-hidden`}
        style={{ backgroundColor: trackColor }}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export const CircularProgress: React.FC<{
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}> = ({
  percent,
  size = 64,
  strokeWidth = 6,
  color = '#7651E8',
  trackColor = '#E9DFFF',
  children,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 320ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

export const ModalSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'md' | 'lg';
}> = ({ open, onClose, title, subtitle, children, size = 'md' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#20202A]/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`relative z-10 w-full ${
              size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
            } max-h-[92dvh] overflow-y-auto rounded-t-[32px] sm:rounded-[28px] bg-white border border-[#F0EDF5] shadow-xl`}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#F0EDF5] bg-white px-6 py-4">
              <div>
                <h2 id="modal-title" className="text-lg font-extrabold text-[#20202A]">
                  {title}
                </h2>
                {subtitle && <p className="text-xs text-[#777783] mt-0.5">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F8F5FF] text-[#777783] hover:bg-[#E9DFFF] hover:text-[#20202A] cursor-pointer shrink-0 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, description, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onCancel }) => (
  <ModalSheet open={open} onClose={onCancel} title={title}>
    <p className="text-sm text-[#777783] leading-relaxed">{description}</p>
    <div className="mt-6 flex items-center justify-end gap-2.5">
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  </ModalSheet>
);

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  mascot?: MascotKey;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ mascot = 'science', title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center text-center rounded-[28px] bg-white border border-[#F0EDF5] px-6 py-10 shadow-[0_8px_24px_-12px_rgba(118,81,232,0.08)]">
    <MascotImage mascot={mascot} className="h-24 w-24 mb-4" rounded="rounded-[24px]" />
    <h3 className="text-lg font-extrabold text-[#20202A]">{title}</h3>
    <p className="mt-1.5 text-sm text-[#777783] max-w-md leading-relaxed">{description}</p>
    {actionLabel && onAction && (
      <Button className="mt-5" onClick={onAction} withArrowCircle>
        {actionLabel}
      </Button>
    )}
  </div>
);

export const ErrorBanner: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div
    role="alert"
    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FFD6DF] bg-[#FFF0F3] px-4 py-3 text-sm text-[#B82547]"
  >
    <div className="flex items-center gap-2.5">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="text-xs font-bold underline underline-offset-2 cursor-pointer"
      >
        Try again
      </button>
    )}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-5 animate-pulse">
    <div className="h-28 rounded-[28px] bg-[#E9DFFF]/70" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-44 rounded-[28px] bg-[#E9DFFF]/50" />
      <div className="h-44 rounded-[28px] bg-[#FFF0C9]/60" />
    </div>
    <div className="h-56 rounded-[28px] bg-white border border-[#F0EDF5]" />
  </div>
);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  if (installed || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const res = await deferredPrompt.userChoice;
    if (res.outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleInstall}>
      <Download className="h-4 w-4 text-[#7651E8]" />
      {compact ? 'Install' : 'Install StudyDuo'}
    </Button>
  );
};

export const ToastStack: React.FC<{
  toasts: Array<{ id: string; message: string; tone: 'success' | 'error' | 'info' }>;
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => (
  <div
    aria-live="polite"
    className="fixed bottom-20 lg:bottom-5 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
  >
    <AnimatePresence>
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.16 }}
          className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-md ${
            t.tone === 'error'
              ? 'bg-[#FFF0F3] border-[#FFD6DF] text-[#B82547]'
              : t.tone === 'info'
              ? 'bg-[#F8F5FF] border-[#E9DFFF] text-[#20202A]'
              : 'bg-white border-[#F0EDF5] text-[#20202A]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {t.tone === 'error' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#D9365E]" />
            ) : t.tone === 'info' ? (
              <Info className="h-4 w-4 shrink-0 text-[#7651E8]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2FB368]" />
            )}
            <span className="leading-snug">{t.message}</span>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="text-[#777783] hover:text-[#20202A] cursor-pointer shrink-0 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);
