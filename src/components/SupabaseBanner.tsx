import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { checkSupabaseConnection, SupabaseHealth, SUPABASE_URL } from '../lib/supabase.ts';
import { db } from '../lib/database.ts';
import { sound } from '../lib/sound.ts';

const SUPABASE_PROJECT_ID = 'hxarvxnhhelkzyiucyng';
const SUPABASE_SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql/new`;

export const SupabaseBanner: React.FC = () => {
  const [health, setHealth] = useState<SupabaseHealth | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const runHealthCheck = async () => {
    setIsChecking(true);
    const res = await checkSupabaseConnection();
    setHealth(res);
    setIsChecking(false);
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const handleSyncAll = async () => {
    sound.playClickSound();
    setIsSyncing(true);
    setSyncMessage(null);
    const result = await db.syncAllToSupabase();
    setSyncMessage(result.message);
    setIsSyncing(false);
    runHealthCheck();
  };

  const handleCopySql = () => {
    sound.playClickSound();
    const sqlElement = document.getElementById('postgres-ddl-script');
    const sqlText = sqlElement ? sqlElement.innerText : '';
    if (navigator.clipboard && sqlText) {
      navigator.clipboard.writeText(sqlText);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  return (
    <div className="bg-[#0E1524] border border-emerald-500/20 rounded-2xl p-4 shadow-lg text-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Supabase Connected</span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-sm sm:max-w-md">
              {SUPABASE_URL}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync to Supabase'}</span>
          </button>

          <a
            href={SUPABASE_SQL_EDITOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sound.playClickSound()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-200 font-semibold rounded-xl transition-colors"
          >
            <span>SQL Editor</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 flex items-center justify-between">
          <span>{syncMessage}</span>
          <button onClick={() => setSyncMessage(null)} className="text-emerald-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Expanded details view */}
      {isExpanded && (
        <div className="pt-3 border-t border-slate-800/80 space-y-3 text-slate-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
              <div className="text-slate-400 text-[11px]">Project Name</div>
              <div className="font-semibold text-white">sunitarou375-create&apos;s Project</div>
              <div className="text-slate-400 text-[11px] font-mono">ID: {SUPABASE_PROJECT_ID}</div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
              <div className="text-slate-400 text-[11px]">Schema Tables Status</div>
              {health?.hasTables ? (
                <div className="text-emerald-400 font-medium">
                  {health.tablesFound.length} / 6 Tables Available in Supabase
                </div>
              ) : (
                <div className="text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Schema DDL ready to execute in SQL editor</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Quick SQL Setup for your Supabase Project</span>
              <a
                href={SUPABASE_SQL_EDITOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:underline inline-flex items-center gap-1 text-[11px]"
              >
                <span>Open SQL Editor</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-400 text-[11px]">
              If you haven&apos;t run the table creation script in Supabase yet, open the SQL Editor link above,
              paste the DDL script from the &ldquo;Admin Console &gt; SQL Schema&rdquo; tab, and click &ldquo;Run&rdquo;.
              The app automatically mirrors all claims and balances locally and pushes to Supabase!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
