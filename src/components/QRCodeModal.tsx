import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Printer, Copy, Check, ShieldCheck, ExternalLink } from 'lucide-react';
import { formatAddress } from '../utils/botChain';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    productId: string;
    productName: string;
    business: string;
    purchaseDate?: string;
    expiryDate?: string;
    duration?: string;
  };
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const [copied, setCopied] = React.useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // The verification URL includes the product ID query parameter
  const verificationUrl = `${window.location.origin}/verify?id=${encodeURIComponent(product.productId)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById('product-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 100, 100, 800, 800);
        
        // Add footer text on downloaded image
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(product.productName, 500, 930);
        ctx.font = '24px monospace';
        ctx.fillStyle = '#475569';
        ctx.fillText(`ID: ${product.productId}`, 500, 965);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `Warranty-QR-${product.productId}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0e1626] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden print-card">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-slate-100">Warranty Certificate & QR</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Card Content */}
        <div ref={cardRef} className="p-6 text-center space-y-6">
          <div className="border border-cyan-500/30 rounded-xl p-5 bg-[#0b101d] space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
              <span>BOT Chain Verified Certificate</span>
            </div>

            <div>
              <h4 className="text-xl font-bold text-white tracking-tight">{product.productName}</h4>
              <p className="text-xs font-mono text-cyan-400 mt-1">ID: {product.productId}</p>
            </div>

            {/* QR Code Container */}
            <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border-2 border-cyan-500/20">
              <QRCodeSVG
                id="product-qr-svg"
                value={verificationUrl}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-xs text-slate-400">
              Scan with mobile camera to verify genuine authenticity & warranty terms on-chain.
            </p>

            <div className="grid grid-cols-2 gap-3 text-left pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block">Registered By</span>
                <span className="font-mono text-slate-300">{formatAddress(product.business)}</span>
              </div>
              {product.duration && (
                <div>
                  <span className="text-slate-500 block">Warranty Period</span>
                  <span className="text-slate-300">{product.duration}</span>
                </div>
              )}
              {product.purchaseDate && (
                <div>
                  <span className="text-slate-500 block">Purchase Date</span>
                  <span className="text-slate-300">{product.purchaseDate}</span>
                </div>
              )}
              {product.expiryDate && (
                <div>
                  <span className="text-slate-500 block">Expiration Date</span>
                  <span className="text-slate-300">{product.expiryDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Verification Link */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs no-print">
            <span className="text-slate-400 truncate flex-1 font-mono text-left">
              {verificationUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 no-print">
            <button
              onClick={handleDownloadQR}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition shadow-lg shadow-cyan-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download QR</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition border border-slate-700"
            >
              <Printer className="w-4 h-4" />
              <span>Print Certificate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

