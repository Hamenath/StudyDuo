import React, { useEffect, useState } from 'react';
import { Bell, LogOut, Shield, Smartphone, Trash2, User } from 'lucide-react';
import { useStudyDuo } from '../context/StudyDuoContext';
import { Button, Card, ConfirmDialog, PWAInstallButton } from '../components/ui/Primitives';

const AVATAR_COLORS = ['#7651E8', '#2FB368', '#E59A18', '#E05288', '#6B8AFD', '#38A89D'];
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
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#7651E8');
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
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-[#20202A] tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#777783]">
          Manage your profile, notifications, privacy controls, and StudyDuo account.
        </p>
      </header>

      {/* Profile Settings */}
      <Card>
        <div className="flex items-center gap-2.5 mb-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E9DFFF] text-[#7651E8]">
            <User className="h-4 w-4" />
          </span>
          <h2 className="font-display text-base font-black text-[#20202A]">Profile Details</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-name" className="block text-xs font-bold text-[#20202A] mb-1.5">
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
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="settings-username" className="block text-xs font-bold text-[#20202A] mb-1.5">
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
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm font-mono text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-bio" className="block text-xs font-bold text-[#20202A] mb-1.5">
              Short Bio
            </label>
            <textarea
              id="settings-bio"
              rows={2}
              maxLength={280}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you focusing on learning this season?"
              className="w-full rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-category" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Preferred Learning Category
              </label>
              <select
                id="settings-category"
                value={preferredCategory}
                onChange={(e) => setPreferredCategory(e.target.value)}
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="settings-tz" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Timezone (IANA)
              </label>
              <input
                id="settings-tz"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm font-mono text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-[#20202A] mb-2">Avatar Accent Color</span>
            <div className="flex flex-wrap gap-2.5">
              {AVATAR_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Select color ${hex}`}
                  onClick={() => setAvatarColor(hex)}
                  style={{ backgroundColor: hex }}
                  className={`h-10 w-10 rounded-full transition-transform cursor-pointer ${
                    avatarColor === hex ? 'ring-2 ring-offset-2 ring-[#7651E8] scale-105' : 'opacity-85 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF0C9] text-[#B47100]">
            <Bell className="h-4 w-4" />
          </span>
          <h2 className="font-display text-base font-black text-[#20202A]">Notification Preferences</h2>
        </div>

        <div className="divide-y divide-[#F0EDF5]">
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
                  <p className="text-sm font-bold text-[#20202A]">{item.label}</p>
                  <p className="text-xs text-[#777783]">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => void toggleSetting(item.key, e.target.checked)}
                  className="h-5 w-5 accent-[#7651E8] shrink-0 cursor-pointer"
                />
              </label>
            );
          })}
        </div>
      </Card>

      {/* Privacy & Connected Account */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E2F5E9] text-[#1F874D]">
            <Shield className="h-4 w-4" />
          </span>
          <h2 className="font-display text-base font-black text-[#20202A]">Privacy & AI Context</h2>
        </div>

        <div className="divide-y divide-[#F0EDF5]">
          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-bold text-[#20202A]">Share daily progress with study partner</p>
              <p className="text-xs text-[#777783]">
                Allows your partner to see your task completion status, daily XP, and streaks on shared goals.
              </p>
            </div>
            <input
              type="checkbox"
              checked={privateSettings.shareProgressWithPartner}
              onChange={(e) => void toggleSetting('shareProgressWithPartner', e.target.checked)}
              className="h-5 w-5 accent-[#7651E8] shrink-0 cursor-pointer"
            />
          </label>

          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-bold text-[#20202A]">Allow AI Study Coach to reference my journal</p>
              <p className="text-xs text-[#777783]">
                Off by default. When enabled, recent personal journal summaries help personalize AI coaching.
              </p>
            </div>
            <input
              type="checkbox"
              checked={privateSettings.allowAiJournalContext}
              onChange={(e) => void toggleSetting('allowAiJournalContext', e.target.checked)}
              className="h-5 w-5 accent-[#7651E8] shrink-0 cursor-pointer"
            />
          </label>
        </div>

        <div className="rounded-2xl bg-[#F8F5FF] border border-[#F0EDF5] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#777783]">Connected Account</p>
            <p className="mt-1 text-sm font-bold text-[#20202A] font-mono">{privateSettings.email}</p>
            <p className="text-xs text-[#777783]">
              {mode === 'preview' ? 'Interactive Preview Session' : 'Authenticated with Firebase Auth'}
            </p>
          </div>
          <PWAInstallButton compact />
        </div>
      </Card>

      {/* Install & Session Controls */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFE8F0] text-[#BE3469]">
            <Smartphone className="h-4 w-4" />
          </span>
          <h2 className="font-display text-base font-black text-[#20202A]">Account Actions</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="secondary" onClick={() => void logout()}>
            <LogOut className="h-4 w-4 text-[#777783]" />
            {mode === 'preview' ? 'Exit Preview Mode' : 'Sign Out'}
          </Button>

          <Button variant="danger" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete Account
          </Button>
        </div>
      </Card>

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
