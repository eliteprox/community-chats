// Gun.js - P2P database for decentralized signaling
import Gun from 'gun';
import 'gun/sea';
import { Participant } from '@/types';
import { config } from '@/config';

/**
 * Decentralized WebRTC Signaling using Gun.js
 * No central server required - fully P2P!
 */
export class DecentralizedSignalingService {
  private gun: any;
  private meetingRef: any;
  private participantId: string = '';
  private onParticipantJoinedCallback?: (participant: Participant) => void;
  private onParticipantLeftCallback?: (participantId: string) => void;
  private onOfferCallback?: (participantId: string, offer: RTCSessionDescriptionInit) => void;
  private onAnswerCallback?: (participantId: string, answer: RTCSessionDescriptionInit) => void;
  private onIceCandidateCallback?: (participantId: string, candidate: RTCIceCandidateInit) => void;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize Gun with optional relay
    const peers = config.gunRelayUrl 
      ? [config.gunRelayUrl]  // Use configured relay if available
      : [];                    // Pure P2P mode if no relay

    this.gun = Gun({
      peers,
      localStorage: true, // Always enable local storage
      radisk: true,      // Enable indexing
    });

    if (peers.length > 0) {
      console.log('🔫 Gun.js initialized with relay:', config.gunRelayUrl);
    } else {
      console.log('🔫 Gun.js initialized in localStorage-only mode');
      console.log('   Run "npm run gun-relay" for better multi-user support');
    }
  }

  /**
   * Connect to meeting room (fully P2P via Gun)
   */
  async connect(meetingId: string, participantId: string, participantData: any): Promise<void> {
    this.participantId = participantId;

    // Reference to this meeting in Gun's graph
    this.meetingRef = this.gun.get(`meeting_${meetingId}`);

    // Announce presence
    await this.announcePresence(participantData);

    // Listen for other participants
    this.listenForParticipants();

    // Listen for signaling messages
    this.listenForSignaling();

    // Start heartbeat to maintain presence
    this.startHeartbeat(participantData);

    console.log('✅ Connected to decentralized signaling via Gun.js');
  }

  /**
   * Announce presence to meeting room
   */
  private async announcePresence(participantData: any): Promise<void> {
    const participantRef = this.meetingRef.get('participants').get(this.participantId);
    
    participantRef.put({
      address: this.participantId,
      displayName: participantData.displayName || this.participantId,
      ensName: participantData.ensName || null,
      ensAvatar: participantData.ensAvatar || null,
      isHost: participantData.isHost || false,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    });
  }

  /**
   * Listen for new participants joining
   */
  private listenForParticipants(): void {
    const seenParticipants = new Set<string>();
    
    this.meetingRef.get('participants').map().on((data: any, participantId: string) => {
      // Skip if no data or if it's ourselves
      if (!data || participantId === this.participantId) {
        return;
      }

      // Check if participant is still active (within last 30 seconds)
      const isActive = data.lastSeen && (Date.now() - data.lastSeen < 30000);
      
      if (isActive) {
        // Only trigger callback if this is a new participant
        if (!seenParticipants.has(participantId) && this.onParticipantJoinedCallback) {
          seenParticipants.add(participantId);
          
          const participant: Participant = {
            address: data.address,
            displayName: data.displayName,
            ensName: data.ensName,
            ensAvatar: data.ensAvatar,
            isHost: data.isHost,
            isMuted: false,
            isSpeaking: false,
          };

          console.log('Gun.js: New participant detected:', participantId);
          this.onParticipantJoinedCallback(participant);
        }
      } else if (!isActive && seenParticipants.has(participantId)) {
        // Participant became inactive
        seenParticipants.delete(participantId);
        if (this.onParticipantLeftCallback) {
          console.log('Gun.js: Participant left:', participantId);
          this.onParticipantLeftCallback(participantId);
        }
      }
    });
  }

  /**
   * Listen for WebRTC signaling messages
   */
  private listenForSignaling(): void {
    // Listen for offers
    const processedOffers = new Set<string>();
    this.meetingRef
      .get('signaling')
      .get(this.participantId)
      .get('offers')
      .map()
      .on((data: any, from: string) => {
        const offerKey = `${from}_${data?.timestamp}`;
        if (data && data.offer && data.offer.sdp && !processedOffers.has(offerKey) && this.onOfferCallback) {
          processedOffers.add(offerKey);
          this.onOfferCallback(from, data.offer);
        }
      });

    // Listen for answers
    const processedAnswers = new Set<string>();
    this.meetingRef
      .get('signaling')
      .get(this.participantId)
      .get('answers')
      .map()
      .on((data: any, from: string) => {
        const answerKey = `${from}_${data?.timestamp}`;
        if (data && data.answer && data.answer.sdp && !processedAnswers.has(answerKey) && this.onAnswerCallback) {
          processedAnswers.add(answerKey);
          this.onAnswerCallback(from, data.answer);
        }
      });

    // Listen for ICE candidates
    const processedCandidates = new Set<string>();
    this.meetingRef
      .get('signaling')
      .get(this.participantId)
      .get('ice')
      .map()
      .on((data: any, candidateId: string) => {
        if (data && data.candidate && data.candidate.candidate && !processedCandidates.has(candidateId) && this.onIceCandidateCallback) {
          processedCandidates.add(candidateId);
          this.onIceCandidateCallback(data.from, data.candidate);
        }
      });
  }

  /**
   * Start heartbeat to maintain presence
   */
  private startHeartbeat(participantData: any): void {
    this.heartbeatInterval = setInterval(() => {
      this.announcePresence(participantData);
    }, 10000); // Every 10 seconds
  }

  /**
   * Send offer to peer
   */
  sendOffer(participantId: string, offer: RTCSessionDescriptionInit): void {
    const offerData = {
      offer: {
        type: offer.type,
        sdp: offer.sdp,
      },
      timestamp: Date.now(),
    };
    
    this.meetingRef
      .get('signaling')
      .get(participantId)
      .get('offers')
      .get(this.participantId)
      .put(offerData);
    
    console.log('📤 Offer written to Gun.js for:', participantId);
  }

  /**
   * Send answer to peer
   */
  sendAnswer(participantId: string, answer: RTCSessionDescriptionInit): void {
    const answerData = {
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
      timestamp: Date.now(),
    };
    
    this.meetingRef
      .get('signaling')
      .get(participantId)
      .get('answers')
      .get(this.participantId)
      .put(answerData);
    
    console.log('📤 Answer written to Gun.js for:', participantId);
  }

  /**
   * Send ICE candidate to peer
   */
  sendIceCandidate(participantId: string, candidate: RTCIceCandidate): void {
    const candidateId = `${this.participantId}_${Date.now()}`;
    this.meetingRef
      .get('signaling')
      .get(participantId)
      .get('ice')
      .get(candidateId)
      .put({
        from: this.participantId,
        candidate: candidate.toJSON(),
        timestamp: Date.now(),
      });
  }

  /**
   * Register callback for participant joined
   */
  onParticipantJoined(callback: (participant: Participant) => void): void {
    this.onParticipantJoinedCallback = callback;
  }

  /**
   * Register callback for participant left
   */
  onParticipantLeft(callback: (participantId: string) => void): void {
    this.onParticipantLeftCallback = callback;
  }

  /**
   * Register callback for offer
   */
  onOffer(callback: (participantId: string, offer: RTCSessionDescriptionInit) => void): void {
    this.onOfferCallback = callback;
  }

  /**
   * Register callback for answer
   */
  onAnswer(callback: (participantId: string, answer: RTCSessionDescriptionInit) => void): void {
    this.onAnswerCallback = callback;
  }

  /**
   * Register callback for ICE candidate
   */
  onIceCandidate(callback: (participantId: string, candidate: RTCIceCandidateInit) => void): void {
    this.onIceCandidateCallback = callback;
  }

  /**
   * Disconnect from meeting
   */
  disconnect(): void {
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Remove presence
    if (this.meetingRef && this.participantId) {
      this.meetingRef.get('participants').get(this.participantId).put(null);
    }

    console.log('Disconnected from decentralized signaling');
  }
}

