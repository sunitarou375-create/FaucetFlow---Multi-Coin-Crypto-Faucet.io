import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Coins,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Coin, COIN_CONFIGS, COOLDOWN_SECONDS, SPONSOR_CLAIM_LINK } from '../types.ts';
import { db } from '../lib/database.ts';
import { sound } from '../lib/sound.ts';
import { CryptoIcon } from './CryptoIcon.tsx';
import { SponsorModal } from './SponsorModal.tsx';

interface ClaimCardProps {
  selectedCoin: Coin;
  onSelectCoin: (coin: Coin) => void;
  onClaimSuccess: () => void;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({
  selectedCoin,
  onSelectCoin,
  onClaimSuccess,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    coin: Coin;
    amount: number;
    refBonus?: number;
  } | null>(null);

  // Sponsor link verification state
  const [sponsorVerified, setSponsorVerified] = useState<boolean>(false);
  const [showSponsorModal, setShowSponsorModal] = useState<boolean>(false);

  const coins: Coin[] = ['BTC', 'LTC', 'DOGE', 'USDT'];
  const config = COIN_CONFIGS[selectedCoin];

  // Update cooldown timer on ticker and on coin change
  useEffect(() => {
    const updateCooldown = () => {
      const { secondsRemaining: sec } = db.getCooldownRemaining(selectedCoin);
      setSecondsRemaining(sec);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [selectedCoin]);

  const handleClaim = () => {
    setErrorMsg(null);
    setSuccessInfo(null);
    sound.playClickSound();

    if (secondsRemaining > 0) {
      setErrorMsg(`Please wait ${secondsRemaining}s before claiming ${selectedCoin} again.`);
      sound.playErrorSound();
      return;
    }

    setIsClaiming(true);

    try {
      // Execute the PostgreSQL claim_reward RPC
      const result = db.claim_reward(selectedCoin);

      // Trigger celebratory confetti
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.65 },
        colors: [config.accentColor, '#10B981', '#3B82F6', '#F59E0B'],
      });

      sound.playCoinSound();
      setSuccessInfo({
        coin: result.coin,
        amount: result.amount,
        refBonus: result.referral_bonus,
      });

      // Update cooldown immediately
      setSecondsRemaining(COOLDOWN_SECONDS);
      onClaimSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Claim failed. Please try again.';
      setErrorMsg(message);
      sound.playErrorSound();
    } finally {
      setIsClaiming(false);
    }
  };

  const cooldownPercent = Math.max(
    0,
    Math.min(100, Math.round(((COOLDOWN_SECONDS - secondsRemaining) / COOLDOWN_SECONDS) * 100))
  );

  return (
    <div className="relative bg-[#111722] border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
      {/* Top ambient glow */}
      <div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: config.accentColor }}
      />

      {/* Header & Coin Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Instant Faucet</span>
            <span aria-hidden="true">·</span>
            <span>60s Cooldown</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-medium">10% Referral Bonus</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Claim Free Cryptocurrency
          </h2>
        </div>

        {/* Coin Selector Buttons */}
        <div className="inline-flex p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
          {coins.map((coin) => {
            const isSelected = selectedCoin === coin;
            return (
              <button
                key={coin}
                onClick={() => {
                  sound.playClickSound();
                  onSelectCoin(coin);
                  setErrorMsg(null);
                  setSuccessInfo(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <CryptoIcon coin={coin} size={18} />
                <span>{coin}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Reward Presentation */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-6 items-center">
        {/* Left: Reward Amount Details */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
              <CryptoIcon coin={selectedCoin} size={36} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">{config.name} Payout Tier</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tight">
                  {config.rewardFormatted}
                </span>
                <span className="text-base font-semibold text-slate-300">{config.symbol}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>{config.unitLabel}</span>
                <span aria-hidden="true">·</span>
                <span>Ref price: ${config.usdPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Sponsor Link Task Card */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Sponsor Verification Task</span>
              </div>
              {sponsorVerified ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : (
                <span className="text-[11px] text-amber-400 font-medium">Recommended</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-black/30 p-2.5 rounded-lg border border-slate-800/60">
              <div className="text-xs text-slate-400">
                <span>Sponsor link: </span>
                <a
                  href={SPONSOR_CLAIM_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-amber-300 hover:underline inline-flex items-center gap-1"
                  onClick={() => sound.playClickSound()}
                >
                  {SPONSOR_CLAIM_LINK}
                  <ExternalLink className="w-3 h-3 inline" />
                </a>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playClickSound();
                  setShowSponsorModal(true);
                }}
                className="shrink-0 px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                {sponsorVerified ? 'Task Completed' : 'Verify Link'}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Cooldown Progress & Claim Action */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center">
          {/* Circular / Indicator Display */}
          <div className="relative w-28 h-28 flex items-center justify-center mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="currentColor"
                strokeWidth="7"
                fill="transparent"
                className="text-slate-800"
              />
              {/* Animated Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke={config.accentColor}
                strokeWidth="7"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * cooldownPercent) / 100}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-500 ease-out"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center">
              {secondsRemaining > 0 ? (
                <>
                  <span className="text-2xl font-mono font-bold text-white tracking-tighter">
                    {secondsRemaining}s
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Wait
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mt-0.5">
                    Ready
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Status Text */}
          <div className="text-xs text-slate-300 mb-4">
            {secondsRemaining > 0 ? (
              <span>Cooling down · resets every 60 seconds</span>
            ) : (
              <span className="text-emerald-400 font-medium">Faucet ready for immediate payout</span>
            )}
          </div>

          {/* Claim Action Button with Sponsor Link */}
          {secondsRemaining === 0 && !isClaiming ? (
            <a
              href={SPONSOR_CLAIM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClaim}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 active:scale-[0.99] cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Claim {config.rewardFormatted} {selectedCoin}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80 ml-0.5" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm tracking-wide bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40 transition-all"
            >
              {isClaiming ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Processing RPC...</span>
                </>
              ) : (
                <span>Cooldown Active ({secondsRemaining}s)</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successInfo && (
        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2.5">
            <Coins className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-emerald-200">
                Reward Claimed Successfully!
              </div>
              <p className="text-emerald-300/90">
                <span className="font-mono font-bold">{successInfo.amount} {successInfo.coin}</span> credited
                to your balance via PostgreSQL RPC ledger.
              </p>
              {successInfo.refBonus && (
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium pt-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>10% referral commission ({successInfo.refBonus} {successInfo.coin}) paid to your referrer!</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setSuccessInfo(null)}
            className="text-emerald-400/70 hover:text-emerald-200 text-xs font-semibold px-2 py-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400/80 hover:text-red-200 text-xs font-medium"
          >
            Close
          </button>
        </div>
      )}

      {/* Sponsor Modal */}
      <SponsorModal
        isOpen={showSponsorModal}
        onClose={() => setShowSponsorModal(false)}
        onVerified={() => setSponsorVerified(true)}
        isAlreadyVerified={sponsorVerified}
        selectedCoin={selectedCoin}
      />
    </div>
  );
};
