import { Participant } from '@/types';
import { DecentralizedSignalingService } from './decentralized-signaling';
import { LocalStorageSignalingService } from './localStorage-signaling';
import toast from 'react-hot-toast';

/**
 * WebRTC Peer Connection Manager
 * Handles peer-to-peer audio connections between participants
 * Uses Gun.js for decentralized signaling (no central server!)
 */
export class WebRTCService {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private signalingService: DecentralizedSignalingService | LocalStorageSignalingService | null = null;
  private onParticipantJoined?: (participant: Participant) => void;
  private onParticipantLeft?: (participantId: string) => void;
  private onRemoteStream?: (participantId: string, stream: MediaStream) => void;

  private iceServers: RTCIceServer[] = [
    // Google STUN servers (free, reliable)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Open Relay Project - Free TURN servers
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    
    // Twilio STUN (free)
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];

  /**
   * Initialize WebRTC service with decentralized signaling
   * No server required - fully P2P via Gun.js!
   */
  async initialize(
    meetingId: string,
    participantId: string,
    localStream: MediaStream,
    participantData: any
  ): Promise<void> {
    this.localStream = localStream;

    // Try Gun.js first, fallback to localStorage for same-computer testing
    try {
      console.log('Attempting Gun.js signaling...');
      this.signalingService = new DecentralizedSignalingService();
      await this.signalingService.connect(meetingId, participantId, participantData);
      console.log('✅ Using Gun.js signaling');
    } catch (error) {
      console.warn('Gun.js failed, using localStorage signaling (same-computer only):', error);
      this.signalingService = new LocalStorageSignalingService();
      await this.signalingService.connect(meetingId, participantId, participantData);
      console.log('✅ Using localStorage signaling (different browsers on same computer)');
      toast('Using localStorage mode - works on same computer only', { icon: '💾' });
    }

    // Set up signaling handlers
    this.setupSignalingHandlers();
  }

  /**
   * Set up signaling event handlers
   */
  private setupSignalingHandlers(): void {
    if (!this.signalingService) return;

    this.signalingService.onParticipantJoined((participant) => {
      console.log('Participant joined:', participant);
      
      // Create peer connection and send offer
      this.createPeerConnection(participant.address, true);
      
      if (this.onParticipantJoined) {
        this.onParticipantJoined(participant);
      }
    });

    this.signalingService.onParticipantLeft((participantId) => {
      console.log('Participant left:', participantId);
      this.removePeerConnection(participantId);
      
      if (this.onParticipantLeft) {
        this.onParticipantLeft(participantId);
      }
    });

    this.signalingService.onOffer(async (participantId, offer) => {
      console.log('Received offer from:', participantId);
      await this.handleOffer(participantId, offer);
    });

    this.signalingService.onAnswer(async (participantId, answer) => {
      console.log('Received answer from:', participantId);
      await this.handleAnswer(participantId, answer);
    });

    this.signalingService.onIceCandidate((participantId, candidate) => {
      console.log('Received ICE candidate from:', participantId);
      this.handleIceCandidate(participantId, candidate);
    });
  }

  /**
   * Create a peer connection
   */
  private async createPeerConnection(
    participantId: string,
    shouldCreateOffer: boolean
  ): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(participantId)) {
      return this.peerConnections.get(participantId)!;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote track from:', participantId);
      const remoteStream = event.streams[0];
      
      if (this.onRemoteStream) {
        this.onRemoteStream(participantId, remoteStream);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.signalingService) {
        this.signalingService.sendIceCandidate(participantId, event.candidate);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(
        `Connection state with ${participantId}:`,
        peerConnection.connectionState
      );

      if (
        peerConnection.connectionState === 'disconnected' ||
        peerConnection.connectionState === 'failed' ||
        peerConnection.connectionState === 'closed'
      ) {
        this.removePeerConnection(participantId);
      }
    };

    this.peerConnections.set(participantId, peerConnection);

    // Create and send offer if initiator
    if (shouldCreateOffer) {
      console.log('Creating offer for:', participantId);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await peerConnection.setLocalDescription(offer);
      
      if (this.signalingService) {
        console.log('Sending offer to:', participantId);
        this.signalingService.sendOffer(participantId, offer);
      }
    }

    return peerConnection;
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(
    participantId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    // Validate offer
    if (!offer || !offer.type || !offer.sdp) {
      console.error('Invalid offer received:', offer);
      return;
    }

    console.log('📩 Received offer from:', participantId);
    const peerConnection = await this.createPeerConnection(participantId, false);

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('Set remote description (offer)');

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log('Created and set answer');

    if (this.signalingService) {
      console.log('📤 Sending answer to:', participantId);
      this.signalingService.sendAnswer(participantId, answer);
    }
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(
    participantId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    // Validate answer
    if (!answer || !answer.type || !answer.sdp) {
      console.error('Invalid answer received:', answer);
      return;
    }

    console.log('📨 Received answer from:', participantId);
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Set remote description (answer) - connection should complete soon');
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  private async handleIceCandidate(
    participantId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      try {
        // Validate candidate before adding
        if (!candidate || !candidate.candidate) {
          console.warn('Invalid ICE candidate received, skipping');
          return;
        }
        
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }

  /**
   * Remove peer connection
   */
  private removePeerConnection(participantId: string): void {
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(participantId);
    }
  }

  /**
   * Set callback for participant joined
   */
  setOnParticipantJoined(callback: (participant: Participant) => void): void {
    this.onParticipantJoined = callback;
  }

  /**
   * Set callback for participant left
   */
  setOnParticipantLeft(callback: (participantId: string) => void): void {
    this.onParticipantLeft = callback;
  }

  /**
   * Set callback for remote stream
   */
  setOnRemoteStream(
    callback: (participantId: string, stream: MediaStream) => void
  ): void {
    this.onRemoteStream = callback;
  }

  /**
   * Get all active peer connections
   */
  getPeerConnections(): Map<string, RTCPeerConnection> {
    return this.peerConnections;
  }

  /**
   * Cleanup all connections
   */
  cleanup(): void {
    // Close all peer connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    // Disconnect signaling
    if (this.signalingService) {
      this.signalingService.disconnect();
      this.signalingService = null;
    }

    this.localStream = null;
  }
}

// ========================================
// DECENTRALIZED SIGNALING
// ========================================
// We use Gun.js for fully decentralized WebRTC signaling
// No central server required - see decentralized-signaling.ts
// This keeps the application 100% serverless and censorship-resistant!

