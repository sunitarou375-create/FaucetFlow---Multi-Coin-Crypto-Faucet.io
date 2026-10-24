import React, { useState } from 'react';
import { Wallet, ArrowUpRight, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { Coin, COIN_CONFIGS, Balance } from '../types.ts';
import { CryptoIcon } from './CryptoIcon.tsx';
import { sound } from '../lib/sound.ts';

interface BalancesOverviewProps {
  balances: Balance[];
  onRefresh: () => void;
  onSelectCoin: (coin: Coin) => void;
}

export const BalancesOverview: React.FC<BalancesOverviewProps> = ({
  balances,
  onRefresh,
  onSelectCoin,
}) => {
  const [withdrawCoin, setWithdrawCoin] = useState<Coin | null>(null);
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [withdrawStatus, setWithdrawStatus] = useState<string | null>(null);

  const coins: Coin[] = ['BTC', 'LTC', 'DOGE', 'USDT'];

  const getBalanceAmount = (coin: Coin): number => {
    const bal = balances.find((b) => b.coin === coin);
    return bal ? bal.amount : 0;
  };

  // Calculate estimated total USD value
  const totalUsdValue = coins.reduce((acc, coin) => {
    const amt = getBalanceAmount(coin);
    const price = COIN_CONFIGS[coin].usdPrice;
    return acc + amt * price;
  }, 0);

  const handleOpenWithdraw = (coin: Coin) => {
    sound.playClickSound();
    setWithdrawCoin(coin);
    setWithdrawAddress('');
    setWithdrawStatus(null);
  };

  const handleSimulateWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAddress.trim()) return;

    sound.playClickSound();
    setWithdrawStatus('processing');
    setTimeout(() => {
      setWithdrawStatus('success');
      sound.playCoinSound();
    }, 800);
  };

  return (
    <div className="space-y-4">
      {/* Portfolio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#111722] border border-slate-800 rounded-2xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Total Portfolio Value (Estimated)</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight">
              ${totalUsdValue.toFixed(4)} <span className="text-xs font-sans text-slate-400">USD</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playClickSound();
              onRefresh();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Refresh balances"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 4 Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {coins.map((coin) => {
          const config = COIN_CONFIGS[coin];
          const amount = getBalanceAmount(coin);
          const usdEstimate = (amount * config.usdPrice).toFixed(4);

          return (
            <div
              key={coin}
              className="bg-[#111722] border border-slate-800 hover:border-slate-750 rounded-2xl p-4.5 transition-all shadow-sm flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CryptoIcon coin={coin} size={28} />
                    <div>
                      <span className="text-sm font-bold text-white tracking-tight">{config.name}</span>
                      <span className="text-xs text-slate-400 block -mt-0.5">{config.symbol}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectCoin(coin)}
                    className="text-[11px] font-medium text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    Claim →
                  </button>
                </div>

                <div className="space-y-0.5">
                  <div className="text-xs text-slate-400">Available Balance</div>
                  <div className="text-lg font-mono font-bold text-white tracking-tight truncate">
                    {amount.toFixed(10)}
                  </div>
                  <div className="text-xs text-slate-400">
                    ≈ ${usdEstimate} USD
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{config.unitLabel}</span>
                <button
                  type="button"
                  onClick={() => handleOpenWithdraw(coin)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-800 transition-colors"
                >
                  <span>Withdraw</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-amber-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulated Withdrawal Modal */}
      {withdrawCoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#0F141E] border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-200">
            <button
              onClick={() => setWithdrawCoin(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <CryptoIcon coin={withdrawCoin} size={32} />
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Withdraw {COIN_CONFIGS[withdrawCoin].name}
                </h3>
                <div className="text-xs text-slate-400">
                  Available: {getBalanceAmount(withdrawCoin).toFixed(10)} {withdrawCoin}
                </div>
              </div>
            </div>

            {withdrawStatus === 'success' ? (
              <div className="space-y-4 py-3 text-center animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Withdrawal Request Queued!</h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                    Payout request has been submitted to the blockchain batch processor for {withdrawCoin}.
                  </p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-left text-xs font-mono space-y-1 text-slate-400">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">Batch TX ID:</div>
                  <div className="truncate text-amber-300">
                    0x7f2a...{Math.random().toString(16).substring(2, 10)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWithdrawCoin(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSimulateWithdraw} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {withdrawCoin} Destination Address
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder={`Enter your ${withdrawCoin} wallet address`}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Amount to Withdraw</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={getBalanceAmount(withdrawCoin).toFixed(10)}
                      className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                      {withdrawCoin}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Network Fee:</span>
                    <span className="text-slate-300 font-mono">0.00000000 {withdrawCoin} (Subsidized)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Settlement:</span>
                    <span className="text-slate-300">Direct / FaucetPay batch</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawCoin(null)}
                    className="flex-1 py-2.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawStatus === 'processing' || getBalanceAmount(withdrawCoin) <= 0}
                    className="flex-1 py-2.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl disabled:bg-slate-800 disabled:text-slate-500 transition-colors cursor-pointer"
                  >
                    {withdrawStatus === 'processing' ? 'Submitting...' : 'Confirm Withdrawal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
