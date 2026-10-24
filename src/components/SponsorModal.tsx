import React, { useState } from 'react';
import { ExternalLink, CheckCircle2, ShieldCheck, X, Sparkles } from 'lucide-react';
import { SPONSOR_CLAIM_LINK } from '../types.ts';
import { sound } from '../lib/sound.ts';

interface SponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  isAlreadyVerified: boolean;
  selectedCoin: string;
}

export const SponsorModal: React.FC<SponsorModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  isAlreadyVerified,
  selectedCoin,
}) => {
  const [visited, setVisited] = useState(false);
  const [verifying, setVerifying] = useState(false);

  if (!isOpen) return null;

  const handleOpenLink = () => {
    sound.playClickSound();
    setVisited(true);
  };

  const handleConfirmVerification = () => {
    setVerifying(true);
    sound.playClickSound();
    setTimeout(() => {
      setVerifying(false);
      onVerified();
      sound.playCoinSound();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0F141E] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight">Sponsor Verification</h3>
            <p className="text-xs text-slate-400">Step required to unlock your {selectedCoin} faucet claim</p>
          </div>
        </div>

        <div className="space-y-4 my-4">
          <div className="p-3.5 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Task Sponsor Link</span>
              <span className="text-emerald-400 font-medium">Earn Reward</span>
            </div>
            <p className="text-xs text-slate-300">
              Click the verified sponsor link below to validate your claim session. This helps fund free crypto distributions for all users!
            </p>
            <div className="pt-2">
              <a
                href={SPONSOR_CLAIM_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOpenLink}
                className="flex items-center justify-between w-full px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-xs rounded-xl transition-all group"
              >
                <span className="truncate max-w-[240px] font-medium">{SPONSOR_CLAIM_LINK}</span>
                <span className="flex items-center gap-1.5 text-[11px] font-sans font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform">
                  Visit Link
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </a>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-start gap-2 bg-slate-900/40 p-3 rounded-lg border border-slate-800/40">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Once opened in a new tab, return here and click &ldquo;Confirm Verification&rdquo; to enable continuous 60-second reward claiming.
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmVerification}
            disabled={!visited && !isAlreadyVerified}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              visited || isAlreadyVerified
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            {verifying ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Verifying...
              </span>
            ) : isAlreadyVerified || visited ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Unlock
              </>
            ) : (
              'Click Link First'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
