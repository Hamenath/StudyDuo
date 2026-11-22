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
      ? 'p-3.5 sm:p-4'
      : padding === 'lg'
      ? 'p-5 sm:p-6'
      : 'p-4 sm:p-5';
  return (
    <div
      className={`rounded-2xl border border-[#EEEEF2] bg-white shadow-[0_1px_2px_rgba(36,36,36,0.03)] ${pad} ${className}`}
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
    'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7956E8]/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[0.98] whitespace-nowrap';
  const variants = {
    primary: 'bg-[#7956E8] text-white hover:bg-[#6744D6]',
    secondary: 'bg-white text-[#242424] border border-[#E4E4EC] hover:bg-[#F7F8FA]',
    ghost: 'bg-transparent text-[#666666] hover:bg-[#F3F4F6] hover:text-[#242424]',
    danger: 'bg-[#FFF2F2] text-[#C83238] border border-[#F8D0D2] hover:bg-[#FFE5E6]',
    success: 'bg-[#58CC02] text-white hover:bg-[#4DB502]',
    gold: 'bg-[#FFC857] text-[#242424] hover:bg-[#F5BA42]',
  };
  const sizes = {
    sm: 'text-xs px-3.5 py-2 rounded-xl min-h-[38px]',
    md: 'text-sm px-4 py-2 rounded-xl min-h-[42px]',
    lg: 'text-sm px-5 py-2.5 rounded-xl min-h-[46px]',
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
    purple: 'text-[#7956E8]',
    green: 'text-[#3C8F00]',
    yellow: 'text-[#B86A00]',
    cyan: 'text-[#555566]',
    neutral: 'text-[#888888]',
    red: 'text-[#C83238]',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tones[tone]} ${className}`}>
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
    xl: 'w-18 h-18 text-lg',
  };
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name || initials}
        referrerPolicy="no-referrer"
        className={`${sizes[size]} rounded-full object-cover border border-[#EEEEF2] shrink-0 ${className}`}
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
}> = ({ percent, color = '#7956E8', height = 'h-2', className = '' }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`w-full rounded-full bg-[#EEEEF2] overflow-hidden ${height} ${className}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
  size = 64,
  strokeWidth = 6,
  color = '#58CC02',
  trackColor = '#EEEEF2',
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
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
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
          transition={{ duration: 0.16 }}
        >
          <div
            className="absolute inset-0 bg-[#242424]/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`relative z-10 w-full ${widthClass} rounded-t-2xl sm:rounded-2xl bg-white border border-[#EEEEF2] shadow-xl max-h-[90dvh] flex flex-col overflow-hidden`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EEEEF2] px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#242424] truncate">{title}</h2>
                {subtitle && <p className="text-xs text-[#888888] mt-0.5">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#888888] hover:bg-[#F7F8FA] hover:text-[#242424] transition-colors cursor-pointer shrink-0"
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
      <p className="text-sm text-[#555555] leading-relaxed">{description}</p>
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
  <div className="flex flex-col items-center justify-center text-center py-9 px-6 rounded-2xl border border-[#EEEEF2] bg-white">
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3F0FF] text-[#7956E8]">
      {icon}
    </div>
    <h3 className="text-sm font-bold text-[#242424]">{title}</h3>
    <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#888888]">{description}</p>
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
    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F5C6C8] bg-[#FFF5F5] px-4 py-3 text-xs text-[#A6282E]"
  >
    <div className="flex items-start gap-2.5 min-w-0">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#E5484D]" />
      <div className="min-w-0">
        <p className="font-semibold text-[#8A1F24]">{title}</p>
        <p className="mt-0.5 text-[#A6282E]">{message}</p>
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
  <div className="space-y-4" aria-busy="true" aria-label="Loading view">
    <div className="sd-skeleton h-28 rounded-2xl border border-[#EEEEF2]" />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="sd-skeleton h-60 rounded-2xl border border-[#EEEEF2] lg:col-span-7" />
      <div className="sd-skeleton h-60 rounded-2xl border border-[#EEEEF2] lg:col-span-5" />
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
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3C8F00]">
        App installed
      </span>
    );
  }

  if (!deferredPrompt) {
    return (
      <span className="text-xs text-[#888888]">
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
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium shadow-md ${
            toast.tone === 'error'
              ? 'border-[#F5C6C8] bg-[#FFF5F5] text-[#A6282E]'
              : toast.tone === 'info'
                ? 'border-[#EEEEF2] bg-white text-[#242424]'
                : 'border-[#CDEFA9] bg-[#F5FCEE] text-[#2F7000]'
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss message"
            className="text-current opacity-60 hover:opacity-100 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
