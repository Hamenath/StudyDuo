export type SocialPlatformId =
  | 'whatsapp'
  | 'x'
  | 'telegram'
  | 'linkedin'
  | 'reddit'
  | 'facebook'
  | 'email';

export interface SocialShareTarget {
  id: SocialPlatformId;
  label: string;
  shortLabel: string;
  href: string;
  bgColor: string;
  hoverBgColor: string;
  textColor: string;
  borderColor: string;
  ariaLabel: string;
}

export interface DuoShareParams {
  inviteCode: string;
  goalTitle: string;
  inviterName?: string;
  groupName?: string;
  origin?: string;
}

export function normalizeInviteCode(code: string): string {
  return (code || '').trim().toUpperCase();
}

export function resolveShareOrigin(explicitOrigin?: string): string {
  if (explicitOrigin && explicitOrigin.trim()) {
    return explicitOrigin.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'https://studyduo.app';
}

export function buildDuoInviteLink(inviteCode: string, explicitOrigin?: string): string {
  const code = normalizeInviteCode(inviteCode) || 'DUO-INVITE';
  const origin = resolveShareOrigin(explicitOrigin);
  return `${origin}/?invite=${encodeURIComponent(code)}`;
}

export function buildDuoShareMessage(params: DuoShareParams): string {
  const code = normalizeInviteCode(params.inviteCode) || 'DUO-INVITE';
  const goalTitle = (params.goalTitle || 'our shared study goal').trim();
  const inviter = params.inviterName?.trim();
  const groupTag =
    params.groupName && params.groupName.trim() && params.groupName.trim() !== goalTitle
      ? ` (${params.groupName.trim()})`
      : '';

  if (inviter) {
    return `${inviter} invited you to join "${goalTitle}"${groupTag} on StudyDuo! Use invite code ${code} or open the link below to join our study duo and level up together:`;
  }
  return `Join my "${goalTitle}"${groupTag} study duo on StudyDuo! Use invite code ${code} or open the link below to track daily quests and streaks together:`;
}

export function buildSocialShareTargets(params: DuoShareParams): SocialShareTarget[] {
  const code = normalizeInviteCode(params.inviteCode) || 'DUO-INVITE';
  const inviteUrl = buildDuoInviteLink(code, params.origin);
  const message = buildDuoShareMessage({ ...params, inviteCode: code });
  const combinedTextAndUrl = `${message}\n${inviteUrl}`;
  const goalTitle = (params.goalTitle || 'StudyDuo Learning Goal').trim();

  return [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      shortLabel: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(combinedTextAndUrl)}`,
      bgColor: 'bg-[#E2F5E9]',
      hoverBgColor: 'hover:bg-[#CEEFDA]',
      textColor: 'text-[#136F3A]',
      borderColor: 'border-[#BFE8CE]',
      ariaLabel: 'Share study duo invite on WhatsApp',
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      shortLabel: 'X / Twitter',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(inviteUrl)}`,
      bgColor: 'bg-[#F2F1F7]',
      hoverBgColor: 'hover:bg-[#E5E3F0]',
      textColor: 'text-[#20202A]',
      borderColor: 'border-[#E0DDEA]',
      ariaLabel: 'Share study duo invite on X (Twitter)',
    },
    {
      id: 'telegram',
      label: 'Telegram',
      shortLabel: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(message)}`,
      bgColor: 'bg-[#E6F3FF]',
      hoverBgColor: 'hover:bg-[#D4EAFF]',
      textColor: 'text-[#0066A6]',
      borderColor: 'border-[#C2E2FF]',
      ariaLabel: 'Share study duo invite on Telegram',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      shortLabel: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}`,
      bgColor: 'bg-[#EBF2FF]',
      hoverBgColor: 'hover:bg-[#DAE7FF]',
      textColor: 'text-[#1D4ED8]',
      borderColor: 'border-[#C9DCFF]',
      ariaLabel: 'Share study duo invite on LinkedIn',
    },
    {
      id: 'reddit',
      label: 'Reddit',
      shortLabel: 'Reddit',
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(inviteUrl)}&title=${encodeURIComponent(message)}`,
      bgColor: 'bg-[#FFF0E6]',
      hoverBgColor: 'hover:bg-[#FFE3D1]',
      textColor: 'text-[#B84300]',
      borderColor: 'border-[#FFD4B8]',
      ariaLabel: 'Share study duo invite on Reddit',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      shortLabel: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}&quote=${encodeURIComponent(message)}`,
      bgColor: 'bg-[#EEF0FF]',
      hoverBgColor: 'hover:bg-[#DFE3FF]',
      textColor: 'text-[#3730A3]',
      borderColor: 'border-[#C7CEFF]',
      ariaLabel: 'Share study duo invite on Facebook',
    },
    {
      id: 'email',
      label: 'Email',
      shortLabel: 'Email',
      href: `mailto:?subject=${encodeURIComponent(`Join my StudyDuo goal: ${goalTitle}`)}&body=${encodeURIComponent(`${message}\n\nJoin link: ${inviteUrl}\nInvite code: ${code}`)}`,
      bgColor: 'bg-[#FFF0C9]',
      hoverBgColor: 'hover:bg-[#FFE6A8]',
      textColor: 'text-[#8A5A00]',
      borderColor: 'border-[#F7DC97]',
      ariaLabel: 'Share study duo invite via Email',
    },
  ];
}

/**
 * Extracts a StudyDuo invite code from either a raw code ("DUO-A1B2C3"),
 * a full invite URL ("https://.../app?invite=DUO-A1B2C3"), or a pasted social share message.
 */
export function extractInviteCodeFromInput(rawInput: string): string {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return '';

  // 1. Check if input contains ?invite=CODE or &invite=CODE
  const queryMatch = trimmed.match(/[?&]invite=([A-Za-z0-9_-]{4,24})/i);
  if (queryMatch?.[1]) {
    return queryMatch[1].toUpperCase();
  }

  // 2. Check if input contains a DUO-XXXXXX token anywhere in a pasted message
  const tokenMatch = trimmed.match(/\b(DUO-[A-Za-z0-9]{4,12})\b/i);
  if (tokenMatch?.[1]) {
    return tokenMatch[1].toUpperCase();
  }

  return trimmed.toUpperCase();
}
