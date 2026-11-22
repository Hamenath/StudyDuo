import React, { useMemo, useState } from 'react';
import { CheckCheck } from 'lucide-react';
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
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#20202A] tracking-tight">
            Notifications
          </h1>
          <p className="mt-0.5 text-sm text-[#777783]">
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
            <CheckCheck className="h-4 w-4 text-[#7651E8]" />
            Mark all read ({unreadNotificationCount})
          </Button>
        )}
      </header>

      <div
        role="tablist"
        aria-label="Notification filter"
        className="inline-flex rounded-full border border-[#F0EDF5] bg-white p-1 shadow-xs"
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
            className={`min-h-[38px] rounded-full px-4 text-xs font-extrabold transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-[#7651E8] text-white'
                : 'text-[#777783] hover:text-[#20202A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          mascot="owl"
          title={filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          description={
            filter === 'unread'
              ? 'You have read all your recent StudyDuo updates.'
              : 'When your partner completes tasks, joins your goal, or you unlock an achievement, alerts will show up here.'
          }
        />
      ) : (
        <div className="rounded-[28px] border border-[#F0EDF5] bg-white divide-y divide-[#F0EDF5] overflow-hidden shadow-[0_8px_24px_-16px_rgba(118,81,232,0.12)]">
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
                    ? 'bg-white hover:bg-[#FAF8FF]'
                    : 'bg-[#F8F5FF] hover:bg-[#EFE9FF]'
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9DFFF] text-base">
                      {getNotifEmoji(notif.type)}
                    </div>
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] ring-2 ring-white shadow-xs"
                  >
                    {getNotifEmoji(notif.type)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-extrabold text-[#20202A]">{notif.title}</p>
                    {!notif.isRead && (
                      <span className="rounded-full bg-[#E9DFFF] px-2.5 py-0.5 text-[10px] font-extrabold text-[#7651E8] shrink-0">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-[#5C5C6C] leading-relaxed">{notif.body}</p>
                  <p className="mt-1 text-xs text-[#777783] tabular-nums">
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
