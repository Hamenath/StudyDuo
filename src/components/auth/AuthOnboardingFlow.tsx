import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react';
import { sendEmailVerification } from 'firebase/auth';
import { useStudyDuo } from '../../context/StudyDuoContext';
import { extractInviteCode } from '../../lib/inviteShare';
import { onboardingSchema, inviteCodeSchema } from '../../lib/validation';
import { MascotImage, StudyDuoOwlMark, owlDuoMasterImg } from '../ui/MascotArtwork';
import { Button, ToastStack } from '../ui/Primitives';

const AVATAR_COLORS = ['#7651E8', '#2FB368', '#E59A18', '#E05288', '#6B8AFD', '#38A89D'];
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
    <div className="min-h-dvh bg-[#F8F5FF] flex flex-col justify-center px-4 sm:px-6 py-6 sm:py-10">
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* Left Reference Hero Card — Pastel Lavender Brain Mascot + Curved White Bottom Sheet */}
        <div className="lg:col-span-6">
          <div className="mx-auto max-w-md lg:max-w-none overflow-hidden rounded-[36px] bg-[#E9DFFF] border border-[#E4D8FF] shadow-[0_18px_40px_-20px_rgba(118,81,232,0.22)]">
            {/* Full-Bleed Lavender Illustration Stage (matches brand paired owl duo) */}
            <div className="relative h-72 sm:h-80 w-full overflow-hidden bg-[#E9DFFF] flex items-center justify-center p-4">
              <img
                src={owlDuoMasterImg}
                alt="StudyDuo paired owl mascots with open book and gold achievement star"
                className="h-full w-full object-contain max-h-72 drop-shadow-md select-none"
              />
            </div>

            {/* Curved White Bottom Content Sheet */}
            <div className="relative z-10 -mt-8 rounded-t-[36px] bg-white px-6 sm:px-8 pt-7 pb-7 text-center shadow-[0_-8px_24px_-12px_rgba(118,81,232,0.12)]">
              <div className="inline-flex items-center justify-center gap-2 mb-3">
                <StudyDuoOwlMark size={34} />
                <span className="font-display text-xl font-black tracking-tight">
                  <span className="text-[#7651E8]">Study</span>
                  <span className="text-[#20202A]">Duo</span>
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-[34px] font-black tracking-tight text-[#20202A] leading-[1.15] [text-wrap:balance]">
                Learning is more <span className="text-[#7651E8]">fun</span> together!
              </h1>

              <p className="mt-3 text-sm sm:text-[15px] text-[#777783] leading-relaxed max-w-sm mx-auto">
                Shared roadmaps, daily study quests, and cheerful rewards that keep you and your study partner coming back.
              </p>

              {pendingInviteCodeFromUrl && (
                <div className="mt-4 rounded-2xl bg-[#E9DFFF]/70 border border-[#D8C6FF] px-4 py-3 text-left">
                  <p className="text-xs font-extrabold text-[#6842DE]">
                    You were invited to join a study duo!
                  </p>
                  <p className="mt-0.5 text-xs text-[#20202A]">
                    Sign in on the right to accept code{' '}
                    <span className="font-mono font-bold text-[#7651E8]">{pendingInviteCodeFromUrl}</span>.
                  </p>
                </div>
              )}

              {/* Feature pillars */}
              <div className="mt-6 grid grid-cols-3 gap-2 text-left">
                <div className="rounded-2xl bg-[#E9DFFF]/65 px-3 py-2.5">
                  <p className="text-[11px] font-extrabold text-[#6842DE]">Roadmaps</p>
                  <p className="text-[11px] text-[#5C5C6C] mt-0.5">Clear milestones</p>
                </div>
                <div className="rounded-2xl bg-[#FFF0C9]/80 px-3 py-2.5">
                  <p className="text-[11px] font-extrabold text-[#B47100]">Duo Flame</p>
                  <p className="text-[11px] text-[#5C5C6C] mt-0.5">Daily streaks</p>
                </div>
                <div className="rounded-2xl bg-[#E2F5E9]/85 px-3 py-2.5">
                  <p className="text-[11px] font-extrabold text-[#1F874D]">AI Coach</p>
                  <p className="text-[11px] text-[#5C5C6C] mt-0.5">Smart quizzes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Clean Authentication Card */}
        <div className="lg:col-span-6">
          <div className="w-full max-w-md mx-auto rounded-[32px] bg-white border border-[#F0EDF5] p-6 sm:p-8 shadow-[0_14px_34px_-18px_rgba(118,81,232,0.14)]">
            <div className="space-y-1 mb-5">
              <span className="inline-flex items-center rounded-full bg-[#E9DFFF] px-3 py-1 text-[11px] font-extrabold text-[#7651E8]">
                Start Learning
              </span>
              <h2 className="font-display text-2xl font-black text-[#20202A] pt-1">
                {tab === 'login'
                  ? 'Welcome back!'
                  : tab === 'register'
                  ? 'Create your account'
                  : 'Reset your password'}
              </h2>
              <p className="text-sm text-[#777783]">
                {tab === 'login'
                  ? 'Sign in to sync your study roadmap, avatar, and duo streak.'
                  : tab === 'register'
                  ? 'Join with Google or email to start leveling up with a partner.'
                  : 'Enter your email and we will send a password reset link.'}
              </p>
            </div>

            {/* Primary Google Sign-In Pill CTA */}
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="w-full min-h-[52px] flex items-center justify-between gap-3 rounded-full bg-[#7651E8] pl-5 pr-2 py-2 text-sm font-bold text-white hover:bg-[#6440D6] shadow-[0_8px_20px_-8px_rgba(118,81,232,0.55)] transition-all cursor-pointer active:scale-[0.98]"
            >
              <span className="flex items-center gap-2.5 pl-1">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.38-1.56 4.05-5.27 4.05-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.79 3.92 14.69 3 12.17 3 7.09 3 3 7.09 3 12.28s4.09 9.28 9.17 9.28c5.29 0 8.8-3.72 8.8-8.96 0-.6-.06-1.06-.16-1.5z"
                  />
                </svg>
                <span>Continue with Google</span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#7651E8]">
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </span>
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#F0EDF5]" />
              <span className="text-xs font-semibold text-[#9A99AA]">or use email</span>
              <div className="h-px flex-1 bg-[#F0EDF5]" />
            </div>

            {/* Segmented Mode Tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-full bg-[#F8F5FF] p-1 border border-[#F0EDF5] mb-4">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setFormError('');
                }}
                className={`min-h-[38px] rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  tab === 'login' ? 'bg-white text-[#20202A] shadow-xs' : 'text-[#777783]'
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
                className={`min-h-[38px] rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  tab === 'register' ? 'bg-white text-[#20202A] shadow-xs' : 'text-[#777783]'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              {tab === 'register' && (
                <div>
                  <label htmlFor="auth-fullname" className="block text-xs font-bold text-[#20202A] mb-1.5">
                    Full name
                  </label>
                  <input
                    id="auth-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Chen"
                    className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-bold text-[#20202A] mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-[#8B8A99] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] pl-10 pr-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
                  />
                </div>
              </div>

              {tab !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="auth-password" className="text-xs font-bold text-[#20202A]">
                      Password
                    </label>
                    {tab === 'login' && (
                      <button
                        type="button"
                        onClick={() => setTab('reset')}
                        className="text-xs font-bold text-[#7651E8] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound className="h-4 w-4 text-[#8B8A99] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] pl-10 pr-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {formError && (
                <p role="alert" className="text-xs font-semibold text-[#C82D4F]">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[46px] rounded-full bg-[#20202A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#323244] disabled:opacity-60 transition-colors cursor-pointer"
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
                  className="w-full text-center text-xs font-semibold text-[#777783] hover:text-[#20202A] py-1 cursor-pointer"
                >
                  Back to Sign In
                </button>
              )}
            </form>
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
    <div className="min-h-dvh bg-[#F8F5FF] flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-[32px] bg-white border border-[#F0EDF5] p-7 text-center shadow-[0_14px_34px_-18px_rgba(118,81,232,0.14)]">
        <div className="mx-auto mb-4 flex justify-center">
          <MascotImage mascot="owl" className="h-24 w-24" rounded="rounded-[24px]" />
        </div>
        <h1 className="font-display text-2xl font-black text-[#20202A]">Verify your email</h1>
        <p className="mt-2 text-sm text-[#777783] leading-relaxed">
          We sent a verification link to <strong className="text-[#20202A]">{firebaseUser?.email}</strong>. Click the link in your inbox, then refresh below to finish setting up your StudyDuo profile.
        </p>
        <div className="mt-6 space-y-2.5">
          <Button
            type="button"
            fullWidth
            withArrowCircle
            onClick={() => window.location.reload()}
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              I have verified my email
            </span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={resending}
            onClick={() => void handleResend()}
          >
            {resending ? 'Sending...' : 'Resend verification email'}
          </Button>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full min-h-[40px] text-xs font-semibold text-[#777783] hover:text-[#20202A] cursor-pointer"
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
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#7651E8');
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
    } catch (err) {
      console.error('Error submitting profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#F8F5FF] flex items-center justify-center p-5">
      <div className="w-full max-w-lg rounded-[32px] bg-white border border-[#F0EDF5] p-6 sm:p-8 shadow-[0_14px_34px_-18px_rgba(118,81,232,0.14)]">
        <div className="flex items-center gap-3 mb-6">
          <StudyDuoOwlMark size={36} />
          <div>
            <h1 className="font-display text-xl font-black text-[#20202A]">Set up your learner profile</h1>
            <p className="text-xs text-[#777783]">Pick your favorite subject and color accent.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span className="block text-xs font-bold text-[#20202A] mb-2">Avatar Accent</span>
            <div className="flex items-center gap-2.5">
              {AVATAR_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setAvatarColor(hex)}
                  aria-label={`Choose avatar color ${hex}`}
                  style={{ backgroundColor: hex }}
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-white transition-transform cursor-pointer ${
                    avatarColor === hex ? 'ring-2 ring-offset-2 ring-[#7651E8] scale-105' : ''
                  }`}
                >
                  {avatarColor === hex && <CheckCircle2 className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="onb-name" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Full name
              </label>
              <input
                id="onb-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="onb-username" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Unique username
              </label>
              <input
                id="onb-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="alex_builds"
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm font-mono text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="onb-bio" className="block text-xs font-bold text-[#20202A] mb-1.5">
              Short bio
            </label>
            <textarea
              id="onb-bio"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you excited to master this quarter?"
              className="w-full rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="onb-cat" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Preferred learning category
              </label>
              <select
                id="onb-cat"
                value={preferredCategory}
                onChange={(e) => setPreferredCategory(e.target.value)}
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-3.5 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="onb-tz" className="block text-xs font-bold text-[#20202A] mb-1.5">
                Timezone
              </label>
              <input
                id="onb-tz"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full min-h-[44px] rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] px-4 text-sm text-[#20202A] focus:bg-white focus:border-[#7651E8] focus:outline-none"
              />
            </div>
          </div>

          {error && <p role="alert" className="text-xs font-semibold text-[#C82D4F]">{error}</p>}

          <Button type="submit" fullWidth size="lg" withArrowCircle disabled={saving}>
            {saving ? 'Saving profile...' : 'Continue to StudyDuo'}
          </Button>
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
    const extracted = extractInviteCode(inviteCode);
    const parsed = inviteCodeSchema.safeParse({ code: extracted });
    if (!parsed.success) {
      setCodeError('Paste a valid Duo invite link or code (e.g. DUO-XXXXXX)');
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
    <div className="min-h-dvh bg-[#F8F5FF] flex items-center justify-center p-5">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex justify-center">
            <StudyDuoOwlMark size={44} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#20202A]">
            Welcome, {currentUser?.fullName?.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm sm:text-base text-[#777783]">
            How would you like to get started today?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-[28px] bg-[#E9DFFF] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-2xl bg-white text-[#7651E8] flex items-center justify-center">
                  <Target className="h-5 w-5" />
                </div>
                <MascotImage mascot="coding" className="h-16 w-16" rounded="rounded-2xl" />
              </div>
              <h2 className="font-display text-lg font-black text-[#20202A]">Create a new study goal</h2>
              <p className="mt-1.5 text-sm text-[#4F4D60] leading-relaxed">
                Design your own learning roadmap, author daily quests, and invite a partner to study alongside you.
              </p>
            </div>
            <Button
              type="button"
              fullWidth
              withArrowCircle
              className="mt-6"
              onClick={() => {
                dismissWelcomeChoice();
                setActivePage('goals');
              }}
            >
              Create Study Goal
            </Button>
          </div>

          <div className="rounded-[28px] bg-[#E2F5E9] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-2xl bg-white text-[#1F874D] flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <MascotImage mascot="language" className="h-16 w-16" rounded="rounded-2xl" />
              </div>
              <h2 className="font-display text-lg font-black text-[#20202A]">Join with an invite code</h2>
              <p className="mt-1.5 text-sm text-[#4A5E53] leading-relaxed">
                Have an invitation link or code from a study partner? Paste it below to join their shared goal.
              </p>
            </div>
            <form onSubmit={handleJoin} className="mt-5 space-y-2.5">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Paste invite link or DUO-XXXXXX"
                aria-label="Invitation link or code"
                className="w-full min-h-[44px] rounded-2xl border border-[#CBEBD7] bg-white px-4 text-sm text-[#20202A] focus:border-[#2FB368] focus:outline-none"
              />
              {codeError && <p className="text-xs font-semibold text-[#C82D4F]">{codeError}</p>}
              <Button
                type="submit"
                variant="success"
                fullWidth
                disabled={joining}
              >
                {joining ? 'Joining...' : 'Join Study Goal'}
              </Button>
            </form>
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={dismissWelcomeChoice}
            className="min-h-[44px] px-4 text-sm font-bold text-[#777783] hover:text-[#20202A] cursor-pointer"
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
