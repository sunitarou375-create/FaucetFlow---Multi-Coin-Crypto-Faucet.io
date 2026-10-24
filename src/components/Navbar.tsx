import React, { useState } from 'react';
import {
  Droplets,
  ShieldCheck,
  User,
  ChevronDown,
  Plus,
  Coins,
  History,
  Users,
  Wallet,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { db } from '../lib/database.ts';
import { sound } from '../lib/sound.ts';
import { AuthModal } from './AuthModal.tsx';

interface NavbarProps {
  activeTab: 'faucet' | 'balances' | 'referrals' | 'ledger';
  onSelectTab: (tab: 'faucet' | 'balances' | 'referrals' | 'ledger') => void;
  onOpenAdmin: () => void;
  onUserChanged: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAdmin,
  onUserChanged,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');

  const currentUser = db.getCurrentUser();
  const currentProfile = db.getCurrentProfile();
  const allUsers = db.getAllUsers();
  const isAdmin = db.is_admin();

  const handleSwitchUser = (userId: string) => {
    sound.playClickSound();
    db.setCurrentUserId(userId);
    setShowUserDropdown(false);
    onUserChanged();
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      sound.playClickSound();
      const created = db.createUser(newEmail.trim(), newUsername.trim() || undefined);
      db.setCurrentUserId(created.id);
      setShowAddUserModal(false);
      setNewEmail('');
      setNewUsername('');
      sound.playCoinSound();
      onUserChanged();
    } catch (err: unknown) {
      sound.playErrorSound();
      alert(err instanceof Error ? err.message : 'Error creating user');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0E14]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                sound.playClickSound();
                onSelectTab('faucet');
              }}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="p-2 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-xl text-slate-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Droplets className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  FaucetFlow
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                    PRO
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 block -mt-0.5">
                  Multi-Coin Crypto Faucet
                </span>
              </div>
            </button>

            {/* Main Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => {
                  sound.playClickSound();
                  onSelectTab('faucet');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'faucet'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Faucet</span>
              </button>

              <button
                onClick={() => {
                  sound.playClickSound();
                  onSelectTab('balances');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'balances'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Balances</span>
              </button>

              <button
                onClick={() => {
                  sound.playClickSound();
                  onSelectTab('referrals');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'referrals'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Referral 10%</span>
              </button>

              <button
                onClick={() => {
                  sound.playClickSound();
                  onSelectTab('ledger');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'ledger'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Ledger</span>
              </button>
            </nav>
          </div>

          {/* Right Action: Sign In & Sign Up + User Profile */}
          <div className="relative flex items-center gap-2 sm:gap-2.5">
            {/* Dedicated Sign In Button */}
            <button
              type="button"
              onClick={() => {
                sound.playClickSound();
                setAuthModalMode('signin');
                setAuthModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer shadow-sm"
              title="Sign in to your account"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In</span>
            </button>

            {/* Dedicated Sign Up Button */}
            <button
              type="button"
              onClick={() => {
                sound.playClickSound();
                setAuthModalMode('signup');
                setAuthModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 rounded-xl shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
              title="Create a free FaucetFlow account"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>

            {/* User Profile Switcher */}
            <button
              type="button"
              onClick={() => {
                sound.playClickSound();
                setShowUserDropdown(!showUserDropdown);
              }}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl transition-all text-xs font-medium text-slate-200 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-[11px]">
                {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="truncate max-w-[140px] font-semibold text-white">
                  {currentProfile?.username ? `@${currentProfile.username}` : currentUser?.email}
                </div>
                <div className="text-[10px] text-slate-400">
                  {isAdmin ? 'Admin Role (RLS Owner)' : 'Standard Referee'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* User Switcher Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 top-12 w-64 bg-[#0F141E] border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in fade-in duration-100">
                <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                  Switch Active Session (app.current_user_id)
                </div>

                <div className="space-y-1 py-1 max-h-56 overflow-y-auto">
                  {allUsers.map((u) => {
                    const isSelected = u.id === currentUser?.id;
                    const userIsAdmin = db.isUserAdmin(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSwitchUser(u.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                          isSelected
                            ? 'bg-slate-800 text-white font-semibold'
                            : 'text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate text-xs">{u.email}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            UUID: {u.id.substring(0, 8)}...
                          </div>
                        </div>
                        {userIsAdmin && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Admin
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  {/* Distinct Open Admin Portal Button */}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClickSound();
                      setShowUserDropdown(false);
                      onOpenAdmin();
                    }}
                    className="w-full flex items-center justify-between p-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold rounded-xl transition-colors cursor-pointer text-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Open Admin Portal</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/20 rounded border border-amber-500/30">
                      Isolated
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playClickSound();
                      setShowUserDropdown(false);
                      setShowAddUserModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-medium rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New User</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80 text-xs">
          <button
            onClick={() => onSelectTab('faucet')}
            className={`px-2 py-1 rounded font-medium ${
              activeTab === 'faucet' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            Faucet
          </button>
          <button
            onClick={() => onSelectTab('balances')}
            className={`px-2 py-1 rounded font-medium ${
              activeTab === 'balances' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            Balances
          </button>
          <button
            onClick={() => onSelectTab('referrals')}
            className={`px-2 py-1 rounded font-medium ${
              activeTab === 'referrals' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            Referral
          </button>
          <button
            onClick={() => onSelectTab('ledger')}
            className={`px-2 py-1 rounded font-medium ${
              activeTab === 'ledger' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            Ledger
          </button>
        </div>
      </div>

      {/* Quick Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-[#0F141E] border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-200">
            <h3 className="text-base font-bold text-white mb-1">Create New Account</h3>
            <p className="text-xs text-slate-400 mb-4">
              This triggers <code className="text-slate-300">public.handle_new_user()</code> to create profile & balances.
            </p>

            <form onSubmit={handleCreateNewUser} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Username (optional)</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="crypto_user"
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Sign In / Sign Up Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={onUserChanged}
      />
    </header>
  );
};
