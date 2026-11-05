import React from 'react';
import { ShieldCheck, ShieldAlert, Clock, AlertTriangle } from 'lucide-react';

export type WarrantyStatusType = 0 | 1 | 2 | 'Active' | 'Expired' | 'Void';

interface StatusBadgeProps {
  status: WarrantyStatusType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const normalized =
    status === 0 || status === 'Active'
      ? 'Active'
      : status === 1 || status === 'Expired'
      ? 'Expired'
      : 'Void';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 gap-1',
    md: 'text-sm px-3.5 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2 font-semibold',
  }[size];

  if (normalized === 'Active') {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] ${sizeClasses}`}
      >
        {showIcon && <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />}
        <span>Active Warranty</span>
      </span>
    );
  }

  if (normalized === 'Expired') {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 ${sizeClasses}`}
      >
        {showIcon && <Clock className="w-4 h-4 text-amber-400 shrink-0" />}
        <span>Warranty Expired</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_-3px_rgba(244,63,94,0.3)] ${sizeClasses}`}
    >
      {showIcon && <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />}
      <span>Warranty Voided</span>
    </span>
  );
};

