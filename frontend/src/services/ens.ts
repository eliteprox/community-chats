import { BrowserProvider } from 'ethers';

export interface ENSProfile {
  name: string | null;
  avatar: string | null;
  description: string | null;
  url: string | null;
  twitter: string | null;
  github: string | null;
  email: string | null;
}

export class ENSService {
  private provider: BrowserProvider;
  private cache: Map<string, ENSProfile> = new Map();

  constructor(provider: BrowserProvider) {
    this.provider = provider;
  }

  /**
   * Resolve ENS name to address
   */
  async resolveNameToAddress(ensName: string): Promise<string | null> {
    try {
      const address = await this.provider.resolveName(ensName);
      return address;
    } catch (error) {
      console.error('Error resolving ENS name:', error);
      return null;
    }
  }

  /**
   * Resolve address to ENS name (reverse lookup)
   */
  async resolveAddressToName(address: string): Promise<string | null> {
    try {
      const ensName = await this.provider.lookupAddress(address);
      return ensName;
    } catch (error) {
      console.error('Error looking up ENS name:', error);
      return null;
    }
  }

  /**
   * Get ENS avatar URL for an address or ENS name
   */
  async getAvatar(addressOrName: string): Promise<string | null> {
    try {
      const avatar = await this.provider.getAvatar(addressOrName);
      return avatar;
    } catch (error) {
      console.error('Error getting ENS avatar:', error);
      return null;
    }
  }

  /**
   * Get full ENS profile including text records
   */
  async getProfile(address: string): Promise<ENSProfile> {
    // Check cache first
    if (this.cache.has(address)) {
      return this.cache.get(address)!;
    }

    try {
      const name = await this.resolveAddressToName(address);
      
      if (!name) {
        const emptyProfile: ENSProfile = {
          name: null,
          avatar: null,
          description: null,
          url: null,
          twitter: null,
          github: null,
          email: null,
        };
        this.cache.set(address, emptyProfile);
        return emptyProfile;
      }

      const resolver = await this.provider.getResolver(name);
      
      if (!resolver) {
        const basicProfile: ENSProfile = {
          name,
          avatar: await this.getAvatar(name),
          description: null,
          url: null,
          twitter: null,
          github: null,
          email: null,
        };
        this.cache.set(address, basicProfile);
        return basicProfile;
      }

      // Get text records
      const [avatar, description, url, twitter, github, email] = await Promise.all([
        this.getAvatar(name),
        resolver.getText('description').catch(() => null),
        resolver.getText('url').catch(() => null),
        resolver.getText('com.twitter').catch(() => null),
        resolver.getText('com.github').catch(() => null),
        resolver.getText('email').catch(() => null),
      ]);

      const profile: ENSProfile = {
        name,
        avatar,
        description,
        url,
        twitter,
        github,
        email,
      };

      this.cache.set(address, profile);
      return profile;
    } catch (error) {
      console.error('Error getting ENS profile:', error);
      const emptyProfile: ENSProfile = {
        name: null,
        avatar: null,
        description: null,
        url: null,
        twitter: null,
        github: null,
        email: null,
      };
      return emptyProfile;
    }
  }

  /**
   * Get display name for address (ENS name or shortened address)
   */
  async getDisplayName(address: string): Promise<string> {
    const ensName = await this.resolveAddressToName(address);
    if (ensName) {
      return ensName;
    }
    return this.shortenAddress(address);
  }

  /**
   * Shorten Ethereum address for display
   */
  shortenAddress(address: string, chars: number = 4): string {
    if (!address) return '';
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get delegate addresses from ENS profile
   * Note: This requires the ENS name to have delegate records set
   */
  async getDelegates(ensName: string): Promise<string[]> {
    try {
      const resolver = await this.provider.getResolver(ensName);
      if (!resolver) {
        return [];
      }

      // Try to get delegate text record
      // Format: delegate.0, delegate.1, etc.
      const delegates: string[] = [];
      for (let i = 0; i < 10; i++) {
        try {
          const delegate = await resolver.getText(`delegate.${i}`);
          if (delegate) {
            delegates.push(delegate);
          } else {
            break;
          }
        } catch {
          break;
        }
      }

      return delegates;
    } catch (error) {
      console.error('Error getting delegates:', error);
      return [];
    }
  }

  /**
   * Batch resolve addresses to names
   */
  async batchResolveNames(addresses: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const promises = batch.map(async (address) => {
        const name = await this.resolveAddressToName(address);
        return { address, name };
      });
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ address, name }) => {
        results.set(address, name);
      });
    }
    
    return results;
  }

  /**
   * Batch get avatars
   */
  async batchGetAvatars(addresses: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
    const batchSize = 5;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const promises = batch.map(async (address) => {
        const avatar = await this.getAvatar(address);
        return { address, avatar };
      });
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ address, avatar }) => {
        results.set(address, avatar);
      });
    }
    
    return results;
  }
}

