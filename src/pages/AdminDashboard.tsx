import React, { useState, useEffect } from 'react';
import {
  Lock,
  UserCheck,
  UserX,
  ShieldAlert,
  ShieldCheck,
  PlusCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Building2,
  Package,
} from 'lucide-react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http as viemHttp,
  isAddress,
} from 'viem';
import { useWeb3, DEV_ACCOUNTS } from '../contexts/Web3Context';
import {
  botChainTestnet,
  hardhatLocal,
  formatAddress,
  formatTimestamp,
} from '../utils/botChain';
import WarrantyCheckABI from '../abis/WarrantyCheck.json';

interface SellerStatus {
  address: string;
  isAuthorized: boolean;
  registeredCount: number;
}

export const AdminDashboard: React.FC = () => {
  const {
    activeAddress,
    isConnected,
    connectWallet,
    isAdmin,
    contractAddress,
    isBotChain,
    refreshRoles,
    setSimulatedAddress,
  } = useWeb3();

  // Authorize form state
  const [sellerInput, setSellerInput] = useState('');
  const [sellerLabel, setSellerLabel] = useState('');
  const [authorizing, setAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Sellers list
  const [sellers, setSellers] = useState<SellerStatus[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [revokingAddress, setRevokingAddress] = useState<string | null>(null);

  // Total system metrics
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const client = createPublicClient({
    chain: isBotChain ? botChainTestnet : hardhatLocal,
    transport: viemHttp(isBotChain ? 'https://rpc.bohr.life' : 'http://127.0.0.1:8545'),
  });

  const fetchAdminData = async () => {
    if (!contractAddress) return;
    setLoadingSellers(true);

    try {
      // 1. Get total products count
      const countRes: any = await client.readContract({
        address: contractAddress as `0x${string}`,
        abi: WarrantyCheckABI,
        functionName: 'getTotalProductsCount',
      });
      setTotalProducts(Number(countRes));

      // 2. Get authorized sellers list
      const sellerAddrs: any = await client.readContract({
        address: contractAddress as `0x${string}`,
        abi: WarrantyCheckABI,
        functionName: 'getAuthorizedSellers',
      });

      // Filter unique addresses
      const uniqueAddrs = Array.from(new Set((sellerAddrs as string[]).map((a) => a.toLowerCase())));

      // Query current authorization status and registered count for each
      const sellerData = await Promise.all(
        uniqueAddrs.map(async (addr) => {
          const isAuth: any = await client.readContract({
            address: contractAddress as `0x${string}`,
            abi: WarrantyCheckABI,
            functionName: 'isSellerAuthorized',
            args: [addr as `0x${string}`],
          });

          const bizProducts: any = await client.readContract({
            address: contractAddress as `0x${string}`,
            abi: WarrantyCheckABI,
            functionName: 'getProductsByBusiness',
            args: [addr as `0x${string}`],
          });

          return {
            address: addr,
            isAuthorized: Boolean(isAuth),
            registeredCount: bizProducts ? bizProducts.length : 0,
          };
        })
      );

      setSellers(sellerData);
    } catch (err) {
      console.warn('Could not fetch admin data from contract:', err);
    } finally {
      setLoadingSellers(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [contractAddress, isBotChain]);

  // Handle Authorize Seller
  const handleAuthorizeSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const targetAddress = sellerInput.trim();
    if (!isAddress(targetAddress)) {
      setAuthError('Please enter a valid 0x EVM wallet address.');
      return;
    }

    try {
      setAuthorizing(true);
      if (!window.ethereum) {
        throw new Error('EVM Wallet provider not found. Please connect MetaMask.');
      }

      const walletClient = createWalletClient({
        account: activeAddress as `0x${string}`,
        chain: isBotChain ? botChainTestnet : hardhatLocal,
        transport: custom(window.ethereum),
      });

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: WarrantyCheckABI,
        functionName: 'authorizeSeller',
        args: [targetAddress as `0x${string}`],
      });

      await client.waitForTransactionReceipt({ hash });
      setAuthSuccess(`Successfully authorized business wallet ${formatAddress(targetAddress)}!`);
      setSellerInput('');
      setSellerLabel('');
      fetchAdminData();
      refreshRoles();
    } catch (err: any) {
      console.error('Authorization failed:', err);
      setAuthError(
        err?.shortMessage || err?.message || 'Transaction failed. Ensure you are the contract admin.'
      );
    } finally {
      setAuthorizing(false);
    }
  };

  // Handle Revoke Seller
  const handleRevokeSeller = async (sellerAddr: string) => {
    if (!confirm(`Are you sure you want to revoke registration permission from ${sellerAddr}?`)) {
      return;
    }

    try {
      setRevokingAddress(sellerAddr);
      if (!window.ethereum) {
        throw new Error('EVM Wallet provider not found.');
      }

      const walletClient = createWalletClient({
        account: activeAddress as `0x${string}`,
        chain: isBotChain ? botChainTestnet : hardhatLocal,
        transport: custom(window.ethereum),
      });

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: WarrantyCheckABI,
        functionName: 'revokeSeller',
        args: [sellerAddr as `0x${string}`],
      });

      await client.waitForTransactionReceipt({ hash });
      fetchAdminData();
      refreshRoles();
    } catch (err: any) {
      alert(`Revocation failed: ${err?.message || err}`);
    } finally {
      setRevokingAddress(null);
    }
  };

  const copyAddress = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/30 text-purple-400 text-xs font-semibold mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Administrator Access Control</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Authorize manufacturer & merchant wallets, revoke permissions, and audit the global registry.
          </p>
        </div>

        {/* Admin Role Status Pill */}
        <div>
          {isAdmin ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-500/15 border border-purple-500/40 text-purple-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Admin Wallet Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-semibold block">Not Admin Wallet</span>
                <button
                  onClick={() => setSimulatedAddress(DEV_ACCOUNTS[0].address)}
                  className="text-cyan-400 hover:underline text-[11px]"
                >
                  Switch to Admin Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800 space-y-1">
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
            Total Products Registered
          </span>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            <span>{totalProducts}</span>
          </div>
          <p className="text-[11px] text-slate-400">Recorded across all sellers</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800 space-y-1">
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
            Authorized Businesses
          </span>
          <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <span>{sellers.filter((s) => s.isAuthorized).length}</span>
          </div>
          <p className="text-[11px] text-slate-400">Active registration rights</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800 space-y-1">
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
            Revoked Businesses
          </span>
          <div className="text-2xl font-bold text-slate-400 flex items-center gap-2">
            <UserX className="w-5 h-5 text-slate-400" />
            <span>{sellers.filter((s) => !s.isAuthorized).length}</span>
          </div>
          <p className="text-[11px] text-slate-400">Permissions suspended</p>
        </div>
      </div>

      {/* Authorize Form & Seller List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Authorize Seller Form */}
        <div className="lg:col-span-1">
          <div className="bg-[#0e1626] border border-purple-500/30 rounded-3xl p-6 shadow-xl space-y-5 sticky top-24">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">Authorize Business</h2>
            </div>
            <p className="text-xs text-slate-400">
              Grant a business or manufacturer wallet permission to register products on BOT Chain.
            </p>

            <form onSubmit={handleAuthorizeSeller} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Business Wallet Address (0x...) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                  value={sellerInput}
                  onChange={(e) => setSellerInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-3 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Business / Company Name (Optional Note)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Electronics Corp"
                  value={sellerLabel}
                  onChange={(e) => setSellerLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              {/* Dev shortcut pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Quick Dev Wallet Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSellerInput(DEV_ACCOUNTS[1].address)}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-cyan-300 rounded-lg border border-slate-700 font-mono"
                  >
                    Merchant 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellerInput(DEV_ACCOUNTS[2].address)}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-cyan-300 rounded-lg border border-slate-700 font-mono"
                  >
                    Retailer 2
                  </button>
                </div>
              </div>

              {authSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
                  {authSuccess}
                </div>
              )}

              {authError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authorizing || !sellerInput.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition transform active:scale-95 disabled:opacity-50"
              >
                {authorizing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
                <span>{authorizing ? 'Confirming on Chain...' : 'Authorize Seller'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Sellers Management Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0e1626] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Business Permissions Directory</h2>
                <p className="text-xs text-slate-400">
                  Manage registration authorization status for connected business wallets.
                </p>
              </div>

              <button
                onClick={fetchAdminData}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Refresh from Chain"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingSellers ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
                <p className="text-xs">Querying authorized sellers from smart contract...</p>
              </div>
            ) : sellers.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <UserCheck className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No sellers registered yet</p>
                <p className="text-xs text-slate-500">
                  Authorize a business wallet on the left to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800 overflow-x-auto">
                {sellers.map((s) => (
                  <div
                    key={s.address}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 p-3 rounded-2xl transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white font-semibold">
                          {formatAddress(s.address)}
                        </span>
                        {s.isAuthorized ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Authorized
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            Revoked
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="font-mono text-[11px] text-slate-500 break-all select-all">
                          {s.address}
                        </span>
                        <button
                          onClick={() => copyAddress(s.address)}
                          className="hover:text-white"
                          title="Copy Address"
                        >
                          {copiedAddress === s.address ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <a
                          href={`https://scan.bohr.life/address/${s.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                          title="View on BOT Scan"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="text-xs text-slate-500 pt-1">
                        Registered Products: <span className="text-slate-300 font-semibold">{s.registeredCount}</span>
                      </div>
                    </div>

                    {/* Revoke Action */}
                    <div>
                      {s.isAuthorized && (
                        <button
                          onClick={() => handleRevokeSeller(s.address)}
                          disabled={revokingAddress === s.address}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-semibold transition disabled:opacity-50"
                        >
                          <UserX className="w-3.5 h-3.5 text-rose-400" />
                          <span>{revokingAddress === s.address ? 'Revoking...' : 'Revoke'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

