import { AudioConfig } from '@/types';

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  groupId: string;
}

/**
 * Audio capture and processing service
 */
export class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaStreams: Map<string, MediaStream> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  private analyserNodes: Map<string, AnalyserNode> = new Map();
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private mixedStream: MediaStream | null = null;

  /**
   * Initialize audio context
   */
  async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({
        sampleRate: 48000,
        latencyHint: 'interactive',
      });
      
      // Create destination for mixed audio
      this.destinationNode = this.audioContext.createMediaStreamDestination();
    }

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Get list of available audio input devices
   */
  async getAudioDevices(): Promise<AudioDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((device) => device.kind === 'audioinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
          groupId: device.groupId,
        }));
    } catch (error) {
      console.error('Error enumerating devices:', error);
      return [];
    }
  }

  /**
   * Capture audio from a specific device
   */
  async captureAudio(
    deviceId: string,
    config: AudioConfig
  ): Promise<MediaStream> {
    await this.initialize();

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          sampleRate: config.sampleRate,
          channelCount: config.channelCount,
          echoCancellation: config.echoCancellation,
          noiseSuppression: config.noiseSuppression,
          autoGainControl: config.autoGainControl,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStreams.set(deviceId, stream);

      // Add to audio graph
      this.addStreamToMix(deviceId, stream);

      return stream;
    } catch (error) {
      console.error('Error capturing audio:', error);
      throw new Error('Failed to access microphone. Please check permissions.');
    }
  }

  /**
   * Add a stream to the audio mix
   */
  private addStreamToMix(id: string, stream: MediaStream): void {
    if (!this.audioContext || !this.destinationNode) {
      throw new Error('Audio context not initialized');
    }

    const source = this.audioContext.createMediaStreamSource(stream);
    const gainNode = this.audioContext.createGain();
    const analyserNode = this.audioContext.createAnalyser();

    // Configure analyser for volume detection
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;

    // Connect: source -> gain -> analyser -> destination
    source.connect(gainNode);
    gainNode.connect(analyserNode);
    gainNode.connect(this.destinationNode);

    this.gainNodes.set(id, gainNode);
    this.analyserNodes.set(id, analyserNode);

    // Update mixed stream
    this.updateMixedStream();
  }

  /**
   * Remove a stream from the mix
   */
  removeStream(id: string): void {
    const stream = this.mediaStreams.get(id);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.mediaStreams.delete(id);
    }

    const gainNode = this.gainNodes.get(id);
    if (gainNode) {
      gainNode.disconnect();
      this.gainNodes.delete(id);
    }

    const analyserNode = this.analyserNodes.get(id);
    if (analyserNode) {
      analyserNode.disconnect();
      this.analyserNodes.delete(id);
    }

    this.updateMixedStream();
  }

  /**
   * Update the mixed stream output
   */
  private updateMixedStream(): void {
    if (this.destinationNode) {
      this.mixedStream = this.destinationNode.stream;
    }
  }

  /**
   * Get the mixed audio stream
   */
  getMixedStream(): MediaStream | null {
    return this.mixedStream;
  }

  /**
   * Set volume for a specific stream
   */
  setStreamVolume(id: string, volume: number): void {
    const gainNode = this.gainNodes.get(id);
    if (gainNode) {
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Mute/unmute a specific stream
   */
  setStreamMuted(id: string, muted: boolean): void {
    const stream = this.mediaStreams.get(id);
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Get audio level for a stream (0-1)
   */
  getStreamLevel(id: string): number {
    const analyserNode = this.analyserNodes.get(id);
    if (!analyserNode) return 0;

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average =
      dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    return average / 255;
  }

  /**
   * Check if a stream is speaking (above threshold)
   */
  isStreamSpeaking(id: string, threshold: number = 0.1): boolean {
    return this.getStreamLevel(id) > threshold;
  }

  /**
   * Get all active stream IDs
   */
  getActiveStreams(): string[] {
    return Array.from(this.mediaStreams.keys());
  }

  /**
   * Stop all streams and cleanup
   */
  cleanup(): void {
    // Stop all media streams
    this.mediaStreams.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    this.mediaStreams.clear();

    // Disconnect all nodes
    this.gainNodes.forEach((node) => node.disconnect());
    this.gainNodes.clear();

    this.analyserNodes.forEach((node) => node.disconnect());
    this.analyserNodes.clear();

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.destinationNode = null;
    this.mixedStream = null;
  }

  /**
   * Get audio context (for advanced usage)
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

/**
 * Multi-participant audio mixer
 */
export class ParticipantAudioMixer {
  private audioContext: AudioContext | null = null;
  private participantSources: Map<string, MediaStreamAudioSourceNode> = new Map();
  private participantGains: Map<string, GainNode> = new Map();
  private participantAnalysers: Map<string, AnalyserNode> = new Map();
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private mixedStream: MediaStream | null = null;

  constructor() {
    // Don't create AudioContext in constructor (React strict mode issues)
    // Will be created on first use
  }

  private ensureAudioContext(): void {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext({
        sampleRate: 48000,
        latencyHint: 'interactive',
      });
      
      this.destinationNode = this.audioContext.createMediaStreamDestination();
      this.mixedStream = this.destinationNode.stream;
    }
  }

  /**
   * Add a participant's audio stream
   */
  addParticipant(participantId: string, stream: MediaStream): void {
    this.ensureAudioContext();
    
    if (this.participantSources.has(participantId)) {
      this.removeParticipant(participantId);
    }

    const source = this.audioContext!.createMediaStreamSource(stream);
    const gainNode = this.audioContext!.createGain();
    const analyserNode = this.audioContext!.createAnalyser();

    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;

    source.connect(gainNode);
    gainNode.connect(analyserNode);
    gainNode.connect(this.destinationNode!);

    console.log(`🎙️ Added participant ${participantId} to audio mixer`);

    this.participantSources.set(participantId, source);
    this.participantGains.set(participantId, gainNode);
    this.participantAnalysers.set(participantId, analyserNode);
  }

  /**
   * Remove a participant
   */
  removeParticipant(participantId: string): void {
    const source = this.participantSources.get(participantId);
    if (source) {
      source.disconnect();
      this.participantSources.delete(participantId);
    }

    const gain = this.participantGains.get(participantId);
    if (gain) {
      gain.disconnect();
      this.participantGains.delete(participantId);
    }

    const analyser = this.participantAnalysers.get(participantId);
    if (analyser) {
      analyser.disconnect();
      this.participantAnalysers.delete(participantId);
    }
  }

  /**
   * Set participant volume
   */
  setParticipantVolume(participantId: string, volume: number): void {
    const gain = this.participantGains.get(participantId);
    if (gain) {
      gain.gain.value = Math.max(0, Math.min(2, volume)); // Allow up to 200%
    }
  }

  /**
   * Mute/unmute participant
   */
  setParticipantMuted(participantId: string, muted: boolean): void {
    const gain = this.participantGains.get(participantId);
    if (gain) {
      gain.gain.value = muted ? 0 : 1;
    }
  }

  /**
   * Get participant audio level
   */
  getParticipantLevel(participantId: string): number {
    const analyser = this.participantAnalysers.get(participantId);
    if (!analyser) return 0;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const average =
      dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    return average / 255;
  }

  /**
   * Check if participant is speaking
   */
  isParticipantSpeaking(participantId: string, threshold: number = 0.1): boolean {
    return this.getParticipantLevel(participantId) > threshold;
  }

  /**
   * Get the mixed audio stream
   */
  getMixedStream(): MediaStream | null {
    return this.mixedStream;
  }

  /**
   * Get all participant IDs
   */
  getParticipants(): string[] {
    return Array.from(this.participantSources.keys());
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.participantSources.forEach((source) => source.disconnect());
    this.participantGains.forEach((gain) => gain.disconnect());
    this.participantAnalysers.forEach((analyser) => analyser.disconnect());

    this.participantSources.clear();
    this.participantGains.clear();
    this.participantAnalysers.clear();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

