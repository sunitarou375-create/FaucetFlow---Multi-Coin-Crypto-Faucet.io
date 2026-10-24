import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  (import.meta.env?.VITE_SUPABASE_URL as string) ||
  'https://hxarvxnhhelkzyiucyng.supabase.co';

export const SUPABASE_ANON_KEY =
  (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_K9n04-7KXyeoZ5pmzfvZuQ_GeBv_mgy';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface SupabaseHealth {
  connected: boolean;
  hasTables: boolean;
  tablesFound: string[];
  missingTables: string[];
  errorMessage?: string;
}

export async function checkSupabaseConnection(): Promise<SupabaseHealth> {
  const expectedTables = [
    'users',
    'profiles',
    'balances',
    'claims',
    'referral_claims',
    'admin_roles',
  ];
  const tablesFound: string[] = [];

  try {
    // Try pinging each table with limit(0)
    for (const table of expectedTables) {
      const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (!error) {
        tablesFound.push(table);
      } else if (error.code !== '42P01') {
        // 42P01 is table does not exist; if other error (e.g. RLS or empty), table exists!
        tablesFound.push(table);
      }
    }

    const missingTables = expectedTables.filter((t) => !tablesFound.includes(t));

    return {
      connected: true,
      hasTables: tablesFound.length > 0,
      tablesFound,
      missingTables,
    };
  } catch (err: unknown) {
    return {
      connected: false,
      hasTables: false,
      tablesFound: [],
      missingTables: expectedTables,
      errorMessage: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}
