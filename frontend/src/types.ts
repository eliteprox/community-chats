export interface User {
  address: string;
  ensName: string | null;
  ensAvatar: string | null;
  displayName: string;
}

export interface Community {
  id: number;
  name: string;
  description: string;
  owner: string;
  createdAt: number;
  isActive: boolean;
  participantCount: number;
}

export interface Participant {
  address: string;
  ensName: string | null;
  ensAvatar: string | null;
  displayName: string;
  audioStream?: MediaStream;
  isHost?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
}

export interface Meeting {
  id: string;
  communityId: number;
  title: string;
  description: string;
  scheduledTime: Date;
  duration: number; // in minutes
  hostAddress: string;
  whipUrl?: string;
  rtmpUrl?: string;
  isRecording: boolean;
  participants: Participant[];
  status: 'scheduled' | 'live' | 'ended';
}

export interface AudioConfig {
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface StreamConfig {
  whipUrl?: string;
  rtmpUrl?: string;
  bitrate: number;
  codec: string;
}

