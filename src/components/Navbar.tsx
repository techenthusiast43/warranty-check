import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Building2,
  Lock,
  Wallet,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Zap,
  LogOut,
  Users,
} from 'lucide-react';
import { useWeb3, DEV_ACCOUNTS } from '../contexts/Web3Context';
import { formatAddress } from '../utils/botChain';

interface NavbarProps {
  activeTab: 'home' | 'verify' | 'business' | 'admin';
  setActiveTab: (tab: 'home' | 'verify' | 'business' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const {
    activeAddress,
    isConnected,
    connectWallet,
    disconnectWallet,
    isAdmin,
    isAuthorizedSeller,
    isBotChain,
    chainId,
    switchToBotChain,
    simulatedAddress,
    setSimulatedAddress,
  } = useWeb3();

  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [devMenuOpen, setDevMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#080d1a]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition transform">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Warranty<span className="text-cyan-400">Check</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                BOT Chain
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Decentralized Trust Registry</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('verify')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'verify'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Verify Warranty</span>
          </button>

          <button
            onClick={() => setActiveTab('business')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'business'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Business Portal</span>
            {isAuthorizedSeller && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'admin'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Admin</span>
            {isAdmin && (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Admin
              </span>
            )}
          </button>
        </nav>

        {/* Right Section: Network & Wallet */}
        <div className="flex items-center gap-2.5">
          {/* Network Indicator / Switcher */}
          {isBotChain ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>BOT Testnet (968)</span>
            </div>
          ) : (
            <button
              onClick={switchToBotChain}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition"
              title="Click to switch to BOT Chain Testnet"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Switch to BOT (968)</span>
            </button>
          )}

          {/* Quick Dev Switcher Button */}
          <div className="relative">
            <button
              onClick={() => setDevMenuOpen(!devMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 text-xs transition"
              title="Quick Dev Role Switcher"
            >
              <Users className="w-4 h-4" />
            </button>

            {devMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0d1424] border border-cyan-500/30 rounded-2xl p-3 shadow-2xl z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Quick Role Switcher</span>
                  </div>
                  {simulatedAddress && (
                    <button
                      onClick={() => setSimulatedAddress(null)}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      Reset to Injected
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {DEV_ACCOUNTS.map((acc) => {
                    const isSelected =
                      activeAddress?.toLowerCase() === acc.address.toLowerCase();
                    return (
                      <button
                        key={acc.address}
                        onClick={() => {
                          setSimulatedAddress(acc.address);
                          setDevMenuOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                            : 'hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{acc.role}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatAddress(acc.address)}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Connect / Account Button */}
          {isConnected && activeAddress ? (
            <div className="relative">
              <button
                onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-mono hover:border-cyan-500/40 transition shadow-sm"
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>{formatAddress(activeAddress)}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {walletMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#0d1424] border border-slate-800 rounded-2xl p-3 shadow-2xl z-50 animate-fade-in text-xs space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Connected Address
                    </span>
                    <p className="font-mono text-slate-200 break-all select-all bg-slate-950 p-2 rounded-lg border border-slate-800">
                      {activeAddress}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400">
                    <span>Role:</span>
                    <span className="font-medium text-slate-200">
                      {isAdmin
                        ? 'Admin + Seller'
                        : isAuthorizedSeller
                        ? 'Authorized Merchant'
                        : 'Customer / Public'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <a
                      href={`https://scan.bohr.life/address/${activeAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                    >
                      <span>BOT Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      onClick={() => {
                        disconnectWallet();
                        setWalletMenuOpen(false);
                      }}
                      className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px]"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-cyan-600/20 transition transform active:scale-95"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 py-2 px-4 bg-slate-950/80">
        <button
          onClick={() => setActiveTab('verify')}
          className={`flex flex-col items-center gap-1 text-xs ${
            activeTab === 'verify' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Verify</span>
        </button>
        <button
          onClick={() => setActiveTab('business')}
          className={`flex flex-col items-center gap-1 text-xs ${
            activeTab === 'business' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Business</span>
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center gap-1 text-xs ${
            activeTab === 'admin' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Admin</span>
        </button>
      </div>
    </header>
  );
};

