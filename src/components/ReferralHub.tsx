import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  TrendingUp,
  UserPlus,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import { User, Profile, ReferralClaim, COIN_CONFIGS, REFERRAL_COMMISSION_RATE } from '../types.ts';
import { db } from '../lib/database.ts';
import { CryptoIcon } from './CryptoIcon.tsx';
import { sound } from '../lib/sound.ts';

interface ReferralHubProps {
  currentUser: User | null;
  currentProfile: Profile | null;
  referralClaims: ReferralClaim[];
  onRefereeCreated: () => void;
}

export const ReferralHub: React.FC<ReferralHubProps> = ({
  currentUser,
  currentProfile,
  referralClaims,
  onRefereeCreated,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [testRefereeEmail, setTestRefereeEmail] = useState<string>('');
  const [testRefereeUsername, setTestRefereeUsername] = useState<string>('');
  const [createdSuccess, setCreatedSuccess] = useState<string | null>(null);

  if (!currentUser) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://faucetflow.app';
  const referralLink = `${origin}/?ref=${currentUser.id}`;

  const handleCopyLink = () => {
    sound.playClickSound();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter commissions where current user is the referrer
  const myReferralEarnings = referralClaims.filter((rc) => rc.referrer_id === currentUser.id);

  // Group commissions by coin
  const commissionsByCoin = myReferralEarnings.reduce((acc, curr) => {
    acc[curr.coin] = (acc[curr.coin] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  // Estimate total USD earned from referrals
  const totalReferralUsd = Object.entries(commissionsByCoin).reduce((sum, [coin, amount]) => {
    const price = COIN_CONFIGS[coin as keyof typeof COIN_CONFIGS]?.usdPrice || 0;
    return sum + amount * price;
  }, 0);

  // Distinct referee count
  const uniqueReferees = new Set(myReferralEarnings.map((rc) => rc.referee_id)).size;

  const handleCreateTestReferee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRefereeEmail.trim()) return;

    try {
      sound.playClickSound();
      const newUser = db.createUser(
        testRefereeEmail.trim(),
        testRefereeUsername.trim() || undefined,
        currentUser.id // Referrer is current user!
      );

      // Simulate one claim by referee so user immediately sees commission!
      db.setCurrentUserId(newUser.id);
      db.claim_reward('USDT');
      // Switch back to original user
      db.setCurrentUserId(currentUser.id);

      setCreatedSuccess(`Created referee ${newUser.email}! A test claim was run and your 10% commission was credited.`);
      sound.playCoinSound();
      setTestRefereeEmail('');
      setTestRefereeUsername('');
      onRefereeCreated();
    } catch (err: unknown) {
      sound.playErrorSound();
      alert(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Referral Program Banner */}
      <div className="relative bg-gradient-to-r from-[#111722] via-[#141C2B] to-[#111722] border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-amber-400 font-semibold uppercase tracking-wider">
                Partner Program
              </span>
              <span aria-hidden="true">·</span>
              <span>Unlimited Lifetime Commission</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Earn 10% Direct Commission on Every Claim
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Share your link with crypto enthusiasts. Whenever your referees claim BTC, LTC, DOGE, or USDT,
              the PostgreSQL engine automatically credits 10% of their reward to your wallet in real time.
            </p>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            {/* Copyable Referral Link Box */}
            <div className="flex items-center gap-2 p-1.5 bg-black/40 border border-slate-800 rounded-xl max-w-md">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="bg-transparent px-3 text-xs font-mono text-slate-300 w-56 sm:w-64 truncate outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClickSound();
                setShowInviteModal(!showInviteModal);
                setCreatedSuccess(null);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate / Test Referral Sign Up</span>
            </button>
          </div>
        </div>
      </div>

      {/* Test Referee Creator Collapsible Form */}
      {showInviteModal && (
        <div className="bg-[#111722] border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Test Referral Verification Simulator</h3>
                <p className="text-xs text-slate-400">
                  Quickly generate a referee linked to your user ID ({currentUser.id.substring(0, 8)}...) to verify the 10% commission engine.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Hide
            </button>
          </div>

          <form onSubmit={handleCreateTestReferee} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="email"
              required
              value={testRefereeEmail}
              onChange={(e) => setTestRefereeEmail(e.target.value)}
              placeholder="Referee Email (e.g. partner@test.com)"
              className="px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none"
            />
            <input
              type="text"
              value={testRefereeUsername}
              onChange={(e) => setTestRefereeUsername(e.target.value)}
              placeholder="Username (optional)"
              className="px-3.5 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Register & Run Test Claim
            </button>
          </form>

          {createdSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{createdSuccess}</span>
            </div>
          )}
        </div>
      )}

      {/* Referral Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Commission Rate</span>
            <span className="text-amber-400 font-bold font-mono">10%</span>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">Lifetime Instant</div>
          <div className="text-xs text-slate-400">No payout delays or hold periods</div>
        </div>

        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Referrals</span>
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight font-mono">
            {uniqueReferees} <span className="text-xs font-sans font-normal text-slate-400">active</span>
          </div>
          <div className="text-xs text-slate-400">Linked to your referrer profile</div>
        </div>

        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Commission Earned</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight font-mono">
            ≈ ${totalReferralUsd.toFixed(4)} <span className="text-xs text-slate-400">USD</span>
          </div>
          <div className="text-xs text-slate-400">From {myReferralEarnings.length} referee claim actions</div>
        </div>
      </div>

      {/* Referral Claims Ledger Table */}
      <div className="bg-[#111722] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Referral Commission Ledger</h3>
          </div>
          <span className="text-xs text-slate-400">public.referral_claims</span>
        </div>

        {myReferralEarnings.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-800/80 rounded-xl space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No referral commissions recorded yet.</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              Share your referral link or use the test button above to register a referee and earn 10% commission.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-2.5 pl-2">Coin</th>
                  <th className="pb-2.5">Commission Amount (10%)</th>
                  <th className="pb-2.5">Referee ID</th>
                  <th className="pb-2.5 pr-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {myReferralEarnings.map((rc) => (
                  <tr key={rc.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 pl-2">
                      <div className="flex items-center gap-2 font-sans font-medium text-white">
                        <CryptoIcon coin={rc.coin} size={18} />
                        <span>{rc.coin}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-emerald-400 font-semibold">
                      +{rc.amount.toFixed(10)} {rc.coin}
                    </td>
                    <td className="py-2.5 text-slate-400 truncate max-w-[140px]">
                      {rc.referee_id.substring(0, 8)}...
                    </td>
                    <td className="py-2.5 pr-2 text-right text-slate-400 text-[11px] font-sans">
                      {new Date(rc.claimed_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
