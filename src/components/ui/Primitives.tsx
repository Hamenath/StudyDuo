import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Download, RefreshCw, X } from 'lucide-react';
import type { AvatarConfig } from '../../types/studyduo';
import { PlayerAvatar } from '../avatar/PlayerAvatar';

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}> = ({ children, className = '', padding = 'md' }) => {
  const pad =
    padding === 'none'
      ? ''
      : padding === 'sm'
      ? 'p-4'
      : padding === 'lg'
      ? 'p-5 sm:p-6'
      : 'p-4 sm:p-5';
  return (
    <div
      className={`rounded-2xl border border-[#EAE7F8] bg-white shadow-[0_2px_12px_rgba(121,86,232,0.05),0_1px_2px_rgba(37,36,58,0.03)] ${pad} ${className}`}
    >
      {children}
    </div>
  );
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'gold';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
  }
> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7956E8]/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[0.98]';
  const variants = {
    primary:
      'bg-[#7956E8] text-white hover:bg-[#6743D8] shadow-[0_4px_14px_rgba(121,86,232,0.28)] hover:shadow-[0_6px_18px_rgba(121,86,232,0.34)]',
    secondary:
      'bg-white text-[#25243A] border border-[#E4DFF6] hover:bg-[#F7F5FF] hover:border-[#CFC6F7]',
    ghost: 'bg-transparent text-[#6A6880] hover:bg-[#F2EFFE] hover:text-[#25243A]',
    danger: 'bg-[#FFF1F2] text-[#C83D49] border border-[#F8D0D4] hover:bg-[#FFE3E6]',
    success: 'bg-[#38B982] text-white hover:bg-[#2DA16F] shadow-[0_4px_12px_rgba(56,185,130,0.26)]',
    gold: 'bg-[#FFC857] text-[#25243A] hover:bg-[#F4BA42] shadow-[0_4px_12px_rgba(255,200,87,0.34)]',
  };
  const sizes = {
    sm: 'text-xs px-3 py-2 rounded-xl min-h-[36px]',
    md: 'text-sm px-4 py-2.5 rounded-xl min-h-[44px]',
    lg: 'text-sm px-5 py-3 rounded-xl min-h-[48px]',
  };
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
  tone?: 'purple' | 'green' | 'yellow' | 'cyan' | 'neutral' | 'red';
  className?: string;
}> = ({ children, tone = 'neutral', className = '' }) => {
  const tones = {
    purple: 'bg-[#F1EDFF] text-[#6B48DC]',
    green: 'bg-[#E6F8F0] text-[#1F8B5D]',
    yellow: 'bg-[#FFF7E0] text-[#9A6808]',
    cyan: 'bg-[#E5F8FB] text-[#1D8597]',
    neutral: 'bg-[#F3F2FA] text-[#66647B]',
    red: 'bg-[#FFF0F1] text-[#C83D49]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-tight ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

export const Avatar: React.FC<{
  name?: string;
  initials: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  photoURL?: string;
  avatarConfig?: AvatarConfig | null;
  seedKey?: string;
  animated?: boolean;
  className?: string;
}> = ({
  name,
  initials,
  color = '#7956E8',
  size = 'md',
  photoURL,
  avatarConfig,
  seedKey,
  animated = false,
  className = '',
}) => {
  if (avatarConfig) {
    return (
      <PlayerAvatar
        config={avatarConfig}
        seedKey={seedKey}
        size={size}
        animated={animated}
        className={className}
        alt={name || `Avatar ${initials}`}
      />
    );
  }

  const sizes = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name || initials}
        referrerPolicy="no-referrer"
        className={`${sizes[size]} rounded-full object-cover border border-[#EAE7F8] shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ backgroundColor: color }}
      aria-label={name || initials}
      className={`${sizes[size]} rounded-full text-white font-semibold flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
};

export const ProgressBar: React.FC<{
  percent: number;
  color?: string;
  height?: string;
  className?: string;
}> = ({ percent, color = '#7956E8', height = 'h-2.5', className = '' }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`w-full rounded-full bg-[#EFEBF9] overflow-hidden ${height} ${className}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
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
  size = 84,
  strokeWidth = 8,
  color = '#7956E8',
  trackColor = '#EFEBF9',
  children,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
};

export const ModalSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ open, onClose, title, subtitle, children, maxWidth, size = 'md' }) => {
  const widthClass =
    maxWidth || (size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg');
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-[#25243A]/45"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`relative z-10 w-full ${widthClass} rounded-t-3xl sm:rounded-3xl bg-white border border-[#EAE7F8] shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#F1EEFA] px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#25243A] truncate">{title}</h2>
                {subtitle && <p className="text-xs text-[#77768C] mt-0.5">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#77768C] hover:bg-[#F3F0FF] hover:text-[#25243A] transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 pb-safe">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = true,
  onConfirm,
  onCancel,
}) => (
  <ModalSheet open={open} onClose={onCancel} title={title} maxWidth="max-w-md">
    <div className="space-y-4">
      <p className="text-sm text-[#66647B] leading-relaxed">{description}</p>
      <div className="flex justify-end gap-2.5 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </ModalSheet>
);

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, description, action, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-6 rounded-2xl border border-dashed border-[#DFD8F8] bg-[#FAF9FF]">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1EDFF] text-[#7956E8]">
      {icon}
    </div>
    <h3 className="text-sm font-bold text-[#25243A]">{title}</h3>
    <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#77768C]">{description}</p>
    {action ? (
      <div className="mt-4">{action}</div>
    ) : actionLabel && onAction ? (
      <div className="mt-4">
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    ) : null}
  </div>
);

export const ErrorBanner: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Something went wrong', message, onRetry }) => (
  <div
    role="alert"
    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F8D0D4] bg-[#FFF4F5] px-4 py-3 text-xs text-[#A32E3A]"
  >
    <div className="flex items-start gap-2.5 min-w-0">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#D94B57]" />
      <div className="min-w-0">
        <p className="font-semibold text-[#8A202B]">{title}</p>
        <p className="mt-0.5 text-[#A32E3A]">{message}</p>
      </div>
    </div>
    {onRetry && (
      <Button size="sm" variant="secondary" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </Button>
    )}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-5" aria-busy="true" aria-label="Loading view">
    <div className="sd-skeleton h-32 rounded-3xl border border-[#EAE7F8]" />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="sd-skeleton h-36 rounded-2xl border border-[#EAE7F8]" />
      <div className="sd-skeleton h-36 rounded-2xl border border-[#EAE7F8]" />
      <div className="sd-skeleton h-36 rounded-2xl border border-[#EAE7F8]" />
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="sd-skeleton h-64 rounded-2xl border border-[#EAE7F8] lg:col-span-7" />
      <div className="sd-skeleton h-64 rounded-2xl border border-[#EAE7F8] lg:col-span-5" />
    </div>
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
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#E6F8F0] px-3 py-2 text-xs font-bold text-[#1F8B5D]">
        App Installed
      </span>
    );
  }

  if (!deferredPrompt) {
    return (
      <span className="text-xs text-[#77768C]">
        {compact
          ? 'Install via browser menu'
          : 'Use your browser menu (“Add to Home Screen”) to install StudyDuo.'}
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={async () => {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') setInstalled(true);
        setDeferredPrompt(null);
      }}
    >
      <Download className="h-3.5 w-3.5" />
      {compact ? 'Install App' : 'Install StudyDuo App'}
    </Button>
  );
};

export interface ToastItem {
  id: string;
  message: string;
  tone: 'success' | 'info' | 'error';
}

export const ToastStack: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-6 right-4 z-[80] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-lg ${
            toast.tone === 'error'
              ? 'border-[#F5C7CC] bg-[#FFF4F5] text-[#A32E3A]'
              : toast.tone === 'info'
                ? 'border-[#D7D2F4] bg-white text-[#25243A]'
                : 'border-[#BFEFD9] bg-[#F2FCF7] text-[#1D7F54]'
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss message"
            className="text-current opacity-60 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

