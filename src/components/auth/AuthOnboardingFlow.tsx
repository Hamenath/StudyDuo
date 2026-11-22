import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { sendEmailVerification } from 'firebase/auth';
import { useStudyDuo } from '../../context/StudyDuoContext';
import { onboardingSchema, inviteCodeSchema } from '../../lib/validation';
import { StudyDuoBrandMark } from '../layout/AppShell';
import { ToastStack } from '../ui/Primitives';

const AVATAR_COLORS = ['#7956E8', '#38B982', '#45C4D8', '#FFC857', '#A78BFA', '#2E9CA6'];
const CATEGORIES = [
  'Programming',
  'Data Science & AI',
  'UI/UX Design',
  'Languages',
  'Exam Prep',
  'Business & Finance',
  'Cloud & DevOps',
  'Mathematics',
];

export const AuthScreen: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    enterPreviewMode,
    pendingInviteCodeFromUrl,
    toasts,
    dismissToast,
  } = useStudyDuo();

  const [tab, setTab] = useState<'login' | 'register' | 'reset'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }
    setSubmitting(true);
    try {
      if (tab === 'reset') {
        await sendPasswordReset(email);
        setTab('login');
      } else if (tab === 'register') {
        if (fullName.trim().length < 2) {
          setFormError('Please enter your full name.');
          setSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setFormError('Password must be at least 6 characters.');
          setSubmitting(false);
          return;
        }
        await registerWithEmail(email, password, fullName);
      } else {
        if (!password) {
          setFormError('Please enter your password.');
          setSubmitting(false);
          return;
        }
        await signInWithEmail(email, password);
      }
    } catch {
      // Friendly error toast already shown by context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7FF] flex flex-col justify-center px-5 py-10">
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Brand Story Column */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center gap-3">
            <StudyDuoBrandMark size={40} />
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-[#25243A] block leading-none">
                StudyDuo
              </span>
              <span className="text-xs font-semibold text-[#7956E8]">Level Up Together.</span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#25243A] leading-tight [text-wrap:balance]">
              StudyDuo — Level Up Together.
            </h1>
            <p className="text-base text-[#77768C] leading-relaxed max-w-lg">
              Build a structured learning roadmap, conquer daily quests independently with your study partner, earn XP, unlock avatar cosmetics, and keep your duo streak alive.
            </p>
          </div>

          {pendingInviteCodeFromUrl && (
            <div className="rounded-2xl bg-[#F1EDFF] border border-[#7956E8]/25 p-4">
              <p className="text-sm font-bold text-[#25243A]">
                You were invited to join a study duo!
              </p>
              <p className="mt-1 text-sm text-[#77768C]">
                Sign in to accept invitation code{' '}
                <span className="font-mono font-bold text-[#7956E8]">{pendingInviteCodeFromUrl}</span>.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="sd-card p-4">
              <Target className="h-5 w-5 text-[#7956E8] mb-2" />
              <p className="text-sm font-bold text-[#25243A]">Shared Roadmaps</p>
              <p className="mt-1 text-xs text-[#77768C] leading-relaxed">
                Owner publishes milestones & daily quests; partners complete them independently.
              </p>
            </div>
            <div className="sd-card p-4">
              <Users className="h-5 w-5 text-[#38B982] mb-2" />
              <p className="text-sm font-bold text-[#25243A]">Duo Progression</p>
              <p className="mt-1 text-xs text-[#77768C] leading-relaxed">
                Daily XP, podium leaderboards, collectible badges, and customizable avatars.
              </p>
            </div>
            <div className="sd-card p-4">
              <Sparkles className="h-5 w-5 text-[#45C4D8] mb-2" />
              <p className="text-sm font-bold text-[#25243A]">AI Study Coach</p>
              <p className="mt-1 text-xs text-[#77768C] leading-relaxed">
                Draft 60-day study plans, explain concepts, and generate practice quizzes.
              </p>
            </div>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-6">
          <div className="w-full max-w-md mx-auto rounded-3xl bg-white border border-[#EAE7F8] p-6 sm:p-8 shadow-[0_14px_34px_-16px_rgba(37,36,58,0.14)]">
            <div className="space-y-1 mb-6">
              <h2 className="text-xl font-bold text-[#25243A]">
                {tab === 'login'
                  ? 'Welcome back'
                  : tab === 'register'
                  ? 'Create your StudyDuo account'
                  : 'Reset your password'}
              </h2>
              <p className="text-sm text-[#77768C]">
                {tab === 'login'
                  ? 'Sign in to sync your quests, avatars, and duo streak in real time.'
                  : tab === 'register'
                  ? 'Register with Google or email to start leveling up with a partner.'
                  : 'Enter your email and we will send a password reset link.'}
              </p>
            </div>

            {/* Primary Google Sign-In */}
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="w-full min-h-[48px] flex items-center justify-center gap-3 rounded-xl sd-gradient-primary px-4 py-3 text-sm font-semibold text-white hover:brightness-105 transition-all shadow-[0_8px_20px_-8px_rgba(121,86,232,0.55)]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.38-1.56 4.05-5.27 4.05-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.79 3.92 14.69 3 12.17 3 7.09 3 3 7.09 3 12.28s4.09 9.28 9.17 9.28c5.29 0 8.8-3.72 8.8-8.96 0-.6-.06-1.06-.16-1.5z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E9EAF0]" />
              <span className="text-xs font-medium text-[#88899B]">or use email</span>
              <div className="h-px flex-1 bg-[#E9EAF0]" />
            </div>

            {/* Segmented Mode Tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F8F9FC] p-1 border border-[#E9EAF0] mb-4">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setFormError('');
                }}
                className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                  tab === 'login' ? 'bg-white text-[#242337] shadow-xs' : 'text-[#66687A]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setFormError('');
                }}
                className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                  tab === 'register' ? 'bg-white text-[#242337] shadow-xs' : 'text-[#66687A]'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              {tab === 'register' && (
                <div>
                  <label htmlFor="auth-fullname" className="block text-xs font-semibold text-[#242337] mb-1.5">
                    Full name
                  </label>
                  <input
                    id="auth-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Chen"
                    className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-[#242337] mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-[#88899B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] pl-10 pr-3.5 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
                  />
                </div>
              </div>

              {tab !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="auth-password" className="text-xs font-semibold text-[#242337]">
                      Password
                    </label>
                    {tab === 'login' && (
                      <button
                        type="button"
                        onClick={() => setTab('reset')}
                        className="text-xs font-medium text-[#7956D8] hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound className="h-4 w-4 text-[#88899B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] pl-10 pr-3.5 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {formError && (
                <p role="alert" className="text-xs font-medium text-[#E66F77]">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[46px] rounded-xl border border-[#242337] bg-[#242337] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#35344E] disabled:opacity-60 transition-colors"
              >
                {submitting
                  ? 'Please wait...'
                  : tab === 'login'
                  ? 'Sign In with Email'
                  : tab === 'register'
                  ? 'Create Account'
                  : 'Send Reset Link'}
              </button>

              {tab === 'reset' && (
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="w-full text-center text-xs font-medium text-[#66687A] hover:text-[#242337] py-1"
                >
                  Back to Sign In
                </button>
              )}
            </form>

            {/* Interactive Preview Access */}
            <div className="mt-6 pt-5 border-t border-[#EAE7F8] text-center">
              <p className="text-xs text-[#77768C] mb-2.5">
                Want to explore the full duo workflow before signing in?
              </p>
              <button
                type="button"
                onClick={enterPreviewMode}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#F1EDFF] px-4 py-2.5 text-sm font-semibold text-[#7956E8] hover:bg-[#E6DFFF] transition-colors"
              >
                Explore Interactive Preview
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export const EmailVerificationGate: React.FC = () => {
  const { firebaseUser, logout, showToast } = useStudyDuo();
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!firebaseUser) return;
    setResending(true);
    try {
      await sendEmailVerification(firebaseUser);
      showToast('Verification email sent! Check your inbox.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to resend email.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-3xl bg-white border border-[#E9EAF0] p-7 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0EBFF] text-[#7956D8]">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-[#242337]">Verify your email</h1>
        <p className="mt-2 text-sm text-[#66687A] leading-relaxed">
          We sent a verification link to <strong>{firebaseUser?.email}</strong>. Click the link in your inbox, then refresh below to finish setting up your StudyDuo profile.
        </p>
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#7956D8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6643C7]"
          >
            <RefreshCw className="h-4 w-4" />
            I have verified my email
          </button>
          <button
            type="button"
            disabled={resending}
            onClick={() => void handleResend()}
            className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-white px-4 py-2.5 text-sm font-medium text-[#242337] hover:bg-[#F8F9FC]"
          >
            {resending ? 'Sending...' : 'Resend verification email'}
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full min-h-[40px] text-xs font-medium text-[#66687A] hover:text-[#242337]"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export const OnboardingFlow: React.FC = () => {
  const { currentUser, completeOnboarding } = useStudyDuo();
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [preferredCategory, setPreferredCategory] = useState(currentUser?.preferredCategory || 'Programming');
  const [timezone, setTimezone] = useState(
    currentUser?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#7956D8');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = onboardingSchema.safeParse({
      fullName,
      username,
      bio,
      preferredCategory,
      timezone,
      avatarColor,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check your profile fields.');
      return;
    }
    setSaving(true);
    try {
      await completeOnboarding({
        fullName: parsed.data.fullName,
        username: parsed.data.username,
        bio: parsed.data.bio ?? '',
        preferredCategory: parsed.data.preferredCategory,
        timezone: parsed.data.timezone,
        avatarColor: parsed.data.avatarColor,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-5">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-[#E9EAF0] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <StudyDuoBrandMark size={30} />
          <span className="text-lg font-bold text-[#242337]">Set up your learner profile</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-[#242337] mb-2">Avatar Accent</span>
            <div className="flex items-center gap-2.5">
              {AVATAR_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setAvatarColor(hex)}
                  aria-label={`Choose avatar color ${hex}`}
                  style={{ backgroundColor: hex }}
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-white transition-transform ${
                    avatarColor === hex ? 'ring-2 ring-offset-2 ring-[#7956D8] scale-105' : ''
                  }`}
                >
                  {avatarColor === hex && <CheckCircle2 className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="onb-name" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Full name
              </label>
              <input
                id="onb-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="onb-username" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Unique username
              </label>
              <input
                id="onb-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="alex_builds"
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm font-mono text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="onb-bio" className="block text-xs font-semibold text-[#242337] mb-1.5">
              Short bio
            </label>
            <textarea
              id="onb-bio"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you excited to master this quarter?"
              className="w-full rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] p-3 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="onb-cat" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Preferred learning category
              </label>
              <select
                id="onb-cat"
                value={preferredCategory}
                onChange={(e) => setPreferredCategory(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="onb-tz" className="block text-xs font-semibold text-[#242337] mb-1.5">
                Timezone
              </label>
              <input
                id="onb-tz"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              />
            </div>
          </div>

          {error && <p role="alert" className="text-xs font-medium text-[#E66F77]">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[48px] rounded-xl bg-[#7956D8] text-sm font-semibold text-white hover:bg-[#6643C7] disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving profile...' : 'Continue to StudyDuo'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const WelcomeChoiceScreen: React.FC = () => {
  const {
    currentUser,
    dismissWelcomeChoice,
    setActivePage,
    acceptInvitationByCode,
    pendingInviteCodeFromUrl,
  } = useStudyDuo();
  const [inviteCode, setInviteCode] = useState(pendingInviteCodeFromUrl || '');
  const [codeError, setCodeError] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    const parsed = inviteCodeSchema.safeParse({ code: inviteCode });
    if (!parsed.success) {
      setCodeError(parsed.error.issues[0]?.message || 'Invalid code');
      return;
    }
    setJoining(true);
    try {
      const ok = await acceptInvitationByCode(parsed.data.code);
      if (ok) {
        setActivePage('checklist');
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-5">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex justify-center">
            <StudyDuoBrandMark size={40} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#242337]">
            Welcome, {currentUser?.fullName?.split(' ')[0]}!
          </h1>
          <p className="text-sm sm:text-base text-[#66687A]">
            How would you like to get started today?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-3xl bg-white border border-[#E9EAF0] p-6 flex flex-col justify-between">
            <div>
              <div className="h-11 w-11 rounded-2xl bg-[#F0EBFF] text-[#7956D8] flex items-center justify-center mb-4">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-[#242337]">Create a new study goal</h2>
              <p className="mt-1.5 text-sm text-[#66687A] leading-relaxed">
                Design your own learning roadmap, author daily checklists, and invite a partner to study alongside you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                dismissWelcomeChoice();
                setActivePage('goals');
              }}
              className="mt-6 w-full min-h-[46px] rounded-xl bg-[#7956D8] text-sm font-semibold text-white hover:bg-[#6643C7] transition-colors"
            >
              Create Study Goal
            </button>
          </div>

          <div className="rounded-3xl bg-white border border-[#E9EAF0] p-6 flex flex-col justify-between">
            <div>
              <div className="h-11 w-11 rounded-2xl bg-[#E7F6EE] text-[#38A879] flex items-center justify-center mb-4">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-[#242337]">Join with an invite code</h2>
              <p className="mt-1.5 text-sm text-[#66687A] leading-relaxed">
                Have an invitation link or code from a study partner? Paste it below to join their shared goal.
              </p>
            </div>
            <form onSubmit={handleJoin} className="mt-5 space-y-2.5">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="DUO-XXXXXX"
                aria-label="Invitation code"
                className="w-full min-h-[44px] rounded-xl border border-[#E9EAF0] bg-[#F8F9FC] px-3.5 text-sm font-mono uppercase tracking-wider text-[#242337] focus:bg-white focus:border-[#7956D8] focus:outline-none"
              />
              {codeError && <p className="text-xs text-[#E66F77]">{codeError}</p>}
              <button
                type="submit"
                disabled={joining}
                className="w-full min-h-[46px] rounded-xl bg-[#38A879] text-sm font-semibold text-white hover:bg-[#2F9268] disabled:opacity-60 transition-colors"
              >
                {joining ? 'Joining...' : 'Join Study Goal'}
              </button>
            </form>
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={dismissWelcomeChoice}
            className="min-h-[44px] px-4 text-sm font-medium text-[#77768C] hover:text-[#25243A]"
          >
            Skip for now and go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export const AuthOnboardingFlow: React.FC = () => {
  const { firebaseUser, needsEmailVerification, currentUser, needsOnboarding, showWelcomeChoice } =
    useStudyDuo();

  if (!firebaseUser) {
    return <AuthScreen />;
  }
  if (needsEmailVerification) {
    return <EmailVerificationGate />;
  }
  if (!currentUser || needsOnboarding) {
    return <OnboardingFlow />;
  }
  if (showWelcomeChoice) {
    return <WelcomeChoiceScreen />;
  }
  return <AuthScreen />;
};

