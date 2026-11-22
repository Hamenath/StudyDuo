export interface InviteShareParams {
  code: string;
  goalTitle: string;
  inviterName?: string;
  origin?: string;
  inviteeEmail?: string;
}

export interface SocialSharePlatform {
  id: 'whatsapp' | 'telegram' | 'twitter' | 'facebook' | 'linkedin' | 'reddit' | 'email';
  label: string;
  href: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  ariaLabel: string;
}

export interface InviteShareBundle {
  code: string;
  joinUrl: string;
  subject: string;
  shortText: string;
  fullText: string;
  whatsappUrl: string;
  telegramUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  redditUrl: string;
  emailUrl: string;
  platforms: SocialSharePlatform[];
}

/**
 * Extracts a normalized uppercase invite code (e.g. "DUO-A1B2C3") from:
 * - A raw code ("duo-a1b2c3")
 * - A full invite URL ("https://.../app?invite=DUO-A1B2C3")
 * - A pasted WhatsApp/social message containing "?invite=CODE" or "DUO-XXXXXX"
 */
export function extractInviteCode(rawInput: string): string {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return '';

  // 1. Check if input contains ?invite= or &invite= query parameter
  const queryMatch = trimmed.match(/[?&]invite=([A-Za-z0-9-]{4,24})/i);
  if (queryMatch && queryMatch[1]) {
    return queryMatch[1].toUpperCase();
  }

  // 2. Check if input is a valid URL and parse searchParams
  if (trimmed.includes('://') || trimmed.startsWith('http')) {
    try {
      const parsed = new URL(trimmed);
      const param = parsed.searchParams.get('invite');
      if (param) return param.trim().toUpperCase();
    } catch {
      // fall through to regex token extraction
    }
  }

  // 3. Check if input is a pasted social message containing a DUO-XXXXXX token
  const duoTokenMatch = trimmed.match(/\b(DUO-[A-Za-z0-9]{4,18})\b/i);
  if (duoTokenMatch && duoTokenMatch[1]) {
    return duoTokenMatch[1].toUpperCase();
  }

  // 4. Otherwise return cleaned uppercase code string
  return trimmed.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
}

export function buildInviteJoinUrl(origin: string, code: string): string {
  const cleanOrigin = (origin || 'https://studyduo.app').replace(/\/+$/, '');
  const cleanCode = extractInviteCode(code) || code.trim().toUpperCase();
  return `${cleanOrigin}/?invite=${encodeURIComponent(cleanCode)}`;
}

export function buildInviteShareText(params: {
  code: string;
  goalTitle: string;
  inviterName?: string;
  joinUrl: string;
}): { subject: string; shortText: string; fullText: string } {
  const cleanCode = extractInviteCode(params.code) || params.code.trim().toUpperCase();
  const title = (params.goalTitle || 'our StudyDuo learning goal').trim();
  const sender = params.inviterName?.trim();

  const subject = sender
    ? `${sender} invited you to join "${title}" on StudyDuo!`
    : `Join my StudyDuo goal: "${title}"`;

  const shortText = sender
    ? `Join ${sender} on StudyDuo for "${title}"! Use invite code ${cleanCode} or click to join:`
    : `Join my StudyDuo learning goal "${title}"! Use invite code ${cleanCode} or click to join:`;

  const fullText = `${shortText}\n${params.joinUrl}\n\nInvite Code: ${cleanCode}`;

  return { subject, shortText, fullText };
}

export function buildSocialShareLinks(params: InviteShareParams): InviteShareBundle {
  const cleanCode = extractInviteCode(params.code) || params.code.trim().toUpperCase();
  const origin =
    params.origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://studyduo.app');

  const joinUrl = buildInviteJoinUrl(origin, cleanCode);
  const { subject, shortText, fullText } = buildInviteShareText({
    code: cleanCode,
    goalTitle: params.goalTitle,
    inviterName: params.inviterName,
    joinUrl,
  });

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(joinUrl)}&text=${encodeURIComponent(
    `${shortText} (Code: ${cleanCode})`
  )}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${shortText} `
  )}&url=${encodeURIComponent(joinUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    joinUrl
  )}&quote=${encodeURIComponent(shortText)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(joinUrl)}`;
  const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(
    joinUrl
  )}&title=${encodeURIComponent(subject)}`;
  const recipient = (params.inviteeEmail || '').trim();
  const emailUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    fullText
  )}`;

  const platforms: SocialSharePlatform[] = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      href: whatsappUrl,
      bgColor: '#E7F9EE',
      textColor: '#128C4B',
      borderColor: '#B8ECCB',
      ariaLabel: `Share invite ${cleanCode} on WhatsApp`,
    },
    {
      id: 'telegram',
      label: 'Telegram',
      href: telegramUrl,
      bgColor: '#E8F4FD',
      textColor: '#0077B5',
      borderColor: '#BCE0FA',
      ariaLabel: `Share invite ${cleanCode} on Telegram`,
    },
    {
      id: 'twitter',
      label: 'X / Twitter',
      href: twitterUrl,
      bgColor: '#F3F2F7',
      textColor: '#20202A',
      borderColor: '#E2E0EC',
      ariaLabel: `Share invite ${cleanCode} on X (Twitter)`,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      href: facebookUrl,
      bgColor: '#EBF2FF',
      textColor: '#1864CC',
      borderColor: '#C5DAFF',
      ariaLabel: `Share invite ${cleanCode} on Facebook`,
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      href: linkedinUrl,
      bgColor: '#EAF3FA',
      textColor: '#0A66C2',
      borderColor: '#C3DDF2',
      ariaLabel: `Share invite ${cleanCode} on LinkedIn`,
    },
    {
      id: 'reddit',
      label: 'Reddit',
      href: redditUrl,
      bgColor: '#FFF0E8',
      textColor: '#C9410C',
      borderColor: '#FFD6C2',
      ariaLabel: `Share invite ${cleanCode} on Reddit`,
    },
    {
      id: 'email',
      label: 'Email',
      href: emailUrl,
      bgColor: '#F8F5FF',
      textColor: '#7651E8',
      borderColor: '#E9DFFF',
      ariaLabel: `Share invite ${cleanCode} via Email`,
    },
  ];

  return {
    code: cleanCode,
    joinUrl,
    subject,
    shortText,
    fullText,
    whatsappUrl,
    telegramUrl,
    twitterUrl,
    facebookUrl,
    linkedinUrl,
    redditUrl,
    emailUrl,
    platforms,
  };
}
