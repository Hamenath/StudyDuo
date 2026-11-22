import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  Send,
  Share2,
  XCircle,
} from 'lucide-react';
import { buildSocialShareLinks, type SocialSharePlatform } from '../../lib/inviteShare';

interface DuoInviteSharePanelProps {
  code: string;
  goalTitle: string;
  inviterName?: string;
  inviteeEmail?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  compact?: boolean;
  onCancel?: () => void;
  onToast?: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

const WhatsAppBrandIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.82 14.01c-.24.68-1.41 1.3-1.95 1.38-.5.08-1.13.11-1.83-.11-.42-.13-.97-.31-1.67-.61-2.94-1.27-4.86-4.23-5.01-4.43-.15-.2-1.2-1.59-1.2-3.04 0-1.45.76-2.16 1.03-2.46.27-.3.59-.37.79-.37.2 0 .4 0 .57.01.18.01.43-.07.67.51.24.59.83 2.03.9 2.18.07.15.12.32.02.52-.1.2-.15.32-.3.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.61.17.3.76 1.25 1.63 2.02 1.12 1 2.06 1.31 2.36 1.46.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.49.22.57.35.07.12.07.72-.17 1.4z" />
  </svg>
);

const PlatformIcon: React.FC<{ id: SocialSharePlatform['id']; className?: string }> = ({
  id,
  className = 'h-3.5 w-3.5',
}) => {
  switch (id) {
    case 'whatsapp':
      return <WhatsAppBrandIcon className={className} />;
    case 'telegram':
      return <Send className={className} />;
    case 'email':
      return <Mail className={className} />;
    default:
      return <MessageCircle className={className} />;
  }
};

export const DuoInviteSharePanel: React.FC<DuoInviteSharePanelProps> = ({
  code,
  goalTitle,
  inviterName,
  inviteeEmail,
  status = 'pending',
  compact = false,
  onCancel,
  onToast,
}) => {
  const [copiedType, setCopiedType] = useState<'link' | 'code' | 'msg' | null>(null);

  const shareBundle = useMemo(
    () =>
      buildSocialShareLinks({
        code,
        goalTitle,
        inviterName,
        inviteeEmail,
      }),
    [code, goalTitle, inviteeEmail, inviterName]
  );

  const triggerToast = (msg: string, tone: 'success' | 'error' | 'info' = 'success') => {
    if (onToast) onToast(msg, tone);
  };

  const handleCopy = async (text: string, type: 'link' | 'code' | 'msg', label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      triggerToast(label, 'success');
      setTimeout(() => setCopiedType(null), 2200);
    } catch {
      triggerToast(text, 'info');
    }
  };

  const handleNativeOrCopyShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareBundle.subject,
          text: shareBundle.shortText,
          url: shareBundle.joinUrl,
        });
        return;
      } catch {
        // User dismissed or browser blocked; fall back to copying full invite message
      }
    }
    await handleCopy(
      shareBundle.fullText,
      'msg',
      'Copied full invite message & link (ready for Discord, Instagram, or Slack)!'
    );
  };

  return (
    <div
      className={`rounded-2xl border border-[#EAE4F8] bg-[#FBF9FF] ${
        compact ? 'p-3.5 space-y-3' : 'p-4 sm:p-5 space-y-3.5'
      }`}
    >
      {/* Top Row: Code Badge + Status + Copy Code / Revoke */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center rounded-xl bg-[#E9DFFF] px-3 py-1 font-mono text-sm font-black tracking-wider text-[#6842DE]">
            {shareBundle.code}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold capitalize ${
              status === 'accepted'
                ? 'bg-[#E2F5E9] text-[#1F874D]'
                : status === 'pending'
                ? 'bg-[#FFF0C9] text-[#9A6000]'
                : 'bg-[#F4F2F8] text-[#777783]'
            }`}
          >
            {status === 'accepted' ? 'Active Duo Link' : status}
          </span>
          {inviteeEmail && (
            <span className="text-xs text-[#777783] truncate hidden sm:inline">
              · For {inviteeEmail}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              void handleCopy(
                shareBundle.code,
                'code',
                `Copied invite code ${shareBundle.code}`
              )
            }
            className="inline-flex min-h-[34px] items-center gap-1 rounded-full border border-[#E6E0F5] bg-white px-3 text-xs font-bold text-[#20202A] hover:bg-[#E9DFFF]/60 transition-colors cursor-pointer"
          >
            {copiedType === 'code' ? (
              <Check className="h-3.5 w-3.5 text-[#1F874D]" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[#7651E8]" />
            )}
            <span>{copiedType === 'code' ? 'Copied Code' : 'Copy Code'}</span>
          </button>

          {onCancel && status === 'pending' && (
            <button
              type="button"
              onClick={onCancel}
              aria-label={`Cancel invite ${shareBundle.code}`}
              className="inline-flex min-h-[34px] items-center gap-1 rounded-full px-2.5 text-xs font-bold text-[#C82D4F] hover:bg-[#FFF0F3] transition-colors cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Revoke</span>
            </button>
          )}
        </div>
      </div>

      {/* Shareable Direct Join Link Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-[#EAE4F8] bg-white p-2 pl-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link2 className="h-4 w-4 text-[#7651E8] shrink-0" />
          <input
            type="text"
            readOnly
            value={shareBundle.joinUrl}
            aria-label={`Join link for invite code ${shareBundle.code}`}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full bg-transparent text-xs font-mono text-[#20202A] focus:outline-none truncate"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            void handleCopy(
              shareBundle.joinUrl,
              'link',
              'Copied Duo invite join link to clipboard!'
            )
          }
          className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-full bg-[#7651E8] px-4 text-xs font-extrabold text-white hover:bg-[#6641DB] transition-colors cursor-pointer shrink-0"
        >
          {copiedType === 'link' ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>{copiedType === 'link' ? 'Link Copied!' : 'Copy Join Link'}</span>
        </button>
      </div>

      {/* Primary Featured WhatsApp Share CTA */}
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={shareBundle.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share invite ${shareBundle.code} on WhatsApp`}
          className="flex-1 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs sm:text-sm font-extrabold text-white shadow-[0_6px_16px_-6px_rgba(37,211,102,0.55)] hover:bg-[#1EBE5B] transition-colors"
        >
          <WhatsAppBrandIcon className="h-4 w-4 shrink-0" />
          <span>Share Invite Link on WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={() => void handleNativeOrCopyShare()}
          className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-full border border-[#E4DCF7] bg-white px-4 py-2 text-xs font-extrabold text-[#20202A] hover:bg-[#E9DFFF]/50 transition-colors cursor-pointer shrink-0"
        >
          {copiedType === 'msg' ? (
            <Check className="h-3.5 w-3.5 text-[#1F874D]" />
          ) : (
            <Share2 className="h-3.5 w-3.5 text-[#7651E8]" />
          )}
          <span>{copiedType === 'msg' ? 'Message Copied!' : 'More Apps'}</span>
        </button>
      </div>

      {/* All Social Platforms Pill Row */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-[#777783]">
          Share across all social apps so your partner can click &amp; join:
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {shareBundle.platforms.map((platform) => (
            <a
              key={platform.id}
              href={platform.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={platform.ariaLabel}
              style={{
                backgroundColor: platform.bgColor,
                color: platform.textColor,
                borderColor: platform.borderColor,
              }}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold transition-transform hover:-translate-y-0.5"
            >
              <PlatformIcon id={platform.id} className="h-3.5 w-3.5 shrink-0" />
              <span>{platform.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
