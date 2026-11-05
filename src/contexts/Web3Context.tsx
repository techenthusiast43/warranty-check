import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  createConfig,
  http,
  injected,
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChainId,
} from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http as viemHttp,
} from 'viem';
import { botChainTestnet, hardhatLocal } from '../utils/botChain';
import WarrantyCheckABI from '../abis/WarrantyCheck.json';
import contractAddressConfig from '../config/contractAddress.json';

// Local hardhat test accounts for fast multi-role development
export const DEV_ACCOUNTS = [
  {
    role: 'Admin / Initial Seller',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    label: 'Deployer (Account #0)',
  },
  {
    role: 'Authorized Merchant',
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    label: 'Authorized Seller (Account #1)',
  },
  {
    role: 'Standard Retailer',
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    label: 'Revoked/Unauth Seller (Account #2)',
  },
  {
    role: 'Customer / Public',
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    label: 'End Customer (Account #3)',
  },
];

// Reown AppKit Project ID from .env
const rawProjectId = import.meta.env.VITE_REOWN_PROJECT_ID;
export const projectId =
  rawProjectId && !rawProjectId.includes('your_reown') ? rawProjectId.trim() : null;

// Wagmi Config supporting BOT Chain and Localhost
export const wagmiConfig = createConfig({
  chains: [botChainTestnet, hardhatLocal],
  connectors: [injected()],
  transports: {
    [botChainTestnet.id]: http('https://rpc.bohr.life'),
    [hardhatLocal.id]: http('http://127.0.0.1:8545'),
  },
});

export const queryClient = new QueryClient();

interface Web3ContextValue {
  address: string | undefined;
  isConnected: boolean;
  chainId: number;
  isAdmin: boolean;
  isAuthorizedSeller: boolean;
  contractAddress: string;
  isBotChain: boolean;
  connectWallet: () => void;
  disconnectWallet: () => void;
  switchToBotChain: () => Promise<void>;
  switchToLocal: () => Promise<void>;
  updateContractAddress: (newAddress: string) => void;
  refreshRoles: () => Promise<void>;
  simulatedAddress: string | null;
  setSimulatedAddress: (addr: string | null) => void;
  activeAddress: string | undefined;
  projectId: string | null;
}

const Web3Context = createContext<Web3ContextValue | null>(null);

export const Web3ProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const currentChainId = useChainId();

  const [simulatedAddress, setSimulatedAddress] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string>(
    contractAddressConfig.contractAddress
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorizedSeller, setIsAuthorizedSeller] = useState(false);

  const activeAddress = simulatedAddress || address;
  const isBotChain = currentChainId === botChainTestnet.id;

  const publicClient = createPublicClient({
    chain: currentChainId === botChainTestnet.id ? botChainTestnet : hardhatLocal,
    transport: viemHttp(currentChainId === botChainTestnet.id ? 'https://rpc.bohr.life' : 'http://127.0.0.1:8545'),
  });

  const refreshRoles = async () => {
    if (!activeAddress || !contractAddress) {
      setIsAdmin(false);
      setIsAuthorizedSeller(false);
      return;
    }

    try {
      // Check admin
      const adminAddress = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: WarrantyCheckABI,
        functionName: 'admin',
      });

      const userIsAdmin =
        (adminAddress as string).toLowerCase() === activeAddress.toLowerCase();
      setIsAdmin(userIsAdmin);

      // Check seller authorization
      const isAuth = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: WarrantyCheckABI,
        functionName: 'isSellerAuthorized',
        args: [activeAddress as `0x${string}`],
      });

      setIsAuthorizedSeller(Boolean(isAuth));
    } catch (err) {
      console.warn('Could not read contract roles:', err);
      if (activeAddress.toLowerCase() === DEV_ACCOUNTS[0].address.toLowerCase()) {
        setIsAdmin(true);
        setIsAuthorizedSeller(true);
      }
    }
  };

  useEffect(() => {
    refreshRoles();
  }, [activeAddress, contractAddress, currentChainId]);

  const connectWallet = () => {
    const injectedConnector = connectors.find((c) => c.id === 'injected') || connectors[0];
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  const disconnectWallet = () => {
    setSimulatedAddress(null);
    disconnect();
  };

  const switchToBotChain = async () => {
    try {
      if (switchChain) {
        await switchChain({ chainId: botChainTestnet.id });
      }
    } catch (err: any) {
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${botChainTestnet.id.toString(16)}`,
                chainName: botChainTestnet.name,
                rpcUrls: ['https://rpc.bohr.life'],
                nativeCurrency: botChainTestnet.nativeCurrency,
                blockExplorerUrls: ['https://scan.bohr.life'],
              },
            ],
          });
        } catch (addErr) {
          console.error('Failed to add BOT Chain:', addErr);
        }
      }
    }
  };

  const switchToLocal = async () => {
    if (switchChain) {
      await switchChain({ chainId: hardhatLocal.id });
    }
  };

  const updateContractAddress = (newAddress: string) => {
    setContractAddress(newAddress);
  };

  return (
    <Web3Context.Provider
      value={{
        address,
        isConnected: Boolean(activeAddress),
        chainId: currentChainId,
        isAdmin,
        isAuthorizedSeller,
        contractAddress,
        isBotChain,
        connectWallet,
        disconnectWallet,
        switchToBotChain,
        switchToLocal,
        updateContractAddress,
        refreshRoles,
        simulatedAddress,
        setSimulatedAddress,
        activeAddress,
        projectId,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const AppWeb3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Web3ProviderInner>{children}</Web3ProviderInner>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within an AppWeb3Provider');
  }
  return context;
};
