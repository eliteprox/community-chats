import { useEffect, useState } from 'react';
import { calendarService } from '@/services/calendar';
import { web3Service } from '@/services/web3';

/**
 * Custom hook for initializing meeting contract integration
 */
export function useMeetingContract() {
  const [isContractMode, setIsContractMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeContract();
  }, []);

  const initializeContract = async () => {
    try {
      const provider = web3Service.getProvider();
      if (provider) {
        calendarService.setProvider(provider);
        const contractMode = calendarService.isContractMode();
        setIsContractMode(contractMode);
        
        if (contractMode) {
          console.log('✅ Meeting contract mode enabled');
        } else {
          console.log('📝 Using localStorage mode (contract not configured)');
        }
      }
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing meeting contract:', error);
      setIsInitialized(true);
    }
  };

  const reinitialize = () => {
    initializeContract();
  };

  return {
    isContractMode,
    isInitialized,
    reinitialize,
  };
}

