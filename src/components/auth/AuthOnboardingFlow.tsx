import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Mail,
  Map,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

interface OnboardingStep {
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  accentBg: string;
  illustration: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    badge: 'Step 1 of 3',
    badgeColor: '#7651E8',
    title: 'Shared Study Roadmaps',
    subtitle: 'Break any dream subject into daily milestone quests with actionable step-by-step checklists.',
    accentBg: '#E9DFFF',
    icon: <Map className="h-6 w-6 text-[#7651E8]" />,
    illustration: '🎨',
  },
  {
    badge: 'Step 2 of 3',
    badgeColor: '#E59A18',
    title: 'Duo Flame & Streaks',
    subtitle: 'Team up with a partner. Build unstoppable streaks, earn XP multipliers, and level up your custom avatars.',
    accentBg: '#FFF0C9',
    icon: <Flame className="h-6 w-6 text-[#E59A18]" />,
    illustration: '🔥',
  },
  {
    badge: 'Step 3 of 3',
    badgeColor: '#1F874D',
    title: 'Bujji AI Tutor & Quizzes',
    subtitle: 'Get 1-line instant answers, tailored micro-roadmaps, and curated YouTube channels for every topic.',
    accentBg: '#E2F5E9',
    icon: <Sparkles className="h-6 w-6 text-[#1F874D]" />,
    illustration: '🦉',
  },
];

export const AuthScreen: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    toasts,
    dismissToast,
  } = useStudyDuo();

  // Intro states: 'splash' -> 'walkthrough' -> 'auth'
  const [introState, setIntroState] = useState<'splash' | 'walkthrough' | 'auth'>(() => {
    try {
      const seen = localStorage.getItem('studyduo_intro_completed_v1');
      return seen ? 'auth' : 'splash';
    } catch {
      return 'splash';
    }
  });

  const [walkthroughIndex, setWalkthroughIndex] = useState(0);
  const [tab, setTab] = useState<'login' | 'register' | 'reset'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Handle splash timeout: show paired owl animation then proceed
  useEffect(() => {
    if (introState === 'splash') {
      const timer = setTimeout(() => {
        setIntroState('walkthrough');
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [introState]);

  const handleFinishWalkthrough = () => {
    try {
      localStorage.setItem('studyduo_intro_completed_v1', 'true');
    } catch {
      // ignore storage errors
    }
    setIntroState('auth');
  };

  const handleNextStep = () => {
    if (walkthroughIndex < ONBOARDING_STEPS.length - 1) {
      setWalkthroughIndex((prev) => prev + 1);
    } else {
      handleFinishWalkthrough();
    }
  };

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

  // 1. LOGO INTRO ANIMATION SCREEN
  if (introState === 'splash') {
    return (
      <div className="fixed inset-0 z-50 bg-[#FBF9FD] flex flex-col items-center justify-center p-6 select-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center"
        >
          <div className="relative mb-6">
            <motion.div
              animate={{ rotate: [0, -4, 4, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="h-28 w-28 sm:h-32 sm:w-32 rounded-[32px] bg-gradient-to-tr from-[#7651E8] to-[#9D78FF] p-3 shadow-[0_20px_40px_-15px_rgba(118,81,232,0.4)] flex items-center justify-center"
            >
              <img
                src={owlDuoMasterImg}
                alt="StudyDuo paired owl mascot logo"
                className="h-full w-full object-contain filter drop-shadow-sm"
              />
            </motion.div>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#FFB800] text-sm shadow-md"
            >
              ✨
            </motion.span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="flex items-center gap-2 mb-2"
          >
            <span className="font-display text-3xl sm:text-4xl font-black tracking-tight text-[#111827]">
              Study<span className="text-[#7651E8]">Duo</span>
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-xs sm:text-sm font-semibold text-[#8B8A99] tracking-wider uppercase"
          >
            Learn &bull; Connect &bull; Level Up Together
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // 2. 3-STEP GET STARTED WALKTHROUGH ANIMATION
  if (introState === 'walkthrough') {
    const currentStep = ONBOARDING_STEPS[walkthroughIndex];
    return (
      <div className="fixed inset-0 z-50 bg-[#FBF9FD] flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden max-w-lg mx-auto">
        {/* Top bar with Skip button */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <StudyDuoOwlMark size={28} />
            <span className="font-display font-black text-[#111827] text-lg">StudyDuo</span>
          </div>
          <button
            type="button"
            onClick={handleFinishWalkthrough}
            className="text-xs font-bold text-[#8B8A99] hover:text-[#111827] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            Skip to Sign In
          </button>
        </div>

        {/* Carousel Content */}
        <div className="my-auto py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={walkthroughIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex flex-col items-center text-center px-2"
            >
              {/* Illustration Circle */}
              <div
                className="h-44 w-44 sm:h-52 sm:w-52 rounded-[40px] flex items-center justify-center mb-8 relative shadow-[0_18px_36px_-16px_rgba(118,81,232,0.18)]"
                style={{ backgroundColor: currentStep.accentBg }}
              >
                <div className="text-6xl sm:text-7xl drop-shadow-sm select-none">
                  {currentStep.illustration}
                </div>
                <div className="absolute -bottom-3 right-4 h-12 w-12 rounded-2xl bg-white shadow-md border border-[#F0EDF5] flex items-center justify-center">
                  {currentStep.icon}
                </div>
              </div>

              {/* Step Badge */}
              <span
                className="px-3.5 py-1 rounded-full text-xs font-black tracking-wide uppercase mb-3"
                style={{
                  backgroundColor: `${currentStep.badgeColor}15`,
                  color: currentStep.badgeColor,
                }}
              >
                {currentStep.badge}
              </span>

              {/* Title & Subtitle */}
              <h2 className="font-display text-2xl sm:text-3xl font-black text-[#111827] tracking-tight mb-3">
                {currentStep.title}
              </h2>
              <p className="text-sm sm:text-[15px] text-[#6B7280] leading-relaxed max-w-sm">
                {currentStep.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Actions & Step Dots */}
        <div className="space-y-6 pb-4">
          {/* Animated 3 Dots Indicator */}
          <div className="flex items-center justify-center gap-2">
            {ONBOARDING_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setWalkthroughIndex(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === walkthroughIndex ? 'w-8 bg-[#111827]' : 'w-2 bg-[#E5E7EB]'
                }`}
              />
            ))}
          </div>

          {/* Next / Get Started Action Button */}
          <button
            type="button"
            onClick={handleNextStep}
            className="w-full min-h-[52px] rounded-2xl bg-[#111827] text-white font-bold text-base hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_12px_24px_-10px_rgba(0,0,0,0.3)] cursor-pointer"
          >
            <span>{walkthroughIndex === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Continue'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // 3. CLEAN AUTH SCREEN (MATCHING USER'S SCREENSHOT PIXEL-PERFECT)
  return (
    <div className="min-h-dvh bg-[#FAFAFC] flex flex-col items-center justify-center px-4 py-8 sm:py-12 select-none">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[420px] bg-white rounded-[28px] p-7 sm:p-9 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.06)] border border-[#F3F4F6]"
      >
        {/* Header matching screenshot */}
        <div className="mb-8">
          <h1 className="text-[34px] sm:text-[38px] font-extrabold tracking-tight text-[#111827] leading-none mb-2.5">
            {tab === 'login' ? 'Welcome' : tab === 'register' ? 'Create Account' : 'Reset Password'}
          </h1>
          <p className="text-[14px] text-[#6B7280] leading-snug">
            {tab === 'login'
              ? 'Access your account and continue your journey with us'
              : tab === 'register'
              ? 'Join StudyDuo to learn, track habits, and level up with a partner'
              : 'Enter your email to receive a password reset link'}
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {tab === 'register' && (
            <div>
              <label htmlFor="auth-fullname" className="block text-[13px] font-semibold text-[#374151] mb-1.5">
                Full Name
              </label>
              <input
                id="auth-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full h-12 rounded-xl bg-[#F3F4F6] px-4 text-[14px] text-[#111827] placeholder-[#9CA3AF] border-none focus:outline-none focus:ring-2 focus:ring-[#7651E8]/40 transition-all"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-[13px] font-semibold text-[#374151] mb-1.5">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full h-12 rounded-xl bg-[#F3F4F6] px-4 text-[14px] text-[#111827] placeholder-[#9CA3AF] border-none focus:outline-none focus:ring-2 focus:ring-[#7651E8]/40 transition-all"
            />
          </div>

          {tab !== 'reset' && (
            <div>
              <label htmlFor="auth-password" className="block text-[13px] font-semibold text-[#374151] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-12 rounded-xl bg-[#F3F4F6] pl-4 pr-11 text-[14px] text-[#111827] placeholder-[#9CA3AF] border-none focus:outline-none focus:ring-2 focus:ring-[#7651E8]/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563] p-1 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* "Keep me signed in" & "Reset password" Row matching screenshot */}
          {tab === 'login' && (
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="hidden"
                />
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                    keepSignedIn ? 'border-[#7651E8] bg-[#7651E8]' : 'border-[#D1D5DB] bg-white'
                  }`}
                >
                  {keepSignedIn && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-[13px] text-[#4B5563]">Keep me signed in</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setTab('reset');
                  setFormError('');
                }}
                className="text-[13px] font-medium text-[#9333EA] hover:text-[#7E22CE] cursor-pointer transition-colors"
              >
                Reset password
              </button>
            </div>
          )}

          {formError && (
            <p role="alert" className="text-xs font-semibold text-[#DC2626] pt-1">
              {formError}
            </p>
          )}

          {/* Solid Dark Sign In Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-[#111827] text-white font-bold text-[15px] hover:bg-black active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer flex items-center justify-center shadow-xs"
            >
              {submitting
                ? 'Please wait...'
                : tab === 'login'
                ? 'Sign In'
                : tab === 'register'
                ? 'Create Account'
                : 'Send Reset Link'}
            </button>
          </div>

          {/* Divider: "Or continue with" */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E7EB]" />
            </div>
            <span className="relative bg-white px-3 text-[12px] text-[#9CA3AF]">
              Or continue with
            </span>
          </div>

          {/* Clean Google Button matching screenshot */}
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="w-full h-12 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] active:scale-[0.99] text-[#111827] font-semibold text-[14px] flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </form>

        {/* Footer Link matching screenshot */}
        <div className="mt-7 text-center">
          {tab === 'login' ? (
            <p className="text-[13px] text-[#6B7280]">
              New to our platform?{' '}
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setFormError('');
                }}
                className="font-semibold text-[#9333EA] hover:text-[#7E22CE] cursor-pointer"
              >
                Create Account
              </button>
            </p>
          ) : (
            <p className="text-[13px] text-[#6B7280]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setFormError('');
                }}
                className="font-semibold text-[#9333EA] hover:text-[#7E22CE] cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </motion.div>

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
