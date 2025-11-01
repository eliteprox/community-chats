import { BrowserProvider, Contract, Eip1193Provider } from 'ethers';
import { config, CHAIN_CONFIG } from '@/config';

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export class Web3Service {
  private provider: BrowserProvider | null = null;
  private contract: Contract | null = null;

  async connect(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask or compatible wallet not found. Please install MetaMask.');
    }

    try {
      this.provider = new BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Check and switch to correct network
      await this.ensureCorrectNetwork();

      return accounts[0];
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  async ensureCorrectNetwork(): Promise<void> {
    if (!this.provider || !window.ethereum) {
      throw new Error('Provider not initialized');
    }

    const network = await this.provider.getNetwork();
    const targetChainId = config.enableTestnet 
      ? config.arbitrumTestnetChainId 
      : config.arbitrumChainId;

    if (network.chainId.toString() !== targetChainId) {
      const chainConfig = config.enableTestnet 
        ? CHAIN_CONFIG.arbitrumTestnet 
        : CHAIN_CONFIG.arbitrum;

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainConfig.chainId }],
        });
      } catch (switchError: unknown) {
        // This error code indicates that the chain has not been added to MetaMask
        if ((switchError as { code?: number }).code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [chainConfig],
            });
          } catch (addError) {
            console.error('Error adding network:', addError);
            throw new Error('Failed to add network to wallet');
          }
        } else {
          console.error('Error switching network:', switchError);
          throw new Error('Failed to switch network');
        }
      }
    }
  }

  async getContract(): Promise<Contract> {
    if (!this.provider) {
      throw new Error('Provider not initialized. Call connect() first.');
    }

    if (this.contract) {
      return this.contract;
    }

    if (!config.communityAccessContract) {
      throw new Error('Community Access contract address not configured');
    }

    const signer = await this.provider.getSigner();
    
    // ABI for CommunityAccess contract
    const abi = [
      'function createCommunity(string name, string description, bool requireLivepeerRegistration) returns (uint256)',
      'function addParticipantToCommunity(uint256 communityId, address participant)',
      'function addParticipantsToCommunity(uint256 communityId, address[] participants)',
      'function removeParticipantFromCommunity(uint256 communityId, address participant)',
      'function hasAccess(uint256 communityId, address participant) view returns (bool)',
      'function getCommunityParticipants(uint256 communityId) view returns (address[])',
      'function getCommunityInfo(uint256 communityId) view returns (string name, string description, address owner, uint256 createdAt, bool isActive, uint256 participantCount)',
      'function getUserCommunities(address user) view returns (uint256[])',
      'function updateCommunity(uint256 communityId, string name, string description)',
      'function deactivateCommunity(uint256 communityId)',
      'function communityCount() view returns (uint256)',
      'event CommunityCreated(uint256 indexed communityId, address indexed owner, string name)',
      'event ParticipantAdded(address indexed participant, uint256 timestamp)',
      'event ParticipantRemoved(address indexed participant, uint256 timestamp)',
    ];

    this.contract = new Contract(config.communityAccessContract, abi, signer);
    return this.contract;
  }

  async disconnect(): Promise<void> {
    this.provider = null;
    this.contract = null;
  }

  getProvider(): BrowserProvider | null {
    return this.provider;
  }

  async getCurrentAddress(): Promise<string | null> {
    if (!this.provider) {
      return null;
    }

    try {
      const signer = await this.provider.getSigner();
      return await signer.getAddress();
    } catch (error) {
      console.error('Error getting current address:', error);
      return null;
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const signer = await this.provider.getSigner();
    return await signer.signMessage(message);
  }

  // Community methods
  async createCommunity(name: string, description: string, requireLivepeer: boolean = false): Promise<number> {
    const contract = await this.getContract();
    const tx = await contract.createCommunity(name, description, requireLivepeer);
    const receipt = await tx.wait();
    
    // Find CommunityCreated event
    const event = receipt.logs
      .map((log: unknown) => {
        try {
          return contract.interface.parseLog(log as { topics: string[]; data: string });
        } catch {
          return null;
        }
      })
      .find((parsed: { name: string } | null) => parsed?.name === 'CommunityCreated');

    if (event && event.args) {
      return Number(event.args.communityId);
    }

    throw new Error('Community creation failed');
  }

  async addParticipant(communityId: number, address: string): Promise<void> {
    const contract = await this.getContract();
    const tx = await contract.addParticipantToCommunity(communityId, address);
    await tx.wait();
  }

  async addParticipants(communityId: number, addresses: string[]): Promise<void> {
    const contract = await this.getContract();
    const tx = await contract.addParticipantsToCommunity(communityId, addresses);
    await tx.wait();
  }

  async removeParticipant(communityId: number, address: string): Promise<void> {
    const contract = await this.getContract();
    const tx = await contract.removeParticipantFromCommunity(communityId, address);
    await tx.wait();
  }

  async hasAccess(communityId: number, address: string): Promise<boolean> {
    const contract = await this.getContract();
    return await contract.hasAccess(communityId, address);
  }

  async getCommunityParticipants(communityId: number): Promise<string[]> {
    const contract = await this.getContract();
    return await contract.getCommunityParticipants(communityId);
  }

  async getCommunityInfo(communityId: number) {
    const contract = await this.getContract();
    const [name, description, owner, createdAt, isActive, participantCount] = 
      await contract.getCommunityInfo(communityId);
    
    return {
      id: communityId,
      name,
      description,
      owner,
      createdAt: Number(createdAt),
      isActive,
      participantCount: Number(participantCount),
    };
  }

  async getUserCommunities(address: string): Promise<number[]> {
    const contract = await this.getContract();
    const communities = await contract.getUserCommunities(address);
    return communities.map((id: bigint) => Number(id));
  }

  async getCommunityCount(): Promise<number> {
    const contract = await this.getContract();
    const count = await contract.communityCount();
    return Number(count);
  }
}

export const web3Service = new Web3Service();

