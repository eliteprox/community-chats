import { useState, useEffect } from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { web3Service } from '@/services/web3';
import { ENSService } from '@/services/ens';
import toast from 'react-hot-toast';

export default function WalletButton() {
  const { user, isConnecting, setUser, setIsConnecting } = useStore();
  const [ensService, setEnsService] = useState<ENSService | null>(null);

  useEffect(() => {
    // Check if already connected
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const provider = web3Service.getProvider();
      if (provider) {
        const address = await web3Service.getCurrentAddress();
        if (address) {
          await fetchUserData(address);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const fetchUserData = async (address: string) => {
    try {
      const provider = web3Service.getProvider();
      if (!provider) return;

      const ens = new ENSService(provider);
      setEnsService(ens);

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

