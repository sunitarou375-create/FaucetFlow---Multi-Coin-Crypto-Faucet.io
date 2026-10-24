/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Coins,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ExternalLink,
  History,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { Coin, COIN_CONFIGS, SPONSOR_CLAIM_LINK } from './types.ts';
import { db } from './lib/database.ts';
import { Navbar } from './components/Navbar.tsx';
import { ClaimCard } from './components/ClaimCard.tsx';
import { BalancesOverview } from './components/BalancesOverview.tsx';
import { ReferralHub } from './components/ReferralHub.tsx';
import { ClaimsLedger } from './components/ClaimsLedger.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { CryptoIcon } from './components/CryptoIcon.tsx';
import { SupabaseBanner } from './components/SupabaseBanner.tsx';
import { sound } from './lib/sound.ts';

export default function App() {
  const [viewMode, setViewMode] = useState<'app' | 'admin'>('app');
  const [activeTab, setActiveTab] = useState<'faucet' | 'balances' | 'referrals' | 'ledger'>('faucet');
  const [selectedCoin, setSelectedCoin] = useState<Coin>('BTC');
  const [, setTick] = useState<number>(0);

  // Subscribe to database changes
  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setTick((prev) => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  const currentUser = db.getCurrentUser();
  const currentProfile = db.getCurrentProfile();
  const balances = currentUser ? db.getBalances(currentUser.id) : [];
  const claims = currentUser ? db.getClaims(currentUser.id) : [];
  const referralClaims = currentUser ? db.getReferralClaims(currentUser.id) : [];

  const handleClaimSuccess = () => {
    setTick((prev) => prev + 1);
  };

  const handleUserChanged = () => {
    setTick((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Live Crypto Asset Ticker Bar */}
      <div className="bg-[#080B10] border-b border-slate-800/80 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-5 shrink-0 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-semibold">Faucet Engine Online</span>
            </div>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <CryptoIcon coin="BTC" size={13} />
              <span>BTC: ${COIN_CONFIGS.BTC.usdPrice.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CryptoIcon coin="LTC" size={13} />
              <span>LTC: ${COIN_CONFIGS.LTC.usdPrice.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CryptoIcon coin="DOGE" size={13} />
              <span>DOGE: ${COIN_CONFIGS.DOGE.usdPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CryptoIcon coin="USDT" size={13} />
              <span>USDT: $1.00</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-[11px]">
            <a
              href={SPONSOR_CLAIM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sound.playClickSound()}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono transition-colors"
            >
              <span>Task Sponsor Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setViewMode('app');
          setActiveTab(tab);
        }}
        onOpenAdmin={() => setViewMode('admin')}
        onUserChanged={handleUserChanged}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* VIEW MODE: ISOLATED ADMIN PORTAL */}
        {viewMode === 'admin' ? (
          <div className="space-y-6">
            <AdminPanel onExit={() => setViewMode('app')} />
          </div>
        ) : (
          <>
            {/* Supabase Connection Status Banner */}
            <SupabaseBanner />

            {/* TAB: FAUCET (PRIMARY VIEW) */}
        {activeTab === 'faucet' && (
          <div className="space-y-8">
            {/* Quick Hero Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#121824] via-[#101520] to-[#121824] border border-slate-800 rounded-3xl shadow-xl">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-amber-400 font-semibold">PostgreSQL Ledger</span>
                  <span aria-hidden="true">·</span>
                  <span>Instant 60s Cycle</span>
                  <span aria-hidden="true">·</span>
                  <span>Zero Withdrawal Fees</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  High-Yield Multi-Coin Crypto Faucet
                </h1>
                <p className="text-xs sm:text-sm text-slate-300">
                  Claim Bitcoin (BTC), Litecoin (LTC), Dogecoin (DOGE), and Tether (USDT) every 60 seconds.
                  Earn 10% lifetime referral commission credited directly to your balance.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <a
                  href={SPONSOR_CLAIM_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => sound.playClickSound()}
                  className="px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Sponsor Verification Task</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Core Claim Interactive Card */}
            <ClaimCard
              selectedCoin={selectedCoin}
              onSelectCoin={setSelectedCoin}
              onClaimSuccess={handleClaimSuccess}
            />

            {/* Balances Overview Grid */}
            <BalancesOverview
              balances={balances}
              onRefresh={() => setTick((p) => p + 1)}
              onSelectCoin={(coin) => {
                setSelectedCoin(coin);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <ClaimsLedger claims={claims} />
              </div>
              <div className="lg:col-span-5">
                <div className="bg-[#111722] border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white tracking-tight">Referral Boost (10%)</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('referrals')}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300"
                    >
                      View Hub →
                    </button>
                  </div>
                  <p className="text-xs text-slate-300">
                    Invite friends to claim rewards. Every time they claim, you receive 10% of their reward amount automatically via database trigger.
                  </p>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Referrals Active:</span>
                      <span className="font-mono text-white font-semibold">
                        {new Set(referralClaims.map((r) => r.referee_id)).size} referees
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Bonus Payouts:</span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        {referralClaims.length} credits
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: BALANCES */}
        {activeTab === 'balances' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Wallet & Balances</h2>
              <p className="text-xs text-slate-400">
                Multi-coin balances tracked with 12-decimal precision (BTC, LTC, DOGE, USDT)
              </p>
            </div>
            <BalancesOverview
              balances={balances}
              onRefresh={() => setTick((p) => p + 1)}
              onSelectCoin={(coin) => {
                setSelectedCoin(coin);
                setActiveTab('faucet');
              }}
            />
          </div>
        )}

        {/* TAB: REFERRALS */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">10% Referral Partner Program</h2>
              <p className="text-xs text-slate-400">
                Share your referral link and earn instant 10% commissions on all referee claims.
              </p>
            </div>
            <ReferralHub
              currentUser={currentUser}
              currentProfile={currentProfile}
              referralClaims={referralClaims}
              onRefereeCreated={() => setTick((p) => p + 1)}
            />
          </div>
        )}

        {/* TAB: LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Transaction History Ledger</h2>
              <p className="text-xs text-slate-400">
                Immutable record of claims from <code className="text-slate-300">public.claims</code>
              </p>
            </div>
            <ClaimsLedger claims={claims} />
          </div>
        )}
      </>
    )}
  </main>

      {/* Global Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#080B10] py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-300">FaucetFlow Engine</span>
            <span aria-hidden="true">·</span>
            <span>PostgreSQL Standalone Architecture</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              type="button"
              onClick={() => {
                sound.playClickSound();
                setViewMode(viewMode === 'admin' ? 'app' : 'admin');
              }}
              className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>{viewMode === 'admin' ? '← Exit to Faucet' : 'Admin Portal Access'}</span>
            </button>
            <span aria-hidden="true">·</span>
            <a
              href={SPONSOR_CLAIM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-mono transition-colors"
            >
              <span>{SPONSOR_CLAIM_LINK}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span aria-hidden="true">·</span>
            <span>60s Cooldown Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
