import React, { useMemo, useState } from 'react';
import {
  Award,
  Bell,
  CheckCheck,
  CheckCircle2,
  Crown,
  Flame,
  Sparkles,
  UserCheck,
  UserPlus,
  Calendar,
} from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { EmptyState } from '../components/ui/Primitives';
import type { NotificationType } from '../types/studyduo';

function getNotifIcon(type: NotificationType) {
  switch (type) {
    case 'invitation_received':
      return <UserPlus className="h-4 w-4 text-[#7956D8]" />;
    case 'invitation_accepted':
      return <UserCheck className="h-4 w-4 text-[#38A879]" />;
    case 'partner_completed_task':
    case 'partner_completed_checklist':
      return <CheckCircle2 className="h-4 w-4 text-[#38A879]" />;
    case 'daily_winner':
      return <Crown className="h-4 w-4 text-[#C28A1E]" />;
    case 'streak_reminder':
      return <Flame className="h-4 w-4 text-[#E58A2B] fill-[#F3BD59]" />;
    case 'achievement_unlocked':
      return <Award className="h-4 w-4 text-[#7956D8]" />;
    case 'milestone_reached':
      return <Sparkles className="h-4 w-4 text-[#7956D8]" />;
    case 'weekly_summary':
    default:
      return <Calendar className="h-4 w-4 text-[#66687A]" />;
  }
}

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useStudyDuo();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const visible = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications),
    [filter, notifications]
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242337] tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-[#66687A]">
            Partner completions, invitations, daily winners, and milestone alerts.
          </p>
        </div>

        {unreadNotificationCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllNotificationsRead()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E9EAF0] bg-white px-4 text-sm font-semibold text-[#7956D8] hover:bg-[#F0EBFF]/50 transition-colors self-start sm:self-auto"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read ({unreadNotificationCount})
          </button>
        )}
      </header>

      <div className="inline-flex rounded-xl border border-[#E9EAF0] bg-white p-1">
        {(
          [
            { id: 'all', label: `All (${notifications.length})` },
            { id: 'unread', label: `Unread (${unreadNotificationCount})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`min-h-[38px] rounded-lg px-4 text-xs font-semibold transition-colors ${
              filter === tab.id ? 'bg-[#7956D8] text-white' : 'text-[#66687A] hover:text-[#242337]'
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
        <div className="rounded-2xl border border-[#E9EAF0] bg-white divide-y divide-[#E9EAF0] overflow-hidden">
          {visible.map((notif) => (
            <button
              key={notif.id}
              type="button"
              onClick={() => {
                if (!notif.isRead) void markNotificationRead(notif.id);
              }}
              className={`w-full text-left p-4 sm:p-5 flex items-start gap-3.5 transition-colors ${
                notif.isRead ? 'bg-white hover:bg-[#F8F9FC]' : 'bg-[#F0EBFF]/35 hover:bg-[#F0EBFF]/55'
              }`}
            >
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E9EAF0] shrink-0">
                {getNotifIcon(notif.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#242337]">{notif.title}</p>
                  {!notif.isRead && (
                    <span className="text-[11px] font-semibold text-[#7956D8] shrink-0">Unread</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[#66687A] leading-relaxed">{notif.body}</p>
                <p className="mt-1.5 text-xs text-[#88899B]">
                  {new Date(notif.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
