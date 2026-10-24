import {
  User,
  Profile,
  Balance,
  Claim,
  ReferralClaim,
  AdminRole,
  AdminActivityLog,
  AdminAction,
  Coin,
  COIN_CONFIGS,
  COOLDOWN_SECONDS,
  REFERRAL_COMMISSION_RATE,
} from '../types.ts';
import { supabase, SUPABASE_URL } from './supabase.ts';

const STORAGE_KEY = 'faucetflow_postgres_db_v1';
const CURRENT_USER_KEY = 'faucetflow_current_user_id';

interface DatabaseState {
  users: User[];
  profiles: Profile[];
  balances: Balance[];
  claims: Claim[];
  referral_claims: ReferralClaim[];
  admin_roles: AdminRole[];
  admin_activity_logs: AdminActivityLog[];
  nextLogId: number;
}

// Generate standard UUID v4
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Initial seed matching the PostgreSQL schema
function createInitialDatabase(): DatabaseState {
  const adminId = 'a1111111-1111-4111-8111-111111111111';
  const refereeId = 'b2222222-2222-4222-8222-222222222222';
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
  const twoHoursAgo = new Date(now.getTime() - 7200000).toISOString();
  const threeHoursAgo = new Date(now.getTime() - 10800000).toISOString();

  const users: User[] = [
    {
      id: adminId,
      email: 'sunitarou375@gmail.com',
      created_at: threeHoursAgo,
    },
    {
      id: refereeId,
      email: 'crypto_partner@example.com',
      created_at: twoHoursAgo,
    },
  ];

  const profiles: Profile[] = [
    {
      id: adminId,
      username: 'sunita_admin',
      referrer_id: null,
      created_at: threeHoursAgo,
    },
    {
      id: refereeId,
      username: 'crypto_partner',
      referrer_id: adminId, // Referred by admin
      created_at: twoHoursAgo,
    },
  ];

  const balances: Balance[] = [
    // Admin balances (with initial funds from referee claims)
    { user_id: adminId, coin: 'BTC', amount: 0.00000008, updated_at: oneHourAgo },
    { user_id: adminId, coin: 'LTC', amount: 0.00000500, updated_at: oneHourAgo },
    { user_id: adminId, coin: 'DOGE', amount: 0.00004000, updated_at: oneHourAgo },
    { user_id: adminId, coin: 'USDT', amount: 0.00080000, updated_at: oneHourAgo },
    // Referee balances
    { user_id: refereeId, coin: 'BTC', amount: 0.00000004, updated_at: oneHourAgo },
    { user_id: refereeId, coin: 'LTC', amount: 0.00000300, updated_at: oneHourAgo },
    { user_id: refereeId, coin: 'DOGE', amount: 0.00002000, updated_at: oneHourAgo },
    { user_id: refereeId, coin: 'USDT', amount: 0.00040000, updated_at: oneHourAgo },
  ];

  const claims: Claim[] = [
    {
      id: generateUUID(),
      user_id: refereeId,
      coin: 'BTC',
      amount: 0.00000001,
      claimed_at: new Date(now.getTime() - 1800000).toISOString(),
    },
    {
      id: generateUUID(),
      user_id: refereeId,
      coin: 'USDT',
      amount: 0.00010000,
      claimed_at: new Date(now.getTime() - 1200000).toISOString(),
    },
    {
      id: generateUUID(),
      user_id: adminId,
      coin: 'DOGE',
      amount: 0.00001000,
      claimed_at: new Date(now.getTime() - 300000).toISOString(), // 5 mins ago
    },
  ];

  const referral_claims: ReferralClaim[] = [
    {
      id: generateUUID(),
      referrer_id: adminId,
      referee_id: refereeId,
      coin: 'BTC',
      amount: 0.000000001, // 10%
      claimed_at: new Date(now.getTime() - 1800000).toISOString(),
    },
    {
      id: generateUUID(),
      referrer_id: adminId,
      referee_id: refereeId,
      coin: 'USDT',
      amount: 0.00001000, // 10%
      claimed_at: new Date(now.getTime() - 1200000).toISOString(),
    },
  ];

  const admin_roles: AdminRole[] = [
    {
      user_id: adminId,
      created_at: threeHoursAgo,
    },
  ];

  const admin_activity_logs: AdminActivityLog[] = [
    {
      id: 1,
      actor_user_id: adminId,
      action: 'dashboard_view',
      details: { client: 'FaucetFlow Web', ip_mock: '127.0.0.1' },
      created_at: threeHoursAgo,
    },
    {
      id: 2,
      actor_user_id: adminId,
      action: 'data_refresh',
      details: { reason: 'Initial database boot' },
      created_at: twoHoursAgo,
    },
  ];

  return {
    users,
    profiles,
    balances,
    claims,
    referral_claims,
    admin_roles,
    admin_activity_logs,
    nextLogId: 3,
  };
}

class FaucetDatabase {
  private state: DatabaseState;
  private currentUserId: string;
  private listeners: Set<() => void> = new Set();
  // Simulated PostgreSQL advisory lock in memory
  private lockRegistry: Set<string> = new Set();

  constructor() {
    this.state = this.loadState();
    this.currentUserId = this.loadCurrentUserId();
  }

  private loadState(): DatabaseState {
    if (typeof window === 'undefined') return createInitialDatabase();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved state:', e);
    }
    const initial = createInitialDatabase();
    this.saveState(initial);
    return initial;
  }

  private saveState(state: DatabaseState) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to persist state:', e);
    }
  }

  private loadCurrentUserId(): string {
    if (typeof window === 'undefined') return 'a1111111-1111-4111-8111-111111111111';
    try {
      const saved = localStorage.getItem(CURRENT_USER_KEY);
      if (saved && this.state.users.some((u) => u.id === saved)) {
        return saved;
      }
    } catch {
      // Fallback
    }
    const defaultUser = this.state.users[0]?.id || 'a1111111-1111-4111-8111-111111111111';
    this.setCurrentUserId(defaultUser);
    return defaultUser;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.saveState(this.state);
    this.listeners.forEach((fn) => fn());
  }

  // --- Session / Current User Simulation (SET LOCAL app.current_user_id) ---
  public current_user_id(): string | null {
    return this.currentUserId || null;
  }

  public setCurrentUserId(userId: string) {
    this.currentUserId = userId;
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_KEY, userId);
    }
    this.notify();
  }

  public getCurrentUser(): User | null {
    return this.state.users.find((u) => u.id === this.currentUserId) || null;
  }

  public getCurrentProfile(): Profile | null {
    return this.state.profiles.find((p) => p.id === this.currentUserId) || null;
  }

  public getAllUsers(): User[] {
    return [...this.state.users];
  }

  // --- Admin check (is_admin()) ---
  public is_admin(): boolean {
    const uid = this.current_user_id();
    if (!uid) return false;
    return this.isUserAdmin(uid);
  }

  public isUserAdmin(userId: string): boolean {
    return this.state.admin_roles.some((ar) => ar.user_id === userId);
  }

  // --- Trigger simulation: handle_new_user() ---
  public createUser(email: string, username?: string, referrerId?: string | null): User {
    // Check if email already exists
    const existing = this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error(`User with email "${email}" already exists.`);
    }

    const newUser: User = {
      id: generateUUID(),
      email: email.trim(),
      created_at: new Date().toISOString(),
    };

    this.state.users.push(newUser);

    // Trigger logic: handle_new_user()
    // 1. insert into profiles
    const cleanUsername = username?.trim() || email.split('@')[0];
    const validReferrerId =
      referrerId && this.state.users.some((u) => u.id === referrerId) ? referrerId : null;

    const newProfile: Profile = {
      id: newUser.id,
      username: cleanUsername,
      referrer_id: validReferrerId,
      created_at: new Date().toISOString(),
    };
    this.state.profiles.push(newProfile);

    // 2. insert into balances (BTC: 0, LTC: 0, DOGE: 0, USDT: 0)
    const coins: Coin[] = ['BTC', 'LTC', 'DOGE', 'USDT'];
    const nowIso = new Date().toISOString();
    coins.forEach((coin) => {
      this.state.balances.push({
        user_id: newUser.id,
        coin,
        amount: 0,
        updated_at: nowIso,
      });
    });

    this.notify();
    this.syncUserToSupabase(newUser, newProfile).catch(() => {});
    return newUser;
  }

  // --- Balances query (RLS: Owner or Admin) ---
  public getBalances(targetUserId?: string): Balance[] {
    const uid = this.current_user_id();
    const queryId = targetUserId || uid;
    if (!queryId) return [];

    // RLS: Viewable by owner or admin
    if (queryId !== uid && !this.is_admin()) {
      throw new Error('Permission denied: balances are viewable by owner or admin only.');
    }

    return this.state.balances.filter((b) => b.user_id === queryId);
  }

  // --- Claims query (RLS: Owner or Admin) ---
  public getClaims(targetUserId?: string): Claim[] {
    const uid = this.current_user_id();
    const queryId = targetUserId || uid;
    if (!queryId) return [];

    if (queryId !== uid && !this.is_admin()) {
      throw new Error('Permission denied: claims are viewable by owner or admin only.');
    }

    return this.state.claims
      .filter((c) => c.user_id === queryId)
      .sort((a, b) => new Date(b.claimed_at).getTime() - new Date(a.claimed_at).getTime());
  }

  // --- Referral Claims query (RLS: Referrer or Referee or Admin) ---
  public getReferralClaims(targetUserId?: string): ReferralClaim[] {
    const uid = this.current_user_id();
    const queryId = targetUserId || uid;
    if (!queryId) return [];

    if (queryId !== uid && !this.is_admin()) {
      throw new Error('Permission denied: referral claims are viewable by referrer, referee, or admin.');
    }

    return this.state.referral_claims
      .filter((rc) => rc.referrer_id === queryId || rc.referee_id === queryId)
      .sort((a, b) => new Date(b.claimed_at).getTime() - new Date(a.claimed_at).getTime());
  }

  // --- Cooldown calculation for coin ---
  public getCooldownRemaining(coin: Coin, targetUserId?: string): {
    secondsRemaining: number;
    canClaim: boolean;
    lastClaimAt: string | null;
  } {
    const uid = targetUserId || this.current_user_id();
    if (!uid) return { secondsRemaining: 0, canClaim: false, lastClaimAt: null };

    const userCoinClaims = this.state.claims.filter(
      (c) => c.user_id === uid && c.coin === coin
    );

    if (userCoinClaims.length === 0) {
      return { secondsRemaining: 0, canClaim: true, lastClaimAt: null };
    }

    // Find max(claimed_at)
    let latestTime = 0;
    let latestClaimIso: string | null = null;
    userCoinClaims.forEach((c) => {
      const t = new Date(c.claimed_at).getTime();
      if (t > latestTime) {
        latestTime = t;
        latestClaimIso = c.claimed_at;
      }
    });

    const elapsedSeconds = (Date.now() - latestTime) / 1000;
    const remaining = Math.max(0, Math.ceil(COOLDOWN_SECONDS - elapsedSeconds));

    return {
      secondsRemaining: remaining,
      canClaim: remaining === 0,
      lastClaimAt: latestClaimIso,
    };
  }

  // --- PostgreSQL RPC: claim_reward(p_coin) ---
  public claim_reward(p_coin: Coin): {
    coin: Coin;
    amount: number;
    claimed_at: string;
    referral_bonus?: number;
    referrer_id?: string | null;
  } {
    const uid = this.current_user_id();
    if (!uid) {
      throw new Error('User not authenticated.');
    }

    if (!['BTC', 'LTC', 'DOGE', 'USDT'].includes(p_coin)) {
      throw new Error('Unsupported coin.');
    }

    // Advisory lock simulation: pg_advisory_xact_lock(hashtextextended(uid::text || ':' || p_coin, 0))
    const lockKey = `${uid}:${p_coin}`;
    if (this.lockRegistry.has(lockKey)) {
      throw new Error('A claim transaction is currently in progress for this coin.');
    }
    this.lockRegistry.add(lockKey);

    try {
      // Cooldown verification:
      // select max(claimed_at) into last_claim from claims where user_id = uid and coin = p_coin;
      const cooldown = this.getCooldownRemaining(p_coin, uid);
      if (!cooldown.canClaim) {
        throw new Error(
          `Please wait before making another claim for this coin. (${cooldown.secondsRemaining}s remaining)`
        );
      }

      // Exact reward specification:
      // BTC: 0.00000001
      // LTC: 0.00000100
      // DOGE: 0.00001000
      // USDT: 0.00010000
      const reward = COIN_CONFIGS[p_coin].reward;
      const nowIso = new Date().toISOString();

      // Payout to user balance:
      // insert into balances ... on conflict do update set amount = balances.amount + excluded.amount
      let userBalance = this.state.balances.find((b) => b.user_id === uid && b.coin === p_coin);
      if (userBalance) {
        userBalance.amount = Number((userBalance.amount + reward).toFixed(12));
        userBalance.updated_at = nowIso;
      } else {
        userBalance = {
          user_id: uid,
          coin: p_coin,
          amount: reward,
          updated_at: nowIso,
        };
        this.state.balances.push(userBalance);
      }

      // Ledger entry: insert into claims(user_id, coin, amount) values(...)
      const newClaim: Claim = {
        id: generateUUID(),
        user_id: uid,
        coin: p_coin,
        amount: reward,
        claimed_at: nowIso,
      };
      this.state.claims.push(newClaim);

      // 10% Referral Commission Payout:
      // select referrer_id into ref_id from profiles where id = uid;
      let refBonus: number | undefined = undefined;
      let referrerId: string | null = null;
      let newRefClaim: ReferralClaim | undefined = undefined;
      let referrerBalance: Balance | undefined = undefined;

      const profile = this.state.profiles.find((p) => p.id === uid);
      if (profile && profile.referrer_id && profile.referrer_id !== uid) {
        referrerId = profile.referrer_id;
        // round(reward * 0.10, 12)
        refBonus = Number((reward * REFERRAL_COMMISSION_RATE).toFixed(12));

        if (refBonus > 0) {
          // Payout to referrer balance
          referrerBalance = this.state.balances.find(
            (b) => b.user_id === referrerId && b.coin === p_coin
          );
          if (referrerBalance) {
            referrerBalance.amount = Number((referrerBalance.amount + refBonus).toFixed(12));
            referrerBalance.updated_at = nowIso;
          } else {
            referrerBalance = {
              user_id: referrerId,
              coin: p_coin,
              amount: refBonus,
              updated_at: nowIso,
            };
            this.state.balances.push(referrerBalance);
          }

          // Ledger entry: insert into referral_claims(referrer_id, referee_id, coin, amount)
          newRefClaim = {
            id: generateUUID(),
            referrer_id: referrerId,
            referee_id: uid,
            coin: p_coin,
            amount: refBonus,
            claimed_at: nowIso,
          };
          this.state.referral_claims.push(newRefClaim);
        }
      }

      this.notify();
      this.syncClaimToSupabase(newClaim, userBalance, newRefClaim, referrerBalance).catch(() => {});

      return {
        coin: p_coin,
        amount: reward,
        claimed_at: nowIso,
        referral_bonus: refBonus,
        referrer_id: referrerId,
      };
    } finally {
      this.lockRegistry.delete(lockKey);
    }
  }

  // --- Admin List Users Function: admin_list_users() ---
  public admin_list_users(): Array<{
    id: string;
    email: string;
    username: string | null;
    created_at: string;
    referrer_email?: string | null;
    totalClaimsCount: number;
  }> {
    if (!this.current_user_id() || !this.is_admin()) {
      throw new Error('Administrator access required. (42501)');
    }

    return this.state.users.map((u) => {
      const prof = this.state.profiles.find((p) => p.id === u.id);
      const referrer = prof?.referrer_id
        ? this.state.users.find((ref) => ref.id === prof.referrer_id)
        : null;
      const claimsCount = this.state.claims.filter((c) => c.user_id === u.id).length;

      return {
        id: u.id,
        email: u.email,
        username: prof?.username || null,
        created_at: u.created_at,
        referrer_email: referrer?.email || null,
        totalClaimsCount: claimsCount,
      };
    });
  }

  // --- Admin Activity Logging: admin_log_activity(p_action, p_details) ---
  public admin_log_activity(p_action: AdminAction, p_details: Record<string, unknown> = {}) {
    const uid = this.current_user_id();
    if (!uid || !this.is_admin()) {
      throw new Error('Administrator access required. (42501)');
    }

    const validActions: AdminAction[] = [
      'dashboard_view',
      'users_view',
      'claims_view',
      'activity_logs_view',
      'data_refresh',
    ];

    if (!validActions.includes(p_action)) {
      throw new Error('Unsupported activity action. (22023)');
    }

    const newLog: AdminActivityLog = {
      id: this.state.nextLogId++,
      actor_user_id: uid,
      action: p_action,
      details: p_details,
      created_at: new Date().toISOString(),
    };

    this.state.admin_activity_logs.unshift(newLog);
    // Keep max 200 logs
    if (this.state.admin_activity_logs.length > 200) {
      this.state.admin_activity_logs = this.state.admin_activity_logs.slice(0, 200);
    }

    this.notify();
  }

  // --- Admin List Activity Logs: admin_list_activity_logs() ---
  public admin_list_activity_logs(): AdminActivityLog[] {
    if (!this.current_user_id() || !this.is_admin()) {
      throw new Error('Administrator access required. (42501)');
    }

    return this.state.admin_activity_logs.map((log) => {
      const user = this.state.users.find((u) => u.id === log.actor_user_id);
      return {
        ...log,
        actor_email: user?.email || 'Unknown',
      };
    });
  }

  // --- Platform-Wide Stats (for Admin & Overview) ---
  public getPlatformStats() {
    const totalUsers = this.state.users.length;
    const totalClaims = this.state.claims.length;
    const totalReferralClaims = this.state.referral_claims.length;

    const payoutsByCoin: Record<Coin, { totalClaimed: number; totalReferrals: number }> = {
      BTC: { totalClaimed: 0, totalReferrals: 0 },
      LTC: { totalClaimed: 0, totalReferrals: 0 },
      DOGE: { totalClaimed: 0, totalReferrals: 0 },
      USDT: { totalClaimed: 0, totalReferrals: 0 },
    };

    this.state.claims.forEach((c) => {
      if (payoutsByCoin[c.coin]) {
        payoutsByCoin[c.coin].totalClaimed += c.amount;
      }
    });

    this.state.referral_claims.forEach((rc) => {
      if (payoutsByCoin[rc.coin]) {
        payoutsByCoin[rc.coin].totalReferrals += rc.amount;
      }
    });

    return {
      totalUsers,
      totalClaims,
      totalReferralClaims,
      payoutsByCoin,
    };
  }

  // --- Supabase Synchronization (https://hxarvxnhhelkzyiucyng.supabase.co) ---
  public async syncClaimToSupabase(claim: Claim, userBalance?: Balance, refClaim?: ReferralClaim, refBalance?: Balance) {
    try {
      // 1. Insert claim into Supabase claims table
      await supabase.from('claims').insert({
        id: claim.id,
        user_id: claim.user_id,
        coin: claim.coin,
        amount: claim.amount,
        claimed_at: claim.claimed_at,
      });

      // 2. Upsert user balance
      if (userBalance) {
        await supabase.from('balances').upsert({
          user_id: userBalance.user_id,
          coin: userBalance.coin,
          amount: userBalance.amount,
          updated_at: userBalance.updated_at,
        });
      }

      // 3. Insert referral claim
      if (refClaim) {
        await supabase.from('referral_claims').insert({
          id: refClaim.id,
          referrer_id: refClaim.referrer_id,
          referee_id: refClaim.referee_id,
          coin: refClaim.coin,
          amount: refClaim.amount,
          claimed_at: refClaim.claimed_at,
        });
      }

      // 4. Upsert referrer balance
      if (refBalance) {
        await supabase.from('balances').upsert({
          user_id: refBalance.user_id,
          coin: refBalance.coin,
          amount: refBalance.amount,
          updated_at: refBalance.updated_at,
        });
      }
    } catch (e) {
      console.warn('Supabase background sync skipped (table may require schema execution):', e);
    }
  }

  public async syncUserToSupabase(user: User, profile: Profile) {
    try {
      await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      });

      await supabase.from('profiles').upsert({
        id: profile.id,
        username: profile.username,
        referrer_id: profile.referrer_id,
        created_at: profile.created_at,
      });

      const initialCoins: Coin[] = ['BTC', 'LTC', 'DOGE', 'USDT'];
      for (const coin of initialCoins) {
        await supabase.from('balances').upsert({
          user_id: user.id,
          coin,
          amount: 0,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Supabase user sync error:', e);
    }
  }

  public async syncAllToSupabase(): Promise<{ success: boolean; message: string }> {
    try {
      for (const user of this.state.users) {
        const prof = this.state.profiles.find((p) => p.id === user.id);
        if (prof) {
          await this.syncUserToSupabase(user, prof);
        }
      }

      for (const b of this.state.balances) {
        await supabase.from('balances').upsert({
          user_id: b.user_id,
          coin: b.coin,
          amount: b.amount,
          updated_at: b.updated_at,
        });
      }

      for (const c of this.state.claims) {
        await supabase.from('claims').upsert({
          id: c.id,
          user_id: c.user_id,
          coin: c.coin,
          amount: c.amount,
          claimed_at: c.claimed_at,
        });
      }

      for (const rc of this.state.referral_claims) {
        await supabase.from('referral_claims').upsert({
          id: rc.id,
          referrer_id: rc.referrer_id,
          referee_id: rc.referee_id,
          coin: rc.coin,
          amount: rc.amount,
          claimed_at: rc.claimed_at,
        });
      }

      return { success: true, message: 'All local data synced with Supabase successfully!' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      return { success: false, message: msg };
    }
  }

  // --- Database Reset & Seeding for testing ---
  public resetToFactory() {
    this.state = createInitialDatabase();
    this.currentUserId = this.state.users[0].id;
    this.notify();
  }
}

export const db = new FaucetDatabase();
