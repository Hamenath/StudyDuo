import React, { useEffect, useState } from 'react';
import { Bell, LogOut, Shield, Smartphone, Trash2, User } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { ConfirmDialog, PWAInstallButton } from '../components/ui/Primitives';

const AVATAR_COLORS = ['#7956D8', '#38A879', '#E09F24', '#4B7BE5', '#D96B8A', '#2E8B99'];
const CATEGORIES = ['Programming', 'Data Science', 'Languages', 'Exam Prep', 'Design', 'Cloud & DevOps', 'Other'];

export const SettingsPage: React.FC = () => {
  const {
    mode,
    currentUser,
    privateSettings,
    updateProfile,
    updatePrivateSettings,
    logout,
    deleteAccount,
  } = useStudyDuo();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [preferredCategory, setPreferredCategory] = useState(currentUser?.preferredCategory || 'Programming');
  const [timezone, setTimezone] = useState(currentUser?.timezone || 'UTC');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#7956D8');
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setFullName(currentUser.fullName);
    setUsername(currentUser.username);
    setBio(currentUser.bio);
    setPreferredCategory(currentUser.preferredCategory);
    setTimezone(currentUser.timezone);
    setAvatarColor(currentUser.avatarColor);
  }, [currentUser]);

  if (!currentUser || !privateSettings) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) return;
    setSavingProfile(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        username: username.trim().replace(/[^a-zA-Z0-9_]/g, ''),
        bio: bio.trim(),
        preferredCategory,
        timezone: timezone.trim() || 'UTC',
        avatarColor,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleSetting = async (key: keyof typeof privateSettings, value: boolean) => {
    await updatePrivateSettings({ [key]: value });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#242337] tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[#66687A]">
          Manage your profile, notifications, privacy controls, and StudyDuo account.
        </p>
      </header>

      {/* Profile Settings */}
      <section className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <User className="h-5 w-5 text-[#7956D8]" />
          <h2 className="text-base font-semibold text-[#242337]">Profile Details</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-name" className="block text-sm font-medium text-[#242337] mb-1">
                Full Name
              </label>
              <input
                id="settings-name"
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="settings-username" className="block text-sm font-medium text-[#242337] mb-1">
                Username
              </label>
              <input
                id="settings-username"
                type="text"
                required
                minLength={2}
                maxLength={32}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm font-mono text-[#242337] focus:border-[#7956D8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-bio" className="block text-sm font-medium text-[#242337] mb-1">
              Short Bio
            </label>
            <textarea
              id="settings-bio"
              rows={2}
              maxLength={280}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you focusing on learning this season?"
              className="w-full rounded-xl border border-[#E9EAF0] p-3 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-category" className="block text-sm font-medium text-[#242337] mb-1">
                Preferred Learning Category
              </label>
              <select
                id="settings-category"
                value={preferredCategory}
                onChange={(e) => setPreferredCategory(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-3.5 text-sm text-[#242337] focus:border-[#7956D8] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="settings-tz" className="block text-sm font-medium text-[#242337] mb-1">
                Timezone (IANA)
              </label>
              <input
                id="settings-tz"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] px-3.5 text-sm font-mono text-[#242337] focus:border-[#7956D8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-[#242337] mb-2">Avatar Accent Color</span>
            <div className="flex flex-wrap gap-2.5">
              {AVATAR_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Select color ${hex}`}
                  onClick={() => setAvatarColor(hex)}
                  style={{ backgroundColor: hex }}
                  className={`h-10 w-10 rounded-full transition-transform ${
                    avatarColor === hex ? 'ring-2 ring-offset-2 ring-[#242337] scale-105' : 'opacity-85 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="min-h-[44px] rounded-xl bg-[#7956D8] px-6 text-sm font-semibold text-white hover:bg-[#6643C7] disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </section>

      {/* Notification Preferences */}
      <section className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <Bell className="h-5 w-5 text-[#7956D8]" />
          <h2 className="text-base font-semibold text-[#242337]">Notification Preferences</h2>
        </div>

        <div className="divide-y divide-[#E9EAF0]">
          {(
            [
              { key: 'notifyInvites', label: 'Partner Invitations', desc: 'Alert when you receive or accept an invitation.' },
              { key: 'notifyPartnerActivity', label: 'Partner Study Activity', desc: 'Know when your partner completes tasks or checklists.' },
              { key: 'notifyDailyWinner', label: 'Daily Winner Summary', desc: 'End-of-day friendly leaderboard wrap-up.' },
              { key: 'notifyAchievements', label: 'Achievement Unlocks', desc: 'Celebrate streaks and completed milestones.' },
              { key: 'notifyWeeklySummary', label: 'Weekly Summary', desc: 'Recap of combined duo tasks and XP earned.' },
            ] as const
          ).map((item) => {
            const checked = Boolean(privateSettings[item.key]);
            return (
              <label
                key={item.key}
                className="py-3.5 flex items-center justify-between gap-4 cursor-pointer"
              >
                <div>
                  <p className="text-sm font-medium text-[#242337]">{item.label}</p>
                  <p className="text-xs text-[#66687A]">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => void toggleSetting(item.key, e.target.checked)}
                  className="h-5 w-5 accent-[#7956D8] shrink-0"
                />
              </label>
            );
          })}
        </div>
      </section>

      {/* Privacy & Connected Account */}
      <section className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-[#7956D8]" />
          <h2 className="text-base font-semibold text-[#242337]">Privacy & AI Context</h2>
        </div>

        <div className="divide-y divide-[#E9EAF0]">
          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[#242337]">Share daily progress with study partner</p>
              <p className="text-xs text-[#66687A]">
                Allows your partner to see your task completion status, daily XP, and streaks on shared goals.
              </p>
            </div>
            <input
              type="checkbox"
              checked={privateSettings.shareProgressWithPartner}
              onChange={(e) => void toggleSetting('shareProgressWithPartner', e.target.checked)}
              className="h-5 w-5 accent-[#7956D8] shrink-0"
            />
          </label>

          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[#242337]">Allow AI Study Coach to reference my journal</p>
              <p className="text-xs text-[#66687A]">
                Off by default. When enabled, recent personal journal summaries help personalize AI coaching.
              </p>
            </div>
            <input
              type="checkbox"
              checked={privateSettings.allowAiJournalContext}
              onChange={(e) => void toggleSetting('allowAiJournalContext', e.target.checked)}
              className="h-5 w-5 accent-[#7956D8] shrink-0"
            />
          </label>
        </div>

        <div className="rounded-xl bg-[#F8F9FC] border border-[#E9EAF0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#66687A]">Connected Account</p>
            <p className="mt-1 text-sm font-medium text-[#242337] font-mono">{privateSettings.email}</p>
            <p className="text-xs text-[#66687A]">
              {mode === 'preview' ? 'Interactive Preview Session' : 'Authenticated with Firebase Auth'}
            </p>
          </div>
          <PWAInstallButton compact />
        </div>
      </section>

      {/* Install & Session Controls */}
      <section className="rounded-2xl border border-[#E9EAF0] bg-white p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Smartphone className="h-5 w-5 text-[#7956D8]" />
          <h2 className="text-base font-semibold text-[#242337]">Account Actions</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#E9EAF0] bg-white px-5 text-sm font-semibold text-[#242337] hover:bg-[#F8F9FC] transition-colors"
          >
            <LogOut className="h-4 w-4 text-[#66687A]" />
            {mode === 'preview' ? 'Exit Preview Mode' : 'Sign Out'}
          </button>

          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#E66F77]/40 bg-[#FFF0F1] px-5 text-sm font-semibold text-[#C94450] hover:bg-[#FFE3E5] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete StudyDuo Account"
        description="This permanently removes your StudyDuo account and profile settings. This action cannot be undone."
        confirmLabel="Delete Permanently"
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={async () => {
          setDeleteDialogOpen(false);
          await deleteAccount();
        }}
      />
    </div>
  );
};
