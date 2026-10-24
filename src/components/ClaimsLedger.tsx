import React, { useState } from 'react';
import { History, Download, Coins } from 'lucide-react';
import { Claim, Coin, COIN_CONFIGS } from '../types.ts';
import { CryptoIcon } from './CryptoIcon.tsx';
import { sound } from '../lib/sound.ts';

interface ClaimsLedgerProps {
  claims: Claim[];
}

export const ClaimsLedger: React.FC<ClaimsLedgerProps> = ({ claims }) => {
  const [filterCoin, setFilterCoin] = useState<Coin | 'ALL'>('ALL');

  const filteredClaims = claims.filter((c) =>
    filterCoin === 'ALL' ? true : c.coin === filterCoin
  );

  const handleExportCSV = () => {
    sound.playClickSound();
    if (claims.length === 0) return;

    const headers = ['Claim_ID', 'Coin', 'Amount', 'Claimed_At_UTC'];
    const rows = filteredClaims.map((c) => [
      c.id,
      c.coin,
      c.amount.toFixed(12),
      c.claimed_at,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `faucetflow_claims_${filterCoin.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#111722] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-amber-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Reward Claims Ledger</h3>
            <p className="text-xs text-slate-400">
              Query from <span className="font-mono text-slate-300">public.claims</span> (RLS: Owner or Admin)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Coin Filter Tabs */}
          <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            {(['ALL', 'BTC', 'LTC', 'DOGE', 'USDT'] as const).map((coin) => (
              <button
                key={coin}
                onClick={() => {
                  sound.playClickSound();
                  setFilterCoin(coin);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterCoin === coin
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {coin}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={claims.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      {filteredClaims.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-800/80 rounded-xl space-y-2">
          <Coins className="w-8 h-8 text-slate-600 mx-auto" />
          <p>No claims found for {filterCoin === 'ALL' ? 'any coin' : filterCoin}.</p>
          <p className="text-slate-400">Your claims will be recorded in this ledger with 12-decimal precision.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2.5 pl-2">Asset</th>
                <th className="pb-2.5">Claim ID</th>
                <th className="pb-2.5">Reward Amount</th>
                <th className="pb-2.5">USD Value</th>
                <th className="pb-2.5 pr-2 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono">
              {filteredClaims.map((claim) => {
                const config = COIN_CONFIGS[claim.coin];
                const usdVal = (claim.amount * config.usdPrice).toFixed(6);

                return (
                  <tr key={claim.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 pl-2 font-sans font-medium text-white">
                      <div className="flex items-center gap-2">
                        <CryptoIcon coin={claim.coin} size={18} />
                        <span>{claim.coin}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-slate-400 truncate max-w-[120px]" title={claim.id}>
                      {claim.id.substring(0, 8)}...
                    </td>
                    <td className="py-2.5 text-white font-semibold">
                      +{claim.amount.toFixed(10)} {claim.coin}
                    </td>
                    <td className="py-2.5 text-slate-400">
                      ≈ ${usdVal}
                    </td>
                    <td className="py-2.5 pr-2 text-right text-slate-400 text-[11px] font-sans">
                      {new Date(claim.claimed_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
