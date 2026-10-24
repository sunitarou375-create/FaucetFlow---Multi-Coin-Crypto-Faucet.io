export type Coin = 'BTC' | 'LTC' | 'DOGE' | 'USDT';

export interface User {
  id: string; // uuid
  email: string;
  created_at: string;
}

export interface Profile {
  id: string; // references users(id)
  username: string | null;
  referrer_id: string | null;
  created_at: string;
}

export interface Balance {
  user_id: string;
  coin: Coin;
  amount: number; // numeric(28,12)
  updated_at: string;
}

export interface Claim {
  id: string; // uuid
  user_id: string;
  coin: Coin;
  amount: number; // numeric(28,12)
  claimed_at: string;
}

export interface ReferralClaim {
  id: string; // uuid
  referrer_id: string;
  referee_id: string;
  coin: Coin;
  amount: number; // numeric(28,12)
  claimed_at: string;
}

export interface AdminRole {
  user_id: string;
  created_at: string;
}

export type AdminAction =
  | 'dashboard_view'
  | 'users_view'
  | 'claims_view'
  | 'activity_logs_view'
  | 'data_refresh';

export interface AdminActivityLog {
  id: number;
  actor_user_id: string;
  actor_email?: string;
  action: AdminAction;
  details: Record<string, unknown>;
  created_at: string;
}

export interface CoinConfig {
  coin: Coin;
  name: string;
  symbol: string;
  unitLabel: string;
  reward: number; // exact numeric reward
  rewardFormatted: string;
  usdPrice: number; // approximate reference price
  accentColor: string;
  bgLight: string;
  badgeColor: string;
  iconBg: string;
}

export const COIN_CONFIGS: Record<Coin, CoinConfig> = {
  BTC: {
    coin: 'BTC',
    name: 'Bitcoin',
    symbol: 'BTC',
    unitLabel: 'Satoshi (1 sat)',
    reward: 0.00000001,
    rewardFormatted: '0.00000001',
    usdPrice: 96500,
    accentColor: '#F7931A',
    bgLight: 'rgba(247, 147, 26, 0.1)',
    badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    iconBg: 'bg-amber-500/20 text-amber-400',
  },
  LTC: {
    coin: 'LTC',
    name: 'Litecoin',
    symbol: 'LTC',
    unitLabel: 'Litoshi (100 lit)',
    reward: 0.00000100,
    rewardFormatted: '0.00000100',
    usdPrice: 112,
    accentColor: '#345D9D',
    bgLight: 'rgba(52, 93, 157, 0.1)',
    badgeColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    iconBg: 'bg-blue-500/20 text-blue-400',
  },
  DOGE: {
    coin: 'DOGE',
    name: 'Dogecoin',
    symbol: 'DOGE',
    unitLabel: 'Doge units',
    reward: 0.00001000,
    rewardFormatted: '0.00001000',
    usdPrice: 0.22,
    accentColor: '#C2A633',
    bgLight: 'rgba(194, 166, 51, 0.1)',
    badgeColor: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    iconBg: 'bg-yellow-500/20 text-yellow-400',
  },
  USDT: {
    coin: 'USDT',
    name: 'Tether USD',
    symbol: 'USDT',
    unitLabel: 'Micro-USDT',
    reward: 0.00010000,
    rewardFormatted: '0.00010000',
    usdPrice: 1.0,
    accentColor: '#26A17B',
    bgLight: 'rgba(38, 161, 123, 0.1)',
    badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    iconBg: 'bg-emerald-500/20 text-emerald-400',
  },
};

export const SPONSOR_CLAIM_LINK = 'https://auctionr.org/4/7143e5a0ccc57b3e17ffe3af685588f2';
export const COOLDOWN_SECONDS = 60;
export const REFERRAL_COMMISSION_RATE = 0.10; // 10%
