import React, { useState, useEffect } from 'react';
import {
  Search,
  Camera,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Building2,
  Calendar,
  Hash,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  QrCode,
  FileText,
} from 'lucide-react';
import { createPublicClient, http as viemHttp } from 'viem';
import { useWeb3 } from '../contexts/Web3Context';
import {
  botChainTestnet,
  hardhatLocal,
  formatAddress,
  formatTimestamp,
  formatDuration,
  getRemainingTime,
} from '../utils/botChain';
import WarrantyCheckABI from '../abis/WarrantyCheck.json';
import { StatusBadge } from '../components/StatusBadge';
import { QRScannerModal } from '../components/QRScannerModal';
import { QRCodeModal } from '../components/QRCodeModal';

interface VerifyPageProps {
  initialProductId?: string;
}

interface ProductDetails {
  productIdHash: string;
  rawProductId: string;
  productName: string;
  business: string;
  purchaseTimestamp: bigint;
  warrantyDuration: bigint;
  expiryTimestamp: bigint;
  status: number; // 0: Active, 1: Expired, 2: Void
  isVoided: boolean;
  voidReason: string;
  metadataURI: string;
  exists: boolean;
}

export const VerifyPage: React.FC<VerifyPageProps> = ({ initialProductId }) => {
  const { contractAddress, isBotChain } = useWeb3();
  const [productIdInput, setProductIdInput] = useState(initialProductId || '');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const client = createPublicClient({
    chain: isBotChain ? botChainTestnet : hardhatLocal,
    transport: viemHttp(isBotChain ? 'https://rpc.bohr.life' : 'http://127.0.0.1:8545'),
  });

  const queryProduct = async (idToQuery: string) => {
    const trimmedId = idToQuery.trim();
    if (!trimmedId) return;

    setLoading(true);
    setErrorMsg(null);
    setHasQueried(true);

    try {
      const result: any = await client.readContract({
        address: contractAddress as `0x${string}`,
        abi: WarrantyCheckABI,
        functionName: 'verifyProduct',
        args: [trimmedId],
      });

      // result is a tuple matching return values
      const details: ProductDetails = {
        productIdHash: result[0],
        rawProductId: result[1],
        productName: result[2],
        business: result[3],
        purchaseTimestamp: BigInt(result[4]),
        warrantyDuration: BigInt(result[5]),
        expiryTimestamp: BigInt(result[6]),
        status: Number(result[7]),
        isVoided: Boolean(result[8]),
        voidReason: result[9],
        metadataURI: result[10],
        exists: Boolean(result[11]),
      };

      setProduct(details);
    } catch (err: any) {
      console.error('Contract query error:', err);
      setErrorMsg(
        'Unable to query contract on BOT Chain. Verify that the contract is deployed and network is reachable.'
      );
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialProductId) {
      setProductIdInput(initialProductId);
      queryProduct(initialProductId);
    }
  }, [initialProductId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    queryProduct(productIdInput);
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scannedId) => {
          setProductIdInput(scannedId);
          queryProduct(scannedId);
        }}
      />

      {product && (
        <QRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          product={{
            productId: product.rawProductId,
            productName: product.productName,
            business: product.business,
            purchaseDate: formatTimestamp(product.purchaseTimestamp),
            expiryDate: formatTimestamp(product.expiryTimestamp),
            duration: formatDuration(product.warrantyDuration),
          }}
        />
      )}

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Real-time On-Chain Verification</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          Verify Product Warranty
        </h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Query the BOT Chain smart contract directly to verify authentic manufacturer provenance,
          real-time expiration, and validity status.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center bg-[#0d1424] border-2 border-cyan-500/30 hover:border-cyan-500/50 focus-within:border-cyan-400 rounded-2xl p-2 shadow-xl transition"
        >
          <div className="pl-3 text-cyan-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Enter Product ID or Serial Number..."
            value={productIdInput}
            onChange={(e) => setProductIdInput(e.target.value)}
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
              disabled={loading || !productIdInput.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-600/30 transition disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{loading ? 'Querying...' : 'Verify'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 max-w-2xl mx-auto">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Query Failed</p>
            <p className="text-xs text-rose-200/80 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Result View */}
      {hasQueried && !loading && product && (
        <div className="max-w-2xl mx-auto space-y-6">
          {product.exists ? (
            <div className="bg-[#0e1626] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
              {/* Background ambient corner glow */}
              <div
                className={`absolute -top-24 -right-24 w-60 h-60 rounded-full blur-[90px] pointer-events-none ${
                  product.status === 0
                    ? 'bg-emerald-500/15'
                    : product.status === 1
                    ? 'bg-amber-500/15'
                    : 'bg-rose-500/15'
                }`}
              />

              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Product Verification Result
                  </span>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {product.productName}
                  </h2>
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                    <span>ID: {product.rawProductId}</span>
                    <button
                      onClick={() => copyToClipboard(product.rawProductId, 'id')}
                      className="hover:text-white"
                      title="Copy ID"
                    >
                      {copiedField === 'id' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                  <StatusBadge status={product.status as 0 | 1 | 2} size="lg" />
                  <button
                    onClick={() => setIsQRModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View QR Certificate</span>
                  </button>
                </div>
              </div>

              {/* Void Notice if voided */}
              {product.isVoided && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-sm text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Warranty Explicitly Voided by Issuer</span>
                  </div>
                  <p className="text-xs text-rose-200">
                    <span className="font-semibold text-rose-300">Reason documented on-chain: </span>
                    "{product.voidReason || 'No reason specified'}"
                  </p>
                </div>
              )}

              {/* Countdown Bar if Active */}
              {product.status === 0 && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold">Remaining Validity:</span>
                  </div>
                  <span className="font-mono font-bold text-white bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                    {getRemainingTime(product.expiryTimestamp).text}
                  </span>
                </div>
              )}

              {/* Detailed Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Registering Merchant */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Authorized Registering Business</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-slate-200">
                      {formatAddress(product.business)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(product.business, 'biz')}
                        className="text-slate-400 hover:text-white"
                        title="Copy Address"
                      >
                        {copiedField === 'biz' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={`https://scan.bohr.life/address/${product.business}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300"
                        title="View on BOT Scan"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Purchase Date */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Purchase & Registration Date</span>
                  </div>
                  <p className="font-medium text-slate-200 pt-1">
                    {formatTimestamp(product.purchaseTimestamp)}
                  </p>
                </div>

                {/* Warranty Duration */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Warranty Duration</span>
                  </div>
                  <p className="font-medium text-slate-200 pt-1">
                    {formatDuration(product.warrantyDuration)}
                  </p>
                </div>

                {/* Expiration Date */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Expiry Timestamp</span>
                  </div>
                  <p className="font-medium text-slate-200 pt-1">
                    {formatTimestamp(product.expiryTimestamp)}
                  </p>
                </div>
              </div>

              {/* Cryptographic Hash & Off-chain Metadata */}
              <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-cyan-400" />
                    <span>On-Chain Keccak256 Hash:</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-300 truncate max-w-[260px] sm:max-w-md">
                    {product.productIdHash}
                  </span>
                </div>

                {product.metadataURI && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Off-chain Metadata URI:</span>
                    </span>
                    <a
                      href={product.metadataURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline truncate max-w-[260px] sm:max-w-md"
                    >
                      {product.metadataURI}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Product Not Found State */
            <div className="p-8 rounded-3xl bg-[#0e1626] border border-amber-500/30 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Unregistered Product</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No record was found on BOT Chain for product ID{' '}
                  <span className="font-mono text-cyan-400">"{productIdInput}"</span>. This product
                  has not been registered by an authorized business.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

