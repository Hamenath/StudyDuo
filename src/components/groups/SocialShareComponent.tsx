import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  MessageSquareShare,
  RefreshCw,
  Share2,
  UserPlus,
} from 'lucide-react';
import {
  buildDuoInviteLink,
  buildDuoShareMessage,
} from '../../lib/socialShare';
import type { Goal, Invitation } from '../../types/studyduo';
import { Button } from '../ui/Primitives';

export interface SocialShareComponentProps {
  goal: Goal;
  inviterName?: string;
  invitations: Invitation[];
  isOwner: boolean;
  onCreateInvitation?: (goalId: string, inviteeEmail?: string) => Promise<Invitation | null>;
  onCancelInvitation?: (invitationId: string) => Promise<void>;
  onToast?: (message: string, tone?: 'success' | 'error' | 'info') => void;
  compact?: boolean;
}

export const SocialShareComponent: React.FC<SocialShareComponentProps> = ({
  goal,
  inviterName,
  invitations,
  isOwner,
  onCreateInvitation,
  onCancelInvitation,
  onToast,
  compact = false,
}) => {
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [copiedMode, setCopiedMode] = useState<'link' | 'code' | 'message' | null>(null);

  const goalInvitations = useMemo(
    () => invitations.filter((inv) => inv.goalId === goal.id && inv.status !== 'cancelled'),
    [goal.id, invitations]
  );

  const pendingInvitations = useMemo(
    () => goalInvitations.filter((inv) => inv.status === 'pending'),
    [goalInvitations]
  );

  // Determine the active invite code to build the dynamic share link
  const activeInviteCode = useMemo(() => {
    if (selectedCode && goalInvitations.some((i) => i.code === selectedCode)) {
      return selectedCode;
    }
    if (pendingInvitations.length > 0) {
      return pendingInvitations[0].code;
    }
    if (goal.lastAcceptedInviteCode) {
      return goal.lastAcceptedInviteCode;
    }
    if (goalInvitations.length > 0) {
      return goalInvitations[0].code;
    }
    return `DUO-${goal.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'STUDY1'}`;
  }, [goal.id, goal.lastAcceptedInviteCode, goalInvitations, pendingInvitations, selectedCode]);

  const dynamicInviteLink = useMemo(
    () => buildDuoInviteLink(activeInviteCode),
    [activeInviteCode]
  );

  const shareMessage = useMemo(
    () =>
      buildDuoShareMessage({
        inviteCode: activeInviteCode,
        goalTitle: goal.title,
        inviterName,
        groupName: goal.groupName,
      }),
    [activeInviteCode, goal.groupName, goal.title, inviterName]
  );

  const triggerCopiedFeedback = (mode: 'link' | 'code' | 'message', toastMsg: string) => {
    setCopiedMode(mode);
    onToast?.(toastMsg, 'success');
    setTimeout(() => {
      setCopiedMode((prev) => (prev === mode ? null : prev));
    }, 2400);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(dynamicInviteLink);
      triggerCopiedFeedback('link', 'Copied duo invite link to clipboard!');
    } catch {
      triggerCopiedFeedback('link', `Invite link: ${dynamicInviteLink}`);
    }
  };

  const handleCopyCode = async (codeToCopy = activeInviteCode) => {
    try {
      await navigator.clipboard.writeText(codeToCopy);
      triggerCopiedFeedback('code', `Copied invite code ${codeToCopy}!`);
    } catch {
      triggerCopiedFeedback('code', `Invite code: ${codeToCopy}`);
    }
  };

  const handleCopyFullMessage = async () => {
    const fullPayload = `${shareMessage}\n${dynamicInviteLink}`;
    try {
      await navigator.clipboard.writeText(fullPayload);
      triggerCopiedFeedback('message', 'Copied full invite message and link!');
    } catch {
      triggerCopiedFeedback('message', 'Invite message ready to paste.');
    }
  };

  const handleGenerateNewInvite = async () => {
    if (!onCreateInvitation) return;
    setCreatingInvite(true);
    try {
      const created = await onCreateInvitation(goal.id);
      if (created) {
        setSelectedCode(created.code);
      }
    } finally {
      setCreatingInvite(false);
    }
  };

  return (
    <section
      aria-label="Share Study Duo Invitation"
      className={`rounded-[28px] bg-white border border-[#F0EDF5] shadow-[0_8px_24px_-12px_rgba(32,32,42,0.08)] ${
        compact ? 'p-4 sm:p-5 space-y-4' : 'p-5 sm:p-6 space-y-5'
      }`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E9DFFF] text-[#7651E8]">
            <Share2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-base sm:text-lg font-black text-[#20202A]">
              Share &amp; Invite Study Partner
            </h2>
            <p className="text-xs sm:text-sm text-[#777783]">
              Copy your dynamic duo invite link or code so your study partner can join in one click.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopyCode(activeInviteCode)}
            aria-label={`Copy invite code ${activeInviteCode}`}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-[#F8F5FF] border border-[#E9DFFF] px-3.5 py-1.5 text-xs font-extrabold text-[#7651E8] hover:bg-[#E9DFFF] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span className="text-[#777783] font-semibold">Code:</span>
            <span className="font-mono tracking-wider">{activeInviteCode}</span>
            {copiedMode === 'code' ? (
              <Check className="h-3.5 w-3.5 text-[#1F874D]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Invite Link + Clipboard Copy Bar */}
      <div className="rounded-2xl bg-[#F8F5FF] border border-[#E9DFFF] p-3 sm:p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#20202A]">
            <Link2 className="h-3.5 w-3.5 text-[#7651E8]" />
            Dynamic Duo Invite Link
          </span>
          <button
            type="button"
            onClick={() => void handleCopyFullMessage()}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#7651E8] hover:underline cursor-pointer whitespace-nowrap shrink-0"
          >
            <MessageSquareShare className="h-3.5 w-3.5" />
            {copiedMode === 'message' ? 'Copied Message + Link!' : 'Copy Invite Message'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center rounded-xl bg-white border border-[#F0EDF5] px-3.5 min-h-[44px]">
            <input
              type="text"
              readOnly
              aria-label="Dynamic duo invite URL"
              value={dynamicInviteLink}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full bg-transparent text-xs sm:text-sm font-mono font-semibold text-[#20202A] focus:outline-none truncate"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              aria-label="Copy duo invite link"
              className={`flex-1 sm:flex-initial inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                copiedMode === 'link'
                  ? 'bg-[#1F874D] text-white'
                  : 'bg-[#7651E8] text-white hover:bg-[#6540D6]'
              }`}
            >
              {copiedMode === 'link' ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generate Fresh Invite Code / Manage Pending Codes (Owner) */}
      {isOwner && onCreateInvitation && (
        <div className="pt-3 border-t border-[#F0EDF5] space-y-3">
          <div className="flex items-center justify-between gap-2.5 flex-wrap">
            <p className="text-xs font-bold text-[#777783]">
              Active Pending Invite Codes ({pendingInvitations.length})
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={creatingInvite}
              onClick={() => void handleGenerateNewInvite()}
              className="shrink-0 min-h-[38px]"
            >
              {creatingInvite ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#7651E8]" />
                  Generating...
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5 text-[#7651E8]" />
                  Generate New Invite Link
                </>
              )}
            </Button>
          </div>

          {pendingInvitations.length > 0 && (
            <div className="divide-y divide-[#F0EDF5] rounded-2xl bg-[#F8F5FF]/70 px-3.5 py-1">
              {pendingInvitations.map((inv) => {
                const isCurrent = inv.code === activeInviteCode;
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCode(inv.code)}
                      className="min-w-0 text-left flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-bold font-mono text-[#7651E8] tracking-wide">
                        {inv.code}
                      </span>
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-[#1F874D]">
                          · Active Link
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleCopyCode(inv.code)}
                        className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-white px-3 text-xs font-bold text-[#20202A] border border-[#F0EDF5] hover:bg-[#E9DFFF] cursor-pointer whitespace-nowrap"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                      {onCancelInvitation && (
                        <button
                          type="button"
                          onClick={() => void onCancelInvitation(inv.id)}
                          className="min-h-[32px] rounded-full px-2.5 text-xs font-bold text-[#C82D4F] hover:bg-[#FFF0F3] cursor-pointer whitespace-nowrap"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
