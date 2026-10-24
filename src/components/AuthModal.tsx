import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  X,
  Mail,
  User as UserIcon,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { db } from '../lib/database.ts';
import { sound } from '../lib/sound.ts';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referrerId, setReferrerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const allUsers = db.getAllUsers();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    sound.playClickSound();

    setTimeout(() => {
      // Find user by email in database
      const existingUser = allUsers.find(
        (u) => u.email.toLowerCase() === cleanEmail
      );

      if (existingUser) {
        db.setCurrentUserId(existingUser.id);
        sound.playCoinSound();
        setSuccess(`Welcome back, ${existingUser.email}! Session active.`);
        setTimeout(() => {
          setIsLoading(false);
          onSuccess();
          onClose();
        }, 500);
      } else {
        // If account doesn't exist, provide quick option to sign up
        setError(`No account found for "${cleanEmail}". Please check your email or click Sign Up.`);
        sound.playErrorSound();
        setIsLoading(false);
      }
    }, 400);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please provide a valid email address.');
      return;
    }

    setIsLoading(true);
    sound.playClickSound();

    setTimeout(() => {
      try {
        const newUser = db.createUser(
          cleanEmail,
          username.trim() || undefined,
          referrerId.trim() || null
        );

        db.setCurrentUserId(newUser.id);
        sound.playCoinSound();
        setSuccess(`Account created for ${newUser.email}! Profile and 4 crypto balances initialized.`);
        setTimeout(() => {
          setIsLoading(false);
          onSuccess();
          onClose();
        }, 600);
      } catch (err: unknown) {
        setIsLoading(false);
        sound.playErrorSound();
        setError(err instanceof Error ? err.message : 'Sign up failed.');
      }
    }, 400);
  };

  const handleSelectQuickAccount = (userId: string) => {
    sound.playClickSound();
    db.setCurrentUserId(userId);
    sound.playCoinSound();
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#0F141E] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-200 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="text-amber-400 font-semibold uppercase tracking-wider">FaucetFlow Auth</span>
            <span aria-hidden="true">·</span>
            <span>PostgreSQL & Supabase Synced</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'signin' ? 'Sign In to Your Account' : 'Create a Free Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'signin'
              ? 'Access your multi-coin crypto balances and referral earnings'
              : 'Claim free BTC, LTC, DOGE, and USDT every 60 seconds with 10% referral perks'}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              sound.playClickSound();
              setMode('signin');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClickSound();
              setMode('signup');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
        </div>

        {/* Form Body */}
        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Password / PIN</label>
                <span className="text-[11px] text-slate-400">Passwordless supported</span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In to FaucetFlow</span>
                </>
              )}
            </button>

            {/* Quick Demo Switcher Accounts */}
            <div className="pt-3 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-2 font-medium">
                Quick Sign In with Demo Accounts:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {allUsers.slice(0, 2).map((u) => {
                  const isUserAdmin = db.isUserAdmin(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectQuickAccount(u.id)}
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-colors"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-white truncate">
                        {isUserAdmin && <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />}
                        <span className="truncate">{u.email.split('@')[0]}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isUserAdmin ? 'Admin Account' : 'Referee Account'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="new.user@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Username (optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="crypto_earner"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none transition-colors"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Referral Code / Referrer UUID (optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={referrerId}
                  onChange={(e) => setReferrerId(e.target.value)}
                  placeholder="e.g. a1111111-1111-4111-8111-111111111111"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none transition-colors font-mono"
                />
                <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-slate-400">
                Your referrer will automatically receive 10% commission on every claim you make.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account & Start Claiming</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Notification */}
        {success && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </div>
    </div>
  );
};
