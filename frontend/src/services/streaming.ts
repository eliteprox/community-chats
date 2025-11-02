import { StreamConfig } from '@/types';

/**
 * WHIP (WebRTC-HTTP Ingestion Protocol) Streaming
 */
export class WHIPStreamer {
  private peerConnection: RTCPeerConnection | null = null;
  private whipUrl: string;
  private isStreaming: boolean = false;

  constructor(whipUrl: string) {
    this.whipUrl = whipUrl;
  }

  /**
   * Start streaming to WHIP endpoint
   */
  async startStreaming(stream: MediaStream, _config: StreamConfig): Promise<void> {
    if (this.isStreaming) {
      throw new Error('Already streaming');
    }

    try {
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      // Add audio track to peer connection
      stream.getAudioTracks().forEach((track) => {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, stream);
        }
      });

      // Set up transceiver for sending only
      const transceivers = this.peerConnection.getTransceivers();
      transceivers.forEach((transceiver) => {
        transceiver.direction = 'sendonly';
      });

      // Create offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });

      await this.peerConnection.setLocalDescription(offer);

      // Wait for ICE gathering to complete
      await this.waitForIceGathering();

      // Send offer to WHIP endpoint
      const response = await fetch(this.whipUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: this.peerConnection.localDescription!.sdp,
      });

      if (!response.ok) {
        throw new Error(`WHIP request failed: ${response.status} ${response.statusText}`);
      }

      // Get answer from server
      const answerSdp = await response.text();

      // Set remote description
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      this.isStreaming = true;
      console.log('WHIP streaming started successfully');
    } catch (error) {
      console.error('Error starting WHIP stream:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Wait for ICE gathering to complete
   */
  private waitForIceGathering(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.peerConnection) {
        resolve();
        return;
      }

      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const checkState = () => {
        if (this.peerConnection?.iceGatheringState === 'complete') {
          this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      this.peerConnection.addEventListener('icegatheringstatechange', checkState);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.peerConnection) {
          this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
        }
        resolve();
      }, 5000);
    });
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) {
      return;
    }

    try {
      // Send DELETE request to WHIP endpoint to stop streaming
      await fetch(this.whipUrl, {
        method: 'DELETE',
      }).catch((error) => {
        console.warn('Error sending WHIP DELETE:', error);
      });
    } finally {
      this.cleanup();
      this.isStreaming = false;
      console.log('WHIP streaming stopped');
    }
  }

  /**
   * Check if currently streaming
   */
  isActive(): boolean {
    return this.isStreaming;
  }

  /**
   * Get connection stats
   */
  async getStats(): Promise<RTCStatsReport | null> {
    if (!this.peerConnection) {
      return null;
    }
    return await this.peerConnection.getStats();
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

/**
 * RTMP Streaming using MediaRecorder + WebSocket relay
 * Note: Direct RTMP from browser isn't possible. This requires a server relay.
 */
export class RTMPStreamer {
  private mediaRecorder: MediaRecorder | null = null;
  private websocket: WebSocket | null = null;
  private rtmpUrl: string;
  private relayServerUrl: string;
  private isStreaming: boolean = false;

  constructor(rtmpUrl: string, relayServerUrl: string = 'ws://localhost:8080/rtmp-relay') {
    this.rtmpUrl = rtmpUrl;
    this.relayServerUrl = relayServerUrl;
  }

  /**
   * Start streaming to RTMP endpoint via relay server
   */
  async startStreaming(stream: MediaStream, config: StreamConfig): Promise<void> {
    if (this.isStreaming) {
      throw new Error('Already streaming');
    }

    try {
      // Connect to relay server
      this.websocket = new WebSocket(this.relayServerUrl);

      await new Promise<void>((resolve, reject) => {
        if (!this.websocket) {
          reject(new Error('WebSocket not initialized'));
          return;
        }

        this.websocket.onopen = () => {
          console.log('Connected to RTMP relay server');
          // Send RTMP URL to relay server
          this.websocket!.send(JSON.stringify({
            type: 'init',
            rtmpUrl: this.rtmpUrl,
            config,
          }));
          resolve();
        };

        this.websocket.onerror = () => {
          reject(new Error('WebSocket connection failed'));
        };

        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });

      // Set up MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: config.bitrate,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.websocket?.readyState === WebSocket.OPEN) {
          this.websocket.send(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.stopStreaming();
      };

      // Start recording in chunks
      this.mediaRecorder.start(100); // Send data every 100ms

      this.isStreaming = true;
      console.log('RTMP streaming started successfully');
    } catch (error) {
      console.error('Error starting RTMP stream:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Get supported MIME type for MediaRecorder
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) {
      return;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.websocket) {
      this.websocket.send(JSON.stringify({ type: 'stop' }));
    }

    this.cleanup();
    this.isStreaming = false;
    console.log('RTMP streaming stopped');
  }

  /**
   * Check if currently streaming
   */
  isActive(): boolean {
    return this.isStreaming;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

/**
 * Unified streaming manager that handles both WHIP and RTMP
 */
export class StreamingManager {
  private whipStreamer: WHIPStreamer | null = null;
  private rtmpStreamer: RTMPStreamer | null = null;
  private config: StreamConfig;

  constructor(config: StreamConfig) {
    this.config = config;
  }

  /**
   * Start streaming to configured endpoints
   */
  async startStreaming(stream: MediaStream): Promise<void> {
    const promises: Promise<void>[] = [];

    // Start WHIP streaming if URL is provided
    if (this.config.whipUrl) {
      this.whipStreamer = new WHIPStreamer(this.config.whipUrl);
      promises.push(
        this.whipStreamer.startStreaming(stream, this.config).catch((error) => {
          console.error('WHIP streaming failed:', error);
          throw new Error(`WHIP streaming failed: ${error.message}`);
        })
      );
    }

    // Start RTMP streaming if URL is provided
    if (this.config.rtmpUrl) {
      this.rtmpStreamer = new RTMPStreamer(this.config.rtmpUrl);
      promises.push(
        this.rtmpStreamer.startStreaming(stream, this.config).catch((error) => {
          console.error('RTMP streaming failed:', error);
          throw new Error(`RTMP streaming failed: ${error.message}`);
        })
      );
    }

    if (promises.length === 0) {
      throw new Error('No streaming endpoints configured');
    }

    // Wait for all streams to start
    await Promise.all(promises);
  }

  /**
   * Stop all streaming
   */
  async stopStreaming(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.whipStreamer?.isActive()) {
      promises.push(this.whipStreamer.stopStreaming());
    }

    if (this.rtmpStreamer?.isActive()) {
      promises.push(this.rtmpStreamer.stopStreaming());
    }

    await Promise.all(promises);

    this.whipStreamer = null;
    this.rtmpStreamer = null;
  }

  /**
   * Check if any stream is active
   */
  isStreaming(): boolean {
    return (
      this.whipStreamer?.isActive() === true ||
      this.rtmpStreamer?.isActive() === true
    );
  }

  /**
   * Update stream configuration
   */
  updateConfig(config: Partial<StreamConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get streaming stats
   */
  async getStats() {
    const stats: {
      whip?: RTCStatsReport | null;
      rtmp?: { active: boolean };
    } = {};

    if (this.whipStreamer) {
      stats.whip = await this.whipStreamer.getStats();
    }

    if (this.rtmpStreamer) {
      stats.rtmp = { active: this.rtmpStreamer.isActive() };
    }

    return stats;
  }
}

