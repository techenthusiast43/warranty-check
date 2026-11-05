import React, { useState, useEffect } from 'react';
import {
  Building2,
  PlusCircle,
  Package,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  ExternalLink,
  QrCode,
  AlertTriangle,
  RefreshCw,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit3,
  Hash,
} from 'lucide-react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http as viemHttp,
  parseEther,
} from 'viem';
import { useWeb3 } from '../contexts/Web3Context';
import {
  botChainTestnet,
  hardhatLocal,
  formatAddress,
  formatTimestamp,
  formatDuration,
} from '../utils/botChain';
import WarrantyCheckABI from '../abis/WarrantyCheck.json';
import { StatusBadge } from '../components/StatusBadge';
import { QRCodeModal } from '../components/QRCodeModal';

interface ProductItem {
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
}

export const BusinessDashboard: React.FC = () => {
  const {
    activeAddress,
    isConnected,
    connectWallet,
    isAuthorizedSeller,
    contractAddress,
    isBotChain,
    refreshRoles,
  } = useWeb3();

  // Registration Form State
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [durationPreset, setDurationPreset] = useState<number>(365); // days
  const [customDurationDays, setCustomDurationDays] = useState('');
  const [metadataURI, setMetadataURI] = useState('');

  // Transaction States
  const [txStage, setTxStage] = useState<'idle' | 'waiting' | 'mining' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Registered Products List
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  // Modals
  const [selectedProductForQR, setSelectedProductForQR] = useState<ProductItem | null>(null);
  const [voidModalProduct, setVoidModalProduct] = useState<ProductItem | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const [editModalProduct, setEditModalProduct] = useState<ProductItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editMetadata, setEditMetadata] = useState('');
  const [updating, setUpdating] = useState(false);

  const client = createPublicClient({
    chain: isBotChain ? botChainTestnet : hardhatLocal,
    transport: viemHttp(isBotChain ? 'https://rpc.bohr.life' : 'http://127.0.0.1:8545'),
  });

  // Fetch business products
  const fetchBusinessProducts = async () => {
    if (!activeAddress || !contractAddress) return;
    setLoadingProducts(true);

    try {
      // 1. Get array of product hashes for this business
      const hashes: any = await client.readContract({
        address: contractAddress as `0x${string}`,
        abi: WarrantyCheckABI,
        functionName: 'getProductsByBusiness',
        args: [activeAddress as `0x${string}`],
      });

      if (!hashes || hashes.length === 0) {
        setProducts([]);
        setLoadingProducts(false);
        return;
      }

      // 2. Fetch full details for each product
      const productPromises = hashes.map(async (hash: `0x${string}`) => {
        try {
          const res: any = await client.readContract({
            address: contractAddress as `0x${string}`,
            abi: WarrantyCheckABI,
            functionName: 'verifyProductByHash',
            args: [hash],
          });
          return {
            productIdHash: res[0],
            rawProductId: res[1],
            productName: res[2],
            business: res[3],
            purchaseTimestamp: BigInt(res[4]),
            warrantyDuration: BigInt(res[5]),
            expiryTimestamp: BigInt(res[6]),
            status: Number(res[7]),
            isVoided: Boolean(res[8]),
            voidReason: res[9],
            metadataURI: res[10],
          } as ProductItem;
        } catch (e) {
          console.error('Error reading product hash:', hash, e);
          return null;
        }
      });

      const results = await Promise.all(productPromises);
      const validProducts = results.filter((p): p is ProductItem => p !== null);
      // Sort newest purchase date first
      validProducts.sort((a, b) => Number(b.purchaseTimestamp - a.purchaseTimestamp));
      setProducts(validProducts);
    } catch (err) {
      console.warn('Error fetching business products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (activeAddress) {
      fetchBusinessProducts();
    }
  }, [activeAddress, contractAddress, isBotChain]);

  // Handle Product Registration
  const handleRegisterProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAddress) {
      connectWallet();
      return;
    }

    const durationDays = durationPreset === -1 ? Number(customDurationDays) : durationPreset;
    if (!durationDays || durationDays <= 0) {
      setTxError('Please specify a valid warranty duration.');
      return;
    }

    const durationSeconds = BigInt(Math.floor(durationDays * 24 * 3600));
    const purchaseUnix = BigInt(Math.floor(new Date(purchaseDate).getTime() / 1000));

    try {
      setTxStage('waiting');
      setTxError(null);
      setTxHash(null);

      if (!window.ethereum) {
        throw new Error('EVM Wallet provider not found. Please connect MetaMask or compatible wallet.');
      }

      const walletClient = createWalletClient({
        account: activeAddress as `0x${string}`,
        chain: isBotChain ? botChainTestnet : hardhatLocal,
        transport: custom(window.ethereum),
      });

      // Submit transaction
      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: WarrantyCheckABI,
        functionName: 'registerProduct',
        args: [productId.trim(), productName.trim(), purchaseUnix, durationSeconds, metadataURI.trim()],
      });

      setTxHash(hash);
      setTxStage('mining');

      // Wait for transaction receipt
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status === 'success') {
        setTxStage('success');

        // Automatically open the QR modal for the newly registered item
        const newProductItem: ProductItem = {
          productIdHash: '',
          rawProductId: productId.trim(),
          productName: productName.trim(),
          business: activeAddress,
          purchaseTimestamp: purchaseUnix,
          warrantyDuration: durationSeconds,
          expiryTimestamp: purchaseUnix + durationSeconds,
          status: 0,
          isVoided: false,
          voidReason: '',
          metadataURI: metadataURI.trim(),
        };
        setSelectedProductForQR(newProductItem);

        // Reset form
        setProductId('');
        setProductName('');
        setMetadataURI('');

        // Refresh list
        fetchBusinessProducts();
      } else {
        throw new Error('Transaction execution reverted on BOT Chain.');
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      setTxStage('error');
      setTxError(
        err?.shortMessage ||
          err?.message ||
          'Failed to register product on-chain. Check wallet funds and permissions.'
      );
    }
  };

  // Void Warranty Action
  const handleVoidWarranty = async () => {
    if (!voidModalProduct || !voidReason.trim() || !activeAddress) return;

    try {
      setVoiding(true);
      const walletClient = createWalletClient({
        account: activeAddress as `0x${string}`,
        chain: isBotChain ? botChainTestnet : hardhatLocal,
        transport: custom(window.ethereum),
      });

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: WarrantyCheckABI,
        functionName: 'voidWarranty',
        args: [voidModalProduct.rawProductId, voidReason.trim()],
      });

      await client.waitForTransactionReceipt({ hash });
      setVoidModalProduct(null);
      setVoidReason('');
      fetchBusinessProducts();
    } catch (err: any) {
      alert(`Failed to void warranty: ${err?.message || err}`);
    } finally {
      setVoiding(false);
    }
  };

  // Update Product Action
  const handleUpdateProduct = async () => {
    if (!editModalProduct || !editName.trim() || !activeAddress) return;

    try {
      setUpdating(true);
      const walletClient = createWalletClient({
        account: activeAddress as `0x${string}`,
        chain: isBotChain ? botChainTestnet : hardhatLocal,
        transport: custom(window.ethereum),
      });

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: WarrantyCheckABI,
        functionName: 'updateProductInfo',
        args: [editModalProduct.rawProductId, editName.trim(), editMetadata.trim()],
      });

      await client.waitForTransactionReceipt({ hash });
      setEditModalProduct(null);
      fetchBusinessProducts();
    } catch (err: any) {
      alert(`Failed to update product info: ${err?.message || err}`);
    } finally {
      setUpdating(false);
    }
  };

  // Counts
  const totalCount = products.length;
  const activeCount = products.filter((p) => p.status === 0).length;
  const expiredCount = products.filter((p) => p.status === 1).length;
  const voidedCount = products.filter((p) => p.status === 2).length;

  const filteredProducts = products.filter((p) => {
    const q = filterQuery.toLowerCase();
    return (
      p.productName.toLowerCase().includes(q) ||
      p.rawProductId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10 animate-fade-in">
      {/* QR Code Modal */}
      {selectedProductForQR && (
        <QRCodeModal
          isOpen={Boolean(selectedProductForQR)}
          onClose={() => setSelectedProductForQR(null)}
          product={{
            productId: selectedProductForQR.rawProductId,
            productName: selectedProductForQR.productName,
            business: selectedProductForQR.business,
            purchaseDate: formatTimestamp(selectedProductForQR.purchaseTimestamp),
            expiryDate: formatTimestamp(selectedProductForQR.expiryTimestamp),
            duration: formatDuration(selectedProductForQR.warrantyDuration),
          }}
        />
      )}

      {/* Void Warranty Modal */}
      {voidModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e1626] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-lg">
              <ShieldAlert className="w-5 h-5" />
              <span>Void Product Warranty</span>
            </div>
            <p className="text-xs text-slate-300">
              Voiding an on-chain warranty is permanent. Consumers and retailers will immediately
              see the warranty marked as Void with your documented reason.
            </p>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-slate-400 block">Product:</span>
              <span className="text-white font-semibold">{voidModalProduct.productName}</span>
              <span className="text-cyan-400 block mt-1">ID: {voidModalProduct.rawProductId}</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for Voiding *
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Unauthorized disassembly, liquid damage, serial tampering, recall..."
                className="w-full h-24 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setVoidModalProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleVoidWarranty}
                disabled={voiding || !voidReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {voiding ? 'Submitting to Chain...' : 'Confirm Void on BOT Chain'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e1626] border border-cyan-500/40 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-lg">
              <Edit3 className="w-5 h-5" />
              <span>Update Permitted Product Info</span>
            </div>
            <p className="text-xs text-slate-400">
              Note: Core warranty terms (purchase timestamp and duration) are immutable on-chain.
              Only product title and metadata references can be updated.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Metadata URI</label>
              <input
                type="text"
                value={editMetadata}
                onChange={(e) => setEditMetadata(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEditModalProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProduct}
                disabled={updating || !editName.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Seller Permission Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Merchant & Manufacturer Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Business Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Register genuine products, distribute QR certificates, and manage warranty lifecycles.
          </p>
        </div>

        {/* Authorization Badge */}
        <div className="flex items-center gap-3">
          {isAuthorizedSeller ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Authorized Seller Wallet</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Wallet Not Authorized as Seller</span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800 space-y-1">
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
            Total Registered
          </span>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            <span>{totalCount}</span>
          </div>
          <p className="text-[11px] text-slate-400">Products on BOT Chain</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800 space-y-1">
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
            Active Warranties
          </span>
          <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>{activeCount}</span>
          </div>
          <p className="text-[11px] text-slate-400">Currently in coverage</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800 space-y-1">
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
            Expired Warranties
          </span>
          <div className="text-2xl font-bold text-amber-400 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>{expiredCount}</span>
          </div>
          <p className="text-[11px] text-slate-400">Passed coverage term</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800 space-y-1">
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
            Voided Warranties
          </span>
          <div className="text-2xl font-bold text-rose-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>{voidedCount}</span>
          </div>
          <p className="text-[11px] text-slate-400">Explicitly revoked</p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Register New Product Form */}
        <div className="lg:col-span-1">
          <div className="bg-[#0e1626] border border-cyan-500/30 rounded-3xl p-6 shadow-xl space-y-5 sticky top-24">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">Register Product</h2>
            </div>
            <p className="text-xs text-slate-400">
              Submit product serial and warranty terms to the BOT Chain smart contract.
            </p>

            <form onSubmit={handleRegisterProduct} className="space-y-4 text-xs">
              {/* Product ID */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Product ID / Serial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SN-MACBOOK-2026-X99"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none"
                />
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Product Name / Model *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MacBook Pro M4 16-inch"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Purchase Date *
                </label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                />
              </div>

              {/* Warranty Duration Presets */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Warranty Duration *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '6 Months', days: 180 },
                    { label: '1 Year', days: 365 },
                    { label: '2 Years', days: 730 },
                    { label: '3 Years', days: 1095 },
                    { label: '5 Years', days: 1825 },
                    { label: 'Custom', days: -1 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setDurationPreset(preset.days)}
                      className={`py-2 px-2 rounded-lg text-[11px] font-medium border transition ${
                        durationPreset === preset.days
                          ? 'bg-cyan-600 text-white border-cyan-400 font-semibold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {durationPreset === -1 && (
                  <div className="mt-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Duration in Days (e.g. 90)"
                      value={customDurationDays}
                      onChange={(e) => setCustomDurationDays(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}
              </div>

              {/* Metadata URI */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Off-Chain Metadata URI (Optional)
                </label>
                <input
                  type="text"
                  placeholder="ipfs://... or https://..."
                  value={metadataURI}
                  onChange={(e) => setMetadataURI(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none"
                />
              </div>

              {/* Transaction Status Notification */}
              {txStage === 'waiting' && (
                <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Waiting for wallet signature...</span>
                </div>
              )}

              {txStage === 'mining' && (
                <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Confirming on BOT Chain...</span>
                  </div>
                  {txHash && (
                    <a
                      href={`https://scan.bohr.life/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-mono break-all"
                    >
                      <span>Tx: {formatAddress(txHash)}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              )}

              {txStage === 'success' && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Product registered on-chain successfully!</span>
                </div>
              )}

              {txStage === 'error' && txError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="text-[11px]">{txError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isAuthorizedSeller || txStage === 'waiting' || txStage === 'mining'}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 transition transform active:scale-95 disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register On BOT Chain</span>
              </button>

              {!isAuthorizedSeller && (
                <p className="text-[10px] text-amber-400 text-center">
                  Only authorized sellers can call registerProduct(). You can request authorization
                  from the Admin tab.
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Registered Products Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0e1626] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Registered Products</h2>
                <p className="text-xs text-slate-400">
                  Warranties recorded by this business wallet on the blockchain.
                </p>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by name or ID..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none w-56"
                />
              </div>
            </div>

            {loadingProducts ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                <p className="text-xs">Loading registered products from BOT Chain...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <Package className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No products found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {filterQuery
                    ? 'No products matched your search filter.'
                    : 'You have not registered any products with this wallet yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800 overflow-x-auto">
                {filteredProducts.map((p) => (
                  <div
                    key={p.rawProductId}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 p-3 rounded-2xl transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{p.productName}</h4>
                        <StatusBadge status={p.status as 0 | 1 | 2} size="sm" />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="font-mono text-cyan-400 font-semibold">
                          ID: {p.rawProductId}
                        </span>
                        <span>Purchased: {formatTimestamp(p.purchaseTimestamp)}</span>
                        <span>Duration: {formatDuration(p.warrantyDuration)}</span>
                      </div>
                      {p.isVoided && (
                        <p className="text-[11px] text-rose-400">
                          Void Reason: "{p.voidReason}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedProductForQR(p)}
                        className="p-2 rounded-xl bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30 transition text-xs flex items-center gap-1.5"
                        title="View / Download QR Certificate"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">QR Certificate</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditModalProduct(p);
                          setEditName(p.productName);
                          setEditMetadata(p.metadataURI);
                        }}
                        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
                        title="Edit Info"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {!p.isVoided && (
                        <button
                          onClick={() => setVoidModalProduct(p)}
                          className="p-2 rounded-xl bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 transition text-xs flex items-center gap-1"
                          title="Void Warranty"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                          <span className="hidden sm:inline">Void</span>
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

