import React, { useMemo, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { Avatar, Button, EmptyState } from '../components/ui/Primitives';
import type { NotificationType } from '../types/studyduo';

const getNotifEmoji = (type: NotificationType): string => {
  switch (type) {
    case 'invitation_received':
    case 'invitation_accepted':
      return '🤝';
    case 'partner_completed_task':
    case 'partner_completed_checklist':
      return '✅';
    case 'daily_winner':
      return '👑';
    case 'streak_reminder':
      return '🔥';
    case 'achievement_unlocked':
      return '🏅';
    case 'milestone_reached':
      return '🎯';
    case 'weekly_summary':
    default:
      return '📊';
  }
};

const isPartnerNotification = (type: NotificationType): boolean =>
  type === 'partner_completed_task' ||
  type === 'partner_completed_checklist' ||
  type === 'invitation_received' ||
  type === 'invitation_accepted';

export const NotificationsPage: React.FC = () => {
  const {
    currentUser,
    participants,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useStudyDuo();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const partner = useMemo(
    () => participants.find((p) => p.uid !== currentUser?.uid) ?? null,
    [currentUser?.uid, participants]
  );

  const visible = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications),
    [filter, notifications]
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#242424] tracking-tight">Notifications</h1>
          <p className="mt-0.5 text-sm text-[#888888]">
            Partner completions, invitations, daily winners, and milestone alerts.
          </p>
        </div>

        {unreadNotificationCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void markAllNotificationsRead()}
            className="self-start sm:self-auto"
          >
            <CheckCheck className="h-4 w-4 text-[#7956E8]" />
            Mark all read ({unreadNotificationCount})
          </Button>
        )}
      </header>

      <div
        role="tablist"
        aria-label="Notification filter"
        className="inline-flex rounded-xl border border-[#EEEEF2] bg-white p-1"
      >
        {(
          [
            { id: 'all', label: `All (${notifications.length})` },
            { id: 'unread', label: `Unread (${unreadNotificationCount})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            onClick={() => setFilter(tab.id)}
            className={`min-h-[36px] rounded-lg px-3.5 text-xs font-bold transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-[#7956E8] text-white'
                : 'text-[#888888] hover:text-[#242424]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title={filter === 'unread' ? 'All caught up' : 'No notifications yet'}
          description={
            filter === 'unread'
              ? 'You have read all your recent StudyDuo updates.'
              : 'When your partner completes tasks, joins your goal, or you unlock an achievement, alerts will show up here.'
          }
        />
      ) : (
        <div className="rounded-2xl border border-[#EEEEF2] bg-white divide-y divide-[#EEEEF2] overflow-hidden">
          {visible.map((notif) => {
            const mentionsPartner = Boolean(
              partner &&
                (notif.title.toLowerCase().includes(partner.displayName.split(' ')[0].toLowerCase()) ||
                  notif.body.toLowerCase().includes(partner.displayName.toLowerCase()))
            );
            const partnerAlert = isPartnerNotification(notif.type) || mentionsPartner;
            const avatarSubject = partnerAlert && partner
              ? {
                  name: partner.displayName,
                  initials: partner.avatarInitials,
                  color: partner.avatarColor,
                  avatarConfig: partner.avatarConfig,
                  seedKey: partner.uid,
                }
              : currentUser
              ? {
                  name: currentUser.fullName,
                  initials: currentUser.avatarInitials,
                  color: currentUser.avatarColor,
                  avatarConfig: currentUser.avatarConfig,
                  seedKey: currentUser.uid,
                }
              : null;

            return (
              <button
                key={notif.id}
                type="button"
                onClick={() => {
                  if (!notif.isRead) void markNotificationRead(notif.id);
                }}
                className={`w-full text-left p-4 sm:p-5 flex items-start gap-3.5 transition-colors cursor-pointer ${
                  notif.isRead
                    ? 'bg-white hover:bg-[#FAFAFC]'
                    : 'bg-[#FAF8FF] hover:bg-[#F3EFFF]'
                }`}
              >
                <div className="relative shrink-0 mt-0.5">
                  {avatarSubject ? (
                    <Avatar
                      name={avatarSubject.name}
                      initials={avatarSubject.initials}
                      color={avatarSubject.color}
                      avatarConfig={avatarSubject.avatarConfig}
                      seedKey={avatarSubject.seedKey}
                      size="sm"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F8FA] text-base">
                      {getNotifEmoji(notif.type)}
                    </div>
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] ring-1 ring-[#EEEEF2]"
                  >
                    {getNotifEmoji(notif.type)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-[#242424]">{notif.title}</p>
                    {!notif.isRead && (
                      <span className="text-[11px] font-bold text-[#7956E8] shrink-0">New</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-[#5C5C6E] leading-relaxed">{notif.body}</p>
                  <p className="mt-1 text-xs text-[#888888] tabular-nums">
                    {new Date(notif.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
