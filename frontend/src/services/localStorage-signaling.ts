import { Participant } from '@/types';

/**
 * LocalStorage-based WebRTC Signaling
 * Works for testing on same computer with different browsers
 * No Gun.js relay needed!
 */
export class LocalStorageSignalingService {
  private meetingId: string = '';
  private participantId: string = '';
  private onParticipantJoinedCallback?: (participant: Participant) => void;
  private onParticipantLeftCallback?: (participantId: string) => void;
  private onOfferCallback?: (participantId: string, offer: RTCSessionDescriptionInit) => void;
  private onAnswerCallback?: (participantId: string, answer: RTCSessionDescriptionInit) => void;
  private onIceCandidateCallback?: (participantId: string, candidate: RTCIceCandidateInit) => void;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastSeenTimestamp: number = 0;

  async connect(meetingId: string, participantId: string, participantData: any): Promise<void> {
    this.meetingId = meetingId;
    this.participantId = participantId;

    // Announce presence
    this.announcePresence(participantData);

    // Start polling for signaling messages
    this.startPolling();

    console.log('✅ LocalStorage signaling initialized (same-computer P2P)');
  }

  private announcePresence(participantData: any): void {
    const key = `meeting_${this.meetingId}_participants`;
    const participants = JSON.parse(localStorage.getItem(key) || '{}');
    
    participants[this.participantId] = {
      ...participantData,
      address: this.participantId,
      lastSeen: Date.now(),
    };
    
    localStorage.setItem(key, JSON.stringify(participants));

    // Notify other tabs
    window.dispatchEvent(new CustomEvent('participant-joined', {
      detail: { meetingId: this.meetingId, participant: participants[this.participantId] }
    }));
  }

  private startPolling(): void {
    // Listen for storage events (cross-tab communication)
    window.addEventListener('storage', this.handleStorageChange);
    window.addEventListener('participant-joined', this.handleParticipantJoined as any);

    // Poll for signaling messages
    this.pollInterval = setInterval(() => {
      this.checkForSignalingMessages();
      this.updateHeartbeat();
      this.checkForInactiveParticipants();
    }, 1000);
  }

  private handleStorageChange = (event: StorageEvent) => {
    if (!event.key?.startsWith(`meeting_${this.meetingId}_`)) return;

    // Handle signaling messages
    if (event.key.includes('_offers_')) {
      const data = event.newValue ? JSON.parse(event.newValue) : null;
      if (data && this.onOfferCallback) {
        this.onOfferCallback(data.from, data.offer);
      }
    } else if (event.key.includes('_answers_')) {
      const data = event.newValue ? JSON.parse(event.newValue) : null;
      if (data && this.onAnswerCallback) {
        this.onAnswerCallback(data.from, data.answer);
      }
    } else if (event.key.includes('_ice_')) {
      const data = event.newValue ? JSON.parse(event.newValue) : null;
      if (data && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(data.from, data.candidate);
      }
    }
  };

  private handleParticipantJoined = (event: CustomEvent) => {
    if (event.detail.meetingId !== this.meetingId) return;
    if (event.detail.participant.address === this.participantId) return;

    if (this.onParticipantJoinedCallback) {
      this.onParticipantJoinedCallback(event.detail.participant);
    }
  };

  private checkForSignalingMessages(): void {
    // Check for offers
    const offersKey = `meeting_${this.meetingId}_offers_${this.participantId}`;
    const offers = JSON.parse(localStorage.getItem(offersKey) || '{}');
    
    Object.entries(offers).forEach(([from, data]: [string, any]) => {
      if (data && data.timestamp > this.lastSeenTimestamp && this.onOfferCallback) {
        this.onOfferCallback(from, data.offer);
        this.lastSeenTimestamp = data.timestamp;
      }
    });

    // Check for answers
    const answersKey = `meeting_${this.meetingId}_answers_${this.participantId}`;
    const answers = JSON.parse(localStorage.getItem(answersKey) || '{}');
    
    Object.entries(answers).forEach(([from, data]: [string, any]) => {
      if (data && data.timestamp > this.lastSeenTimestamp && this.onAnswerCallback) {
        this.onAnswerCallback(from, data.answer);
        this.lastSeenTimestamp = data.timestamp;
      }
    });

    // Check for ICE candidates
    const iceKey = `meeting_${this.meetingId}_ice_${this.participantId}`;
    const ice = JSON.parse(localStorage.getItem(iceKey) || '{}');
    
    Object.entries(ice).forEach(([_, data]: [string, any]) => {
      if (data && data.timestamp > this.lastSeenTimestamp && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(data.from, data.candidate);
        this.lastSeenTimestamp = data.timestamp;
      }
    });
  }

  private updateHeartbeat(): void {
    const key = `meeting_${this.meetingId}_participants`;
    const participants = JSON.parse(localStorage.getItem(key) || '{}');
    
    if (participants[this.participantId]) {
      participants[this.participantId].lastSeen = Date.now();
      localStorage.setItem(key, JSON.stringify(participants));
    }
  }

  private checkForInactiveParticipants(): void {
    const key = `meeting_${this.meetingId}_participants`;
    const participants = JSON.parse(localStorage.getItem(key) || '{}');
    
    Object.entries(participants).forEach(([id, data]: [string, any]) => {
      if (id === this.participantId) return;
      
      const isActive = data.lastSeen && (Date.now() - data.lastSeen < 15000);
      if (!isActive && this.onParticipantLeftCallback) {
        this.onParticipantLeftCallback(id);
      }
    });
  }

  sendOffer(participantId: string, offer: RTCSessionDescriptionInit): void {
    const key = `meeting_${this.meetingId}_offers_${participantId}`;
    const offers = JSON.parse(localStorage.getItem(key) || '{}');
    offers[this.participantId] = { from: this.participantId, offer, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(offers));
    console.log('📤 Offer sent via localStorage to:', participantId);
  }

  sendAnswer(participantId: string, answer: RTCSessionDescriptionInit): void {
    const key = `meeting_${this.meetingId}_answers_${participantId}`;
    const answers = JSON.parse(localStorage.getItem(key) || '{}');
    answers[this.participantId] = { from: this.participantId, answer, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(answers));
    console.log('📤 Answer sent via localStorage to:', participantId);
  }

  sendIceCandidate(participantId: string, candidate: RTCIceCandidate): void {
    const key = `meeting_${this.meetingId}_ice_${participantId}`;
    const ice = JSON.parse(localStorage.getItem(key) || '{}');
    const candidateId = `${this.participantId}_${Date.now()}`;
    ice[candidateId] = { from: this.participantId, candidate: candidate.toJSON(), timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(ice));
  }

  onParticipantJoined(callback: (participant: Participant) => void): void {
    this.onParticipantJoinedCallback = callback;
  }

  onParticipantLeft(callback: (participantId: string) => void): void {
    this.onParticipantLeftCallback = callback;
  }

  onOffer(callback: (participantId: string, offer: RTCSessionDescriptionInit) => void): void {
    this.onOfferCallback = callback;
  }

  onAnswer(callback: (participantId: string, answer: RTCSessionDescriptionInit) => void): void {
    this.onAnswerCallback = callback;
  }

  onIceCandidate(callback: (participantId: string, candidate: RTCIceCandidateInit) => void): void {
    this.onIceCandidateCallback = callback;
  }

  disconnect(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    window.removeEventListener('storage', this.handleStorageChange);
    window.removeEventListener('participant-joined', this.handleParticipantJoined as any);

    // Remove presence
    const key = `meeting_${this.meetingId}_participants`;
    const participants = JSON.parse(localStorage.getItem(key) || '{}');
    delete participants[this.participantId];
    localStorage.setItem(key, JSON.stringify(participants));

    console.log('Disconnected from localStorage signaling');
  }
}

