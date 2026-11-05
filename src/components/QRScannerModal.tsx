import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Upload, AlertCircle, RefreshCw } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseScannedId = (text: string): string => {
    try {
      if (text.includes('id=')) {
        const url = new URL(text);
        const id = url.searchParams.get('id');
        if (id) return id.trim();
      }
      if (text.startsWith('BOT-WARRANTY:')) {
        return text.replace('BOT-WARRANTY:', '').trim();
      }
    } catch {
      // not a valid URL, treat as raw ID
    }
    return text.trim();
  };

  const startCamera = async () => {
    try {
      setErrorMsg(null);
      const html5QrCode = new Html5Qrcode('qr-reader-view');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          const parsed = parseScannedId(decodedText);
          stopCamera();
          onScanSuccess(parsed);
          onClose();
        },
        () => {
          // ignore frame errors while seeking QR
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setErrorMsg(
        err?.message?.includes('Permission')
          ? 'Camera permission was denied. Please allow camera access or upload an image.'
          : 'Could not access camera. You can upload a QR image below.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error clearing scanner', e);
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow the DOM element to mount
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMsg(null);
      const html5QrCode = new Html5Qrcode('qr-reader-file-temp');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();

      const parsed = parseScannedId(decodedText);
      stopCamera();
      onScanSuccess(parsed);
      onClose();
    } catch {
      setErrorMsg('No readable QR code found in this image. Please try another image.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0e1626] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-slate-100">Scan Product QR Code</h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="p-6 space-y-4 text-center">
          <div className="relative mx-auto w-full aspect-square max-w-[300px] bg-black/60 rounded-2xl border-2 border-cyan-500/40 overflow-hidden flex items-center justify-center">
            <div id="qr-reader-view" className="w-full h-full" />
            <div id="qr-reader-file-temp" className="hidden" />

            {!isScanning && !errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 p-4">
                <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                <span className="text-sm">Initializing camera...</span>
              </div>
            )}

            {/* Scanning reticle */}
            {isScanning && (
              <div className="absolute inset-8 border-2 border-cyan-400/80 rounded-xl pointer-events-none animate-pulse" />
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 text-left rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Center the WarrantyCheck QR code in the camera frame to instantly verify on BOT Chain.
          </p>

          {/* Alternative File Upload */}
          <div className="pt-2 border-t border-slate-800">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Upload QR Code Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

