import { BrowserProvider, Contract } from 'ethers';

// Livepeer ServiceRegistry contract on Arbitrum
const SERVICE_REGISTRY_ADDRESS = '0xC92d3A360b8f9e083bA64DE15d95Cf8180897431';

// ServiceRegistry ABI - key functions for reading registered services
const SERVICE_REGISTRY_ABI = [
  'function getServiceURI(address _serviceProvider) view returns (string)',
  'function numServices() view returns (uint256)',
  'event ServiceURIUpdate(address indexed addr, string serviceURI)',
];

export interface LivepeerService {
  address: string;
  serviceURI: string;
  isRegistered: boolean;
}

export class LivepeerServiceRegistry {
  private contract: Contract;
  private cache: Map<string, LivepeerService> = new Map();

  constructor(provider: BrowserProvider) {
    this.contract = new Contract(
      SERVICE_REGISTRY_ADDRESS,
      SERVICE_REGISTRY_ABI,
      provider
    );
  }

  /**
   * Check if an address is registered in the Livepeer Service Registry
   */
  async isRegistered(address: string): Promise<boolean> {
    try {
      // Check cache first
      if (this.cache.has(address)) {
        return this.cache.get(address)!.isRegistered;
      }

      const serviceURI = await this.contract.getServiceURI(address);
      const isRegistered = serviceURI && serviceURI.length > 0;
      
      this.cache.set(address, {
        address,
        serviceURI,
        isRegistered,
      });

      return isRegistered;
    } catch (error) {
      console.error('Error checking Livepeer registration:', error);
      return false;
    }
  }

  /**
   * Get service URI for a registered address
   */
  async getServiceURI(address: string): Promise<string | null> {
    try {
      if (this.cache.has(address)) {
        return this.cache.get(address)!.serviceURI || null;
      }

      const serviceURI = await this.contract.getServiceURI(address);
      
      if (serviceURI && serviceURI.length > 0) {
        this.cache.set(address, {
          address,
          serviceURI,
          isRegistered: true,
        });
        return serviceURI;
      }

      return null;
    } catch (error) {
      console.error('Error getting service URI:', error);
      return null;
    }
  }

  /**
   * Get information about a Livepeer service provider
   */
  async getServiceInfo(address: string): Promise<LivepeerService | null> {
    try {
      if (this.cache.has(address)) {
        return this.cache.get(address)!;
      }

      const serviceURI = await this.contract.getServiceURI(address);
      const isRegistered = serviceURI && serviceURI.length > 0;
      
      const serviceInfo: LivepeerService = {
        address,
        serviceURI: serviceURI || '',
        isRegistered,
      };

      this.cache.set(address, serviceInfo);
      return serviceInfo;
    } catch (error) {
      console.error('Error getting service info:', error);
      return null;
    }
  }

  /**
   * Get total number of registered services
   */
  async getNumServices(): Promise<number> {
    try {
      const count = await this.contract.numServices();
      return Number(count);
    } catch (error) {
      console.error('Error getting service count:', error);
      return 0;
    }
  }

  /**
   * Batch check multiple addresses
   */
  async batchCheckRegistration(addresses: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    // Process in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const promises = batch.map(async (address) => {
        const isReg = await this.isRegistered(address);
        return { address, isRegistered: isReg };
      });
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ address, isRegistered }) => {
        results.set(address, isRegistered);
      });
    }
    
    return results;
  }

  /**
   * Subscribe to ServiceURIUpdate events
   */
  onServiceUpdate(callback: (address: string, serviceURI: string) => void): void {
    this.contract.on('ServiceURIUpdate', (addr: string, serviceURI: string) => {
      // Update cache
      this.cache.set(addr, {
        address: addr,
        serviceURI,
        isRegistered: serviceURI.length > 0,
      });
      
      callback(addr, serviceURI);
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return SERVICE_REGISTRY_ADDRESS;
  }
}

