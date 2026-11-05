import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Camera,
  ArrowRight,
  Building2,
  CheckCircle2,
  QrCode,
  Lock,
  Layers,
  Cpu,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { QRScannerModal } from '../components/QRScannerModal';

interface HomePageProps {
  onNavigate: (tab: 'home' | 'verify' | 'business' | 'admin', searchId?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [searchInput, setSearchInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { isConnected, connectWallet, isAuthorizedSeller, isAdmin } = useWeb3();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    onNavigate('verify', searchInput.trim());
  };

  const handleScanSuccess = (decodedId: string) => {
    onNavigate('verify', decodedId);
  };

  return (
    <div className="space-y-20 py-8">
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 text-center">
        {/* Ambient background glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>BOT Chain Powered Warranty Infrastructure</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Decentralized Product <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Warranty & Authenticity
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Eliminate counterfeit receipts, lost warranty cards, and fraudulent claims.
            Authorized manufacturers record authentic warranties directly onto the immutable BOT Chain.
          </p>

          {/* Quick Verification Search Box */}
          <div className="max-w-2xl mx-auto pt-4">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center bg-[#0d1424] border-2 border-cyan-500/30 hover:border-cyan-500/60 focus-within:border-cyan-400 rounded-2xl p-2 shadow-2xl transition duration-200"
            >
              <div className="pl-3 text-cyan-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Enter Product ID or Serial Number (e.g. SN-MACBOOK-2026-X99)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-transparent px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none"
              />
              <div className="flex items-center gap-2 pr-1">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white transition"
                  title="Scan QR Code"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-600/30 transition transform active:scale-95 shrink-0"
                >
                  <span>Verify</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="flex items-center justify-center gap-3 pt-3 text-xs text-slate-500">
              <span>Try example serial:</span>
              <button
                type="button"
                onClick={() => onNavigate('verify', 'SN-MACBOOK-2026-X99')}
                className="text-cyan-400 hover:underline font-mono"
              >
                SN-MACBOOK-2026-X99
              </button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
            <button
              onClick={() => onNavigate('verify')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 transition"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>Open Verification Center</span>
            </button>

            <button
              onClick={() => onNavigate('business')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 font-medium text-sm border border-cyan-500/40 transition"
            >
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Merchant / Business Portal</span>
            </button>
          </div>
        </div>
      </section>

      {/* Network Stats Bar */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-[#0e1626]/80 border border-slate-800 backdrop-blur-sm">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Blockchain</span>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>BOT Chain</span>
            </div>
            <p className="text-[11px] text-slate-400">High-speed EVM L1</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Chain ID</span>
            <div className="text-lg font-mono font-bold text-cyan-400">968</div>
            <p className="text-[11px] text-slate-400">Hex: 0x3c8</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Native Token</span>
            <div className="text-lg font-bold text-white">BOT</div>
            <p className="text-[11px] text-slate-400">Supply: 150 Million</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Block Explorer</span>
            <a
              href="https://scan.bohr.life/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
            >
              <span>scan.bohr.life</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-[11px] text-slate-400">Live verified transactions</p>
          </div>
        </div>
      </section>

      {/* Pillars of WarrantyCheck */}
      <section className="max-w-6xl mx-auto px-4 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Engineered for Manufacturers, Built for Consumers
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Traditional paper warranties are prone to loss, alteration, and counterfeiting.
            WarrantyCheck leverages cryptographic hashes and role-based access control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-[#0d1424] border border-slate-800 hover:border-cyan-500/40 transition duration-300 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Authorized Sellers Only</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Only verified businesses authorized by the administrator can register authentic product
              warranties, stopping counterfeiters before they start.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-[#0d1424] border border-slate-800 hover:border-cyan-500/40 transition duration-300 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Instant QR Verification</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Generate scannable QR certificates on registration. Consumers scan via any camera
              to fetch live blockchain status, expiration dates, and merchant provenance.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-[#0d1424] border border-slate-800 hover:border-cyan-500/40 transition duration-300 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Transparent Voiding & Auditing</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              In cases of unauthorized tampering or product recalls, authorized merchants or admins
              can transparently void warranties on-chain with documented reasons.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

