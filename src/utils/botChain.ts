import { defineChain } from 'viem';

export const botChainTestnet = defineChain({
  id: 968,
  name: 'BOT Chain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.bohr.life'],
    },
    public: {
      http: ['https://rpc.bohr.life'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BOT Scan',
      url: 'https://scan.bohr.life',
    },
  },
  testnet: true,
});

export const hardhatLocal = defineChain({
  id: 31337,
  name: 'Hardhat Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Local ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  testnet: true,
});

export const SUPPORTED_CHAINS = [botChainTestnet, hardhatLocal] as const;

export function formatAddress(address?: string | null): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimestamp(timestampInSeconds: number | bigint): string {
  const ts = typeof timestampInSeconds === 'bigint' ? Number(timestampInSeconds) : timestampInSeconds;
  if (!ts || ts === 0) return 'N/A';
  return new Date(ts * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(durationInSeconds: number | bigint): string {
  const dur = typeof durationInSeconds === 'bigint' ? Number(durationInSeconds) : durationInSeconds;
  const days = Math.round(dur / (24 * 3600));
  if (days >= 365) {
    const years = (days / 365).toFixed(1).replace(/\.0$/, '');
    return `${years} Year${Number(years) > 1 ? 's' : ''} (${days} days)`;
  }
  if (days >= 30) {
    const months = Math.round(days / 30);
    return `${months} Month${months > 1 ? 's' : ''} (${days} days)`;
  }
  return `${days} Days`;
}

export function getRemainingTime(expiryTimestamp: number | bigint): {
  isExpired: boolean;
  days: number;
  hours: number;
  minutes: number;
  text: string;
} {
  const exp = typeof expiryTimestamp === 'bigint' ? Number(expiryTimestamp) : expiryTimestamp;
  const now = Math.floor(Date.now() / 1000);
  const diff = exp - now;

  if (diff <= 0) {
    return { isExpired: true, days: 0, hours: 0, minutes: 0, text: 'Expired' };
  }

  const days = Math.floor(diff / (24 * 3600));
  const hours = Math.floor((diff % (24 * 3600)) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  let text = '';
  if (days > 0) text += `${days}d `;
  if (hours > 0 || days > 0) text += `${hours}h `;
  text += `${minutes}m remaining`;

  return { isExpired: false, days, hours, minutes, text };
}

