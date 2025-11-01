import { BrowserProvider } from 'ethers';
import { Web3Service } from './web3';
import { LivepeerServiceRegistry } from './livepeer';
import { ENSService } from './ens';

export interface AuthorizationConfig {
  communityId?: number;
  requireLivepeerRegistration: boolean;
  requireCommunityAccess: boolean;
  allowPublic: boolean;
}

export interface AuthorizationResult {
  hasAccess: boolean;
  reason: string;
  checks: {
    communityAccess?: boolean;
    livepeerRegistration?: boolean;
  };
}

/**
 * Unified authorization service that checks multiple sources:
 * 1. Community Access Contract (custom allowlist)
 * 2. Livepeer Service Registry (registered orchestrators/providers)
 * 3. ENS delegation (future enhancement)
 */
export class AuthorizationService {
  private web3Service: Web3Service;
  private livepeerRegistry: LivepeerServiceRegistry | null = null;
  private ensService: ENSService | null = null;

  constructor(web3Service: Web3Service) {
    this.web3Service = web3Service;
  }

  /**
   * Initialize services with provider
   */
  async initialize(provider: BrowserProvider): Promise<void> {
    this.livepeerRegistry = new LivepeerServiceRegistry(provider);
    this.ensService = new ENSService(provider);
  }

  /**
   * Check if an address is authorized based on configuration
   */
  async checkAuthorization(
    address: string,
    config: AuthorizationConfig
  ): Promise<AuthorizationResult> {
    const checks: AuthorizationResult['checks'] = {};

    // If public access is allowed, grant access immediately
    if (config.allowPublic) {
      return {
        hasAccess: true,
        reason: 'Public access enabled',
        checks,
      };
    }

    let hasAccess = false;
    const reasons: string[] = [];

    // Check 1: Community Access Contract
    if (config.requireCommunityAccess && config.communityId !== undefined) {
      try {
        const communityAccess = await this.web3Service.hasAccess(
          config.communityId,
          address
        );
        checks.communityAccess = communityAccess;

        if (communityAccess) {
          hasAccess = true;
          reasons.push('Community allowlist');
        }
      } catch (error) {
        console.error('Error checking community access:', error);
        checks.communityAccess = false;
      }
    }

    // Check 2: Livepeer Service Registry
    if (config.requireLivepeerRegistration && this.livepeerRegistry) {
      try {
        const isRegistered = await this.livepeerRegistry.isRegistered(address);
        checks.livepeerRegistration = isRegistered;

        if (isRegistered) {
          hasAccess = true;
          reasons.push('Livepeer service provider');
        }
      } catch (error) {
        console.error('Error checking Livepeer registration:', error);
        checks.livepeerRegistration = false;
      }
    }

    // If neither check is required, deny access
    if (!config.requireCommunityAccess && !config.requireLivepeerRegistration) {
      return {
        hasAccess: false,
        reason: 'No authorization method configured',
        checks,
      };
    }

    return {
      hasAccess,
      reason: hasAccess
        ? `Authorized via: ${reasons.join(', ')}`
        : 'Not authorized',
      checks,
    };
  }

  /**
   * Batch check authorization for multiple addresses
   */
  async batchCheckAuthorization(
    addresses: string[],
    config: AuthorizationConfig
  ): Promise<Map<string, AuthorizationResult>> {
    const results = new Map<string, AuthorizationResult>();

    // If public, all have access
    if (config.allowPublic) {
      addresses.forEach((addr) => {
        results.set(addr, {
          hasAccess: true,
          reason: 'Public access enabled',
          checks: {},
        });
      });
      return results;
    }

    // Batch check Livepeer registration if needed
    let livepeerResults: Map<string, boolean> | null = null;
    if (config.requireLivepeerRegistration && this.livepeerRegistry) {
      livepeerResults = await this.livepeerRegistry.batchCheckRegistration(
        addresses
      );
    }

    // Check each address
    for (const address of addresses) {
      const checks: AuthorizationResult['checks'] = {};
      let hasAccess = false;
      const reasons: string[] = [];

      // Check community access
      if (config.requireCommunityAccess && config.communityId !== undefined) {
        try {
          const communityAccess = await this.web3Service.hasAccess(
            config.communityId,
            address
          );
          checks.communityAccess = communityAccess;
          if (communityAccess) {
            hasAccess = true;
            reasons.push('Community allowlist');
          }
        } catch (error) {
          console.error('Error checking community access:', error);
          checks.communityAccess = false;
        }
      }

      // Check Livepeer registration
      if (config.requireLivepeerRegistration && livepeerResults) {
        const isRegistered = livepeerResults.get(address) || false;
        checks.livepeerRegistration = isRegistered;
        if (isRegistered) {
          hasAccess = true;
          reasons.push('Livepeer service provider');
        }
      }

      results.set(address, {
        hasAccess,
        reason: hasAccess
          ? `Authorized via: ${reasons.join(', ')}`
          : 'Not authorized',
        checks,
      });
    }

    return results;
  }

  /**
   * Get detailed participant information including authorization
   */
  async getParticipantInfo(address: string, config: AuthorizationConfig) {
    const [authResult, ensProfile, livepeerService] = await Promise.all([
      this.checkAuthorization(address, config),
      this.ensService?.getProfile(address) || null,
      this.livepeerRegistry?.getServiceInfo(address) || null,
    ]);

    return {
      address,
      authorization: authResult,
      ens: ensProfile,
      livepeer: livepeerService,
      displayName: ensProfile?.name || this.shortenAddress(address),
    };
  }

  /**
   * Shorten address for display
   */
  private shortenAddress(address: string, chars: number = 4): string {
    if (!address) return '';
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
  }

  /**
   * Get Livepeer registry instance
   */
  getLivepeerRegistry(): LivepeerServiceRegistry | null {
    return this.livepeerRegistry;
  }

  /**
   * Get ENS service instance
   */
  getENSService(): ENSService | null {
    return this.ensService;
  }
}

