/**
 * Etherscan API v2 Integration for Arbitrum
 * Uses Etherscan's unified API with chainId parameter
 * Supports Arbitrum One (42161) and Arbitrum Sepolia (421614)
 */

// Etherscan v2 endpoint (unified across all chains)
const ETHERSCAN_API_BASE = 'https://api.etherscan.io/v2/api';

// Chain IDs
const CHAIN_IDS = {
  arbitrumOne: '42161',
  arbitrumSepolia: '421614',
  ethereum: '1',
  sepolia: '11155111',
} as const;

export interface Transaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  isError: string;
  input: string;
  contractAddress?: string;
  functionName?: string;
}

export interface ContractInfo {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

export class EtherscanService {
  private apiKey: string;
  private chainId: string;
  private isTestnet: boolean;

  constructor(apiKey: string = '', isTestnet: boolean = true) {
    this.apiKey = apiKey;
    this.isTestnet = isTestnet;
    this.chainId = isTestnet ? CHAIN_IDS.arbitrumSepolia : CHAIN_IDS.arbitrumOne;
  }

  /**
   * Get transactions for an address
   */
  async getTransactions(
    address: string,
    startBlock: number = 0,
    endBlock: number = 99999999,
    page: number = 1,
    offset: number = 100,
    sort: 'asc' | 'desc' = 'desc'
  ): Promise<Transaction[]> {
    const params = new URLSearchParams({
      chainid: this.chainId,
      module: 'account',
      action: 'txlist',
      address,
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      page: page.toString(),
      offset: offset.toString(),
      sort,
      apikey: this.apiKey,
    });

    const response = await fetch(`${ETHERSCAN_API_BASE}?${params}`);
    const data = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result;
    }

    if (data.message === 'No transactions found') {
      return [];
    }

    throw new Error(data.message || 'Failed to fetch transactions');
  }

  /**
   * Get contract ABI
   */
  async getContractABI(contractAddress: string): Promise<string> {
    const params = new URLSearchParams({
      chainid: this.chainId,
      module: 'contract',
      action: 'getabi',
      address: contractAddress,
      apikey: this.apiKey,
    });

    const response = await fetch(`${ETHERSCAN_API_BASE}?${params}`);
    const data = await response.json();

    if (data.status === '1') {
      return data.result;
    }

    throw new Error(data.message || 'Failed to fetch contract ABI');
  }

  /**
   * Get contract source code
   */
  async getContractSource(contractAddress: string): Promise<ContractInfo> {
    const params = new URLSearchParams({
      chainid: this.chainId,
      module: 'contract',
      action: 'getsourcecode',
      address: contractAddress,
      apikey: this.apiKey,
    });

    const response = await fetch(`${ETHERSCAN_API_BASE}?${params}`);
    const data = await response.json();

    if (data.status === '1' && data.result && data.result[0]) {
      return data.result[0];
    }

    throw new Error(data.message || 'Failed to fetch contract source');
  }

  /**
   * Get ETH balance for address
   */
  async getBalance(address: string): Promise<string> {
    const params = new URLSearchParams({
      chainid: this.chainId,
      module: 'account',
      action: 'balance',
      address,
      tag: 'latest',
      apikey: this.apiKey,
    });

    const response = await fetch(`${ETHERSCAN_API_BASE}?${params}`);
    const data = await response.json();

    if (data.status === '1') {
      return data.result;
    }

    throw new Error(data.message || 'Failed to fetch balance');
  }

  /**
   * Get internal transactions (contract calls)
   */
  async getInternalTransactions(
    address: string,
    startBlock: number = 0,
    endBlock: number = 99999999
  ): Promise<Transaction[]> {
    const params = new URLSearchParams({
      chainid: this.chainId,
      module: 'account',
      action: 'txlistinternal',
      address,
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      sort: 'desc',
      apikey: this.apiKey,
    });

    const response = await fetch(`${ETHERSCAN_API_BASE}?${params}`);
    const data = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result;
    }

    if (data.message === 'No transactions found') {
      return [];
    }

    throw new Error(data.message || 'Failed to fetch internal transactions');
  }

  /**
   * Get contract creation transaction
   */
  async getContractCreation(contractAddress: string): Promise<{
    contractAddress: string;
    contractCreator: string;
    txHash: string;
  }> {
    const params = new URLSearchParams({
      chainid: this.chainId,
      module: 'contract',
      action: 'getcontractcreation',
      contractaddresses: contractAddress,
      apikey: this.apiKey,
    });

    const response = await fetch(`${ETHERSCAN_API_BASE}?${params}`);
    const data = await response.json();

    if (data.status === '1' && data.result && data.result[0]) {
      return data.result[0];
    }

    throw new Error(data.message || 'Failed to fetch contract creation info');
  }

  /**
   * Get event logs for a contract
   */
  async getLogs(
    contractAddress: string,
    fromBlock: number = 0,
    toBlock: number = 99999999,
    topic0?: string
  ): Promise<any[]> {
    const params: Record<string, string> = {
      chainid: this.chainId,
      module: 'logs',
      action: 'getLogs',
      address: contractAddress,
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      apikey: this.apiKey,
    };

    if (topic0) {
      params.topic0 = topic0;
    }

    const response = await fetch(
      `${ETHERSCAN_API_BASE}?${new URLSearchParams(params)}`
    );
    const data = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result;
    }

    if (data.message === 'No records found') {
      return [];
    }

    throw new Error(data.message || 'Failed to fetch logs');
  }

  /**
   * Verify contract source code
   */
  async verifyContract(params: {
    contractAddress: string;
    sourceCode: string;
    contractName: string;
    compilerVersion: string;
    optimizationUsed: boolean;
    runs: number;
    constructorArguments?: string;
  }): Promise<string> {
    const formData = new URLSearchParams({
      chainid: this.chainId,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: params.contractAddress,
      sourceCode: params.sourceCode,
      codeformat: 'solidity-single-file',
      contractname: params.contractName,
      compilerversion: params.compilerVersion,
      optimizationUsed: params.optimizationUsed ? '1' : '0',
      runs: params.runs.toString(),
      constructorArguements: params.constructorArguments || '',
      apikey: this.apiKey,
    });

    const response = await fetch(ETHERSCAN_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await response.json();

    if (data.status === '1') {
      return data.result; // Returns GUID for verification status check
    }

    throw new Error(data.result || 'Failed to submit contract for verification');
  }

  /**
   * Check verification status
   */
  async checkVerificationStatus(guid: string): Promise<string> {
    const params = new URLSearchParams({
      chainid: this.chainId,
      module: 'contract',
      action: 'checkverifystatus',
      guid,
      apikey: this.apiKey,
    });

    const response = await fetch(`${ETHERSCAN_API_BASE}?${params}`);
    const data = await response.json();

    if (data.status === '1') {
      return data.result;
    }

    throw new Error(data.result || 'Verification check failed');
  }

  /**
   * Get gas oracle (current gas prices)
   */
  async getGasOracle(): Promise<{
    suggestBaseFee: string;
    gasUsedRatio: string;
  }> {
    const params = new URLSearchParams({
      chainid: this.chainId,
      module: 'gastracker',
      action: 'gasoracle',
      apikey: this.apiKey,
    });

    const response = await fetch(`${ETHERSCAN_API_BASE}?${params}`);
    const data = await response.json();

    if (data.status === '1') {
      return data.result;
    }

    throw new Error(data.message || 'Failed to fetch gas oracle');
  }

  /**
   * Get Arbiscan URL for address/transaction
   */
  getExplorerUrl(hashOrAddress: string, type: 'tx' | 'address' | 'token' = 'address'): string {
    const baseExplorer = this.isTestnet
      ? 'https://sepolia.arbiscan.io'
      : 'https://arbiscan.io';

    return `${baseExplorer}/${type}/${hashOrAddress}`;
  }
}

// Create singleton instances
// Note: Uses Etherscan API v2 with chainId for Arbitrum
export const arbiscanMainnet = new EtherscanService(
  import.meta.env?.VITE_ETHERSCAN_API_KEY || '',
  false
);

export const arbiscanTestnet = new EtherscanService(
  import.meta.env?.VITE_ETHERSCAN_API_KEY || '',
  true
);

// Backwards compatibility exports
export const ArbiscanService = EtherscanService;

