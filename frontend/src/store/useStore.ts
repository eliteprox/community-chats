import { create } from 'zustand';
import { User, Community, Participant, Meeting } from '@/types';

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  
  // Community state
  communities: Community[];
  selectedCommunity: Community | null;
  
  // Meeting state
  currentMeeting: Meeting | null;
  participants: Participant[];
  
  // Audio state
  isAudioEnabled: boolean;
  isMuted: boolean;
  isStreaming: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setCommunities: (communities: Community[]) => void;
  setSelectedCommunity: (community: Community | null) => void;
  setCurrentMeeting: (meeting: Meeting | null) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (address: string) => void;
  updateParticipant: (address: string, updates: Partial<Participant>) => void;
  setParticipants: (participants: Participant[]) => void;
  setIsAudioEnabled: (enabled: boolean) => void;
  setIsMuted: (muted: boolean) => void;
  setIsStreaming: (streaming: boolean) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isConnecting: false,
  communities: [],
  selectedCommunity: null,
  currentMeeting: null,
  participants: [],
  isAudioEnabled: false,
  isMuted: false,
  isStreaming: false,

  // Actions
  setUser: (user) =>
    set({ user, isAuthenticated: user !== null }),

  setIsConnecting: (isConnecting) =>
    set({ isConnecting }),

  setCommunities: (communities) =>
    set({ communities }),

  setSelectedCommunity: (community) =>
    set({ selectedCommunity: community }),

  setCurrentMeeting: (meeting) =>
    set({ currentMeeting: meeting }),

  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants, participant],
    })),

  removeParticipant: (address) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.address !== address),
    })),

  updateParticipant: (address, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.address === address ? { ...p, ...updates } : p
      ),
    })),

  setParticipants: (participants) =>
    set({ participants }),

  setIsAudioEnabled: (enabled) =>
    set({ isAudioEnabled: enabled }),

  setIsMuted: (muted) =>
    set({ isMuted: muted }),

  setIsStreaming: (streaming) =>
    set({ isStreaming: streaming }),

  reset: () =>
    set({
      user: null,
      isAuthenticated: false,
      isConnecting: false,
      communities: [],
      selectedCommunity: null,
      currentMeeting: null,
      participants: [],
      isAudioEnabled: false,
      isMuted: false,
      isStreaming: false,
    }),
}));

