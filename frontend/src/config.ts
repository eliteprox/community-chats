export const config = {
  arbitrumChainId: import.meta.env?.VITE_ARBITRUM_CHAIN_ID || '42161',
  arbitrumTestnetChainId: import.meta.env?.VITE_ARBITRUM_TESTNET_CHAIN_ID || '421614',
  communityAccessContract: import.meta.env?.VITE_COMMUNITY_ACCESS_CONTRACT || '',
  meetingSchedulerContract: import.meta.env?.VITE_MEETING_SCHEDULER_CONTRACT || '',
  defaultWhipUrl: import.meta.env?.VITE_DEFAULT_WHIP_URL || '',
  defaultRtmpUrl: import.meta.env?.VITE_DEFAULT_RTMP_URL || '',
  enableTestnet: import.meta.env?.VITE_ENABLE_TESTNET === 'true',
  gunRelayUrl: import.meta.env?.VITE_GUN_RELAY_URL || '',
} as const;

export const CHAIN_CONFIG = {
  arbitrum: {
    chainId: '0xa4b1', // 42161 in hex
    chainName: 'Arbitrum One',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
  },
  arbitrumTestnet: {
    chainId: '0x66eee', // 421614 in hex
    chainName: 'Arbitrum Sepolia',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://sepolia.arbiscan.io'],
  },
} as const;
