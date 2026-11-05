import React from 'react';
import { ShieldCheck, ExternalLink, Globe } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { formatAddress } from '../utils/botChain';

export const Footer: React.FC = () => {
  const { contractAddress } = useWeb3();

  return (
    <footer className="border-t border-slate-800 bg-[#060a14] py-10 mt-20 text-slate-400 text-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <span className="font-bold text-white text-sm">WarrantyCheck</span>
              <p className="text-[11px] text-slate-500">
                Decentralized Product Registry & Warranty Verification on BOT Chain
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-400">
            <a
              href="https://scan.bohr.life/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-cyan-400 transition"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>BOT Explorer</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Contract:</span>
              <span className="font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {formatAddress(contractAddress)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <p>© {new Date().getFullYear()} WarrantyCheck dApp. Built on BOT Chain (Chain ID: 968).</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>BOT Chain Testnet Active</span>
            </span>
            <span>RPC: https://rpc.bohr.life</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

