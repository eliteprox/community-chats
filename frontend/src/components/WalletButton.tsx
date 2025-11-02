import { useEffect } from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { web3Service } from '@/services/web3';
import { calendarService } from '@/services/calendar';
import { ENSService } from '@/services/ens';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'community_chats_wallet';

export default function WalletButton() {
  const { user, isConnecting, setUser, setIsConnecting } = useStore();

  useEffect(() => {
    // Auto-reconnect on page load if previously connected
    autoReconnect();

    // Listen for account changes in MetaMask
    if (window.ethereum && (window.ethereum as any).on) {
      (window.ethereum as any).on('accountsChanged', handleAccountsChanged);
      (window.ethereum as any).on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum && (window.ethereum as any).removeListener) {
        (window.ethereum as any).removeListener('accountsChanged', handleAccountsChanged);
        (window.ethereum as any).removeListener('chainChanged', handleChainChanged);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoReconnect = async () => {
    try {
      // Check if user was previously connected
      const savedAddress = localStorage.getItem(STORAGE_KEY);
      
      if (!savedAddress || !window.ethereum) {
        return;
      }

      // Check if MetaMask is still connected to the same account
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      }) as string[];

      if (accounts.length === 0) {
        // User disconnected from MetaMask
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const currentAccount = accounts[0].toLowerCase();
      
      if (currentAccount === savedAddress.toLowerCase()) {
        // Auto-reconnect without requiring signature
        console.log('Auto-reconnecting to wallet:', currentAccount);
        await web3Service.connect();
        await fetchUserData(currentAccount);
        
        // Initialize calendar contract mode after connection
        const provider = web3Service.getProvider();
        if (provider) {
          calendarService.setProvider(provider);
          if (calendarService.isContractMode()) {
            console.log('✅ Meeting contract mode enabled (on-chain meetings)');
          }
        }
        
        console.log('✅ Wallet auto-reconnected');
      } else {
        // Different account, clear saved data
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error auto-reconnecting:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected
      handleDisconnect();
    } else {
      // User switched accounts
      const newAddress = accounts[0];
      console.log('Account changed to:', newAddress);
      await fetchUserData(newAddress);
      localStorage.setItem(STORAGE_KEY, newAddress.toLowerCase());
      
      // Reinitialize calendar with new provider
      const provider = web3Service.getProvider();
      if (provider) {
        calendarService.setProvider(provider);
      }
    }
  };

  const handleChainChanged = () => {
    // Reload page on chain change (recommended by MetaMask)
    window.location.reload();
  };

  const fetchUserData = async (address: string) => {
    try {
      const provider = web3Service.getProvider();
      if (!provider) return;

      const ens = new ENSService(provider);
      const profile = await ens.getProfile(address);
      const displayName = profile.name || ens.shortenAddress(address);

      setUser({
        address,
        ensName: profile.name,
        ensAvatar: profile.avatar,
        displayName,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser({
        address,
        ensName: null,
        ensAvatar: null,
        displayName: address.slice(0, 6) + '...' + address.slice(-4),
      });
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const address = await web3Service.connect();
      await fetchUserData(address);
      
      // Save connection for auto-reconnect
      localStorage.setItem(STORAGE_KEY, address.toLowerCase());
      
      // Initialize calendar contract mode
      const provider = web3Service.getProvider();
      if (provider) {
        calendarService.setProvider(provider);
        if (calendarService.isContractMode()) {
          console.log('✅ Meeting contract mode enabled');
          toast.success('On-chain meetings enabled', { icon: '⛓️' });
        }
      }
      
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to connect wallet'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await web3Service.disconnect();
    setUser(null);
    
    // Clear saved connection
    localStorage.removeItem(STORAGE_KEY);
    
    toast.success('Wallet disconnected');
  };

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3 glass rounded-lg px-4 py-2">
          {user.ensAvatar ? (
            <img
              src={user.ensAvatar}
              alt={user.displayName}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user.displayName[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="text-sm">
            <div className="font-medium text-white">{user.displayName}</div>
            {user.ensName && (
              <div className="text-xs text-gray-400">{user.address.slice(0, 6)}...{user.address.slice(-4)}</div>
            )}
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="flex items-center space-x-2 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Wallet className="w-5 h-5" />
      <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
    </button>
  );
}

