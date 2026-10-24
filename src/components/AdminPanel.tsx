import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Activity,
  Database,
  RefreshCw,
  Copy,
  Check,
  FileCode,
  AlertTriangle,
  ExternalLink,
  Link as LinkIcon,
  ArrowLeft,
} from 'lucide-react';
import { db } from '../lib/database.ts';
import { AdminActivityLog, SPONSOR_CLAIM_LINK } from '../types.ts';
import { sound } from '../lib/sound.ts';

const POSTGRESQL_SCHEMA_SQL = `-- ====================================================================
-- FaucetFlow Complete Standalone PostgreSQL Schema
-- Compatible with standard PostgreSQL 14+ / 15+ / 16+
-- ====================================================================

-- 1. Enable Cryptographic Extensions
create extension if not exists pgcrypto;

-- 2. Core Users Table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

-- 3. Session / Current User Helper Function
-- SET LOCAL app.current_user_id = 'user-uuid-here';
create or replace function public.current_user_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

-- 4. User Profiles Table
create table if not exists public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  username text unique,
  referrer_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 5. Multi-Coin Balances Table (BTC, LTC, DOGE, USDT)
create table if not exists public.balances (
  user_id uuid not null references public.users(id) on delete cascade,
  coin text not null check (coin in ('BTC','LTC','DOGE','USDT')),
  amount numeric(28,12) not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, coin)
);

-- 6. Reward Claims Ledger Table
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  coin text not null check (coin in ('BTC','LTC','DOGE','USDT')),
  amount numeric(28,12) not null check (amount > 0),
  claimed_at timestamptz not null default now()
);

-- 6b. 10% Referral Claims Ledger Table
create table if not exists public.referral_claims (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referee_id uuid not null references public.users(id) on delete cascade,
  coin text not null check (coin in ('BTC','LTC','DOGE','USDT')),
  amount numeric(28,12) not null check (amount > 0),
  claimed_at timestamptz not null default now()
);

-- 7. Admin Roles & Access Control
create table if not exists public.admin_roles (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from public.admin_roles ar where ar.user_id = public.current_user_id()
  );
$$;

-- 8. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.claims enable row level security;
alter table public.referral_claims enable row level security;
alter table public.admin_roles enable row level security;

-- 9. Read Policies (Owner or Admin)
create policy "profiles are viewable by owner or admin" on public.profiles
for select using (public.current_user_id() = id or public.is_admin());

create policy "balances are viewable by owner or admin" on public.balances
for select using (public.current_user_id() = user_id or public.is_admin());

create policy "claims are viewable by owner or admin" on public.claims
for select using (public.current_user_id() = user_id or public.is_admin());

create policy "referral claims are viewable by referrer or admin" on public.referral_claims
for select using (public.current_user_id() = referrer_id or public.current_user_id() = referee_id or public.is_admin());

create policy "admins can read their own role" on public.admin_roles
for select using (public.current_user_id() = user_id);

-- 10. Trigger: Automatically initialize profile & balances on user creation
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, username, referrer_id)
  values (new.id, null, null)
  on conflict (id) do nothing;

  insert into public.balances (user_id, coin, amount)
  values
    (new.id, 'BTC', 0),
    (new.id, 'LTC', 0),
    (new.id, 'DOGE', 0),
    (new.id, 'USDT', 0)
  on conflict (user_id, coin) do nothing;
  
  return new;
end;
$$;

create trigger on_user_created
after insert on public.users
for each row execute procedure public.handle_new_user();

-- 11. Core Faucet Claim RPC Function (with 60s Cooldown & 10% Referral Bonus)
create or replace function public.claim_reward(p_coin text)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare
  uid uuid := public.current_user_id();
  reward numeric(28,12);
  last_claim timestamptz;
  ref_id uuid;
  ref_bonus numeric(28,12);
begin
  if uid is null then
    raise exception 'User not authenticated.';
  end if;
  if p_coin not in ('BTC','LTC','DOGE','USDT') then
    raise exception 'Unsupported coin.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || p_coin, 0));

  select max(claimed_at) into last_claim
  from public.claims where user_id = uid and coin = p_coin;

  if last_claim is not null and last_claim > now() - interval '60 seconds' then
    raise exception 'Please wait before making another claim for this coin.';
  end if;

  reward := case p_coin
    when 'BTC' then 0.00000001
    when 'LTC' then 0.00000100
    when 'DOGE' then 0.00001000
    when 'USDT' then 0.00010000
  end;

  insert into public.balances(user_id, coin, amount)
  values(uid, p_coin, reward)
  on conflict(user_id, coin)
  do update set amount = public.balances.amount + excluded.amount, updated_at = now();

  insert into public.claims(user_id, coin, amount) values(uid, p_coin, reward);

  -- 10% Referral Commission Payout
  select referrer_id into ref_id from public.profiles where id = uid;
  if ref_id is not null and ref_id <> uid then
    ref_bonus := round(reward * 0.10, 12);
    if ref_bonus > 0 then
      insert into public.balances(user_id, coin, amount)
      values(ref_id, p_coin, ref_bonus)
      on conflict(user_id, coin)
      do update set amount = public.balances.amount + excluded.amount, updated_at = now();

      insert into public.referral_claims(referrer_id, referee_id, coin, amount)
      values(ref_id, uid, p_coin, ref_bonus);
    end if;
  end if;

  return jsonb_build_object('coin', p_coin, 'amount', reward, 'claimed_at', now());
end;
$$;`;

interface AdminPanelProps {
  onExit?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'stats' | 'schema'>('users');
  const [userList, setUserList] = useState<ReturnType<typeof db.admin_list_users>>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof db.getPlatformStats> | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [copiedClaimLink, setCopiedClaimLink] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = db.is_admin();

  const loadData = () => {
    try {
      if (db.is_admin()) {
        const users = db.admin_list_users();
        const logs = db.admin_list_activity_logs();
        const platformStats = db.getPlatformStats();
        setUserList(users);
        setActivityLogs(logs);
        setStats(platformStats);
        setError(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Admin access error');
    }
  };

  useEffect(() => {
    loadData();
    if (isAdmin) {
      try {
        db.admin_log_activity('dashboard_view', { tab: activeTab });
      } catch {
        // Ignored
      }
    }
  }, [activeTab, isAdmin]);

  const handleCopyClaimLink = () => {
    sound.playClickSound();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(SPONSOR_CLAIM_LINK);
      setCopiedClaimLink(true);
      setTimeout(() => setCopiedClaimLink(false), 2000);
    }
  };

  const handleCopySql = () => {
    sound.playClickSound();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(POSTGRESQL_SCHEMA_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  const handleRefresh = () => {
    sound.playClickSound();
    try {
      db.admin_log_activity('data_refresh', { triggeredBy: 'manual_button' });
    } catch {
      // Ignored
    }
    loadData();
  };

  if (!isAdmin) {
    return (
      <div className="bg-[#111722] border border-red-500/20 rounded-3xl p-8 sm:p-10 text-center space-y-4 max-w-lg mx-auto shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight">Isolated Admin Portal Access Required</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          This administration console is strictly partitioned. Only authenticated administrators with active records in <code className="text-slate-300">public.admin_roles</code> can access this portal.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-3 justify-center">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              ← Return to Faucet
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const adminUser = db.getAllUsers().find((u) => u.email === 'sunitarou375@gmail.com');
              if (adminUser) {
                db.setCurrentUserId(adminUser.id);
                sound.playCoinSound();
                loadData();
              }
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
          >
            Authenticate as Admin (sunitarou375@gmail.com)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Panel Header */}
      <div className="bg-[#111722] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              type="button"
              onClick={() => {
                sound.playClickSound();
                onExit();
              }}
              className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0"
              title="Return to Faucet App"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Exit Portal</span>
            </button>
          )}
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              FaucetFlow Administration Portal
              <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                PostgreSQL RLS Active
              </span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Security Definer</span>
              <span aria-hidden="true">·</span>
              <span>Audit Logging Active</span>
              <span aria-hidden="true">·</span>
              <span>10% Referral Ledger</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub Navigation Tabs */}
          <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => {
                sound.playClickSound();
                setActiveTab('users');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users ({userList.length})</span>
            </button>

            <button
              onClick={() => {
                sound.playClickSound();
                setActiveTab('logs');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'logs'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Logs ({activityLogs.length})</span>
            </button>

            <button
              onClick={() => {
                sound.playClickSound();
                setActiveTab('stats');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Stats</span>
            </button>

            <button
              onClick={() => {
                sound.playClickSound();
                setActiveTab('schema');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'schema'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>SQL Schema</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Refresh database state"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Faucet Claim Destination Link Card in Admin Console */}
      <div className="bg-[#111722] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5 sm:mt-0">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Active Faucet Claim Destination Link
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                Live on Claim Button
              </span>
            </div>
            <div className="font-mono text-xs text-amber-300 break-all select-all font-medium">
              {SPONSOR_CLAIM_LINK}
            </div>
            <p className="text-[11px] text-slate-400">
              Users are routed to this link in a new tab when claiming cryptocurrency rewards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyClaimLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {copiedClaimLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedClaimLink ? 'Copied' : 'Copy Link'}</span>
          </button>

          <a
            href={SPONSOR_CLAIM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sound.playClickSound()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <span>Open & Test Link</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab: Users Management (admin_list_users) */}
      {activeTab === 'users' && (
        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight">Registered Users Ledger</h3>
            <span className="text-xs text-slate-400">admin_list_users() RPC</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-2.5 pl-2">Email</th>
                  <th className="pb-2.5">Username</th>
                  <th className="pb-2.5">User UUID</th>
                  <th className="pb-2.5">Referrer</th>
                  <th className="pb-2.5">Total Claims</th>
                  <th className="pb-2.5 pr-2 text-right">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {userList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 pl-2 font-sans font-medium text-white">{u.email}</td>
                    <td className="py-2.5 font-sans text-slate-300">@{u.username || 'n/a'}</td>
                    <td className="py-2.5 text-slate-400 truncate max-w-[120px]">{u.id.substring(0, 8)}...</td>
                    <td className="py-2.5 font-sans text-slate-400">
                      {u.referrer_email ? u.referrer_email : <span className="text-slate-600">None</span>}
                    </td>
                    <td className="py-2.5 text-amber-400 font-semibold">{u.totalClaimsCount}</td>
                    <td className="py-2.5 pr-2 text-right text-slate-400 text-[11px] font-sans">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Activity Logs (admin_list_activity_logs) */}
      {activeTab === 'logs' && (
        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight">Admin Security Audit Log</h3>
            <span className="text-xs text-slate-400">public.admin_activity_logs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-2.5 pl-2">Log ID</th>
                  <th className="pb-2.5">Action</th>
                  <th className="pb-2.5">Actor</th>
                  <th className="pb-2.5">Details (JSONB)</th>
                  <th className="pb-2.5 pr-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 pl-2 text-slate-400">#{log.id}</td>
                    <td className="py-2.5 font-sans">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700/60">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 font-sans text-slate-300">{log.actor_email}</td>
                    <td className="py-2.5 text-slate-400 truncate max-w-[280px]">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="py-2.5 pr-2 text-right text-slate-400 text-[11px] font-sans">
                      {new Date(log.created_at).toLocaleTimeString([], {
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
        </div>
      )}

      {/* Tab: Platform Stats */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4.5 space-y-1">
              <span className="text-xs text-slate-400">Total Registered Users</span>
              <div className="text-2xl font-bold font-mono text-white">{stats.totalUsers}</div>
            </div>
            <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4.5 space-y-1">
              <span className="text-xs text-slate-400">Total Faucet Claims</span>
              <div className="text-2xl font-bold font-mono text-amber-400">{stats.totalClaims}</div>
            </div>
            <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4.5 space-y-1">
              <span className="text-xs text-slate-400">Total Referral Payouts</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {stats.totalReferralClaims}
              </div>
            </div>
          </div>

          <div className="bg-[#111722] border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Cumulative Distribution by Asset</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {(['BTC', 'LTC', 'DOGE', 'USDT'] as const).map((coin) => {
                const item = stats.payoutsByCoin[coin];
                return (
                  <div
                    key={coin}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 font-mono"
                  >
                    <div className="flex justify-between font-sans text-slate-300 font-bold">
                      <span>{coin}</span>
                      <span className="text-amber-400">10% Referrals</span>
                    </div>
                    <div className="text-white text-sm">
                      Direct: {item.totalClaimed.toFixed(10)}
                    </div>
                    <div className="text-emerald-400 text-xs">
                      Bonus: +{item.totalReferrals.toFixed(10)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: PostgreSQL Schema Inspector */}
      {activeTab === 'schema' && (
        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Standalone PostgreSQL 14+ / 15+ / 16+ DDL
              </h3>
              <p className="text-xs text-slate-400">
                Production schema with triggers, advisory locks, and RLS policies
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://supabase.com/dashboard/project/hxarvxnhhelkzyiucyng/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold text-xs rounded-xl transition-colors"
              >
                <span>Run in Supabase</span>
              </a>

              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied SQL' : 'Copy DDL Script'}</span>
              </button>
            </div>
          </div>

          <pre
            id="postgres-ddl-script"
            className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl text-slate-300 text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed select-all"
          >
            {POSTGRESQL_SCHEMA_SQL}
          </pre>
        </div>
      )}
    </div>
  );
};
