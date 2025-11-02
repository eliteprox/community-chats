import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, MessageCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import ParticipantList from '@/components/ParticipantList';
import AudioControls from '@/components/AudioControls';
import ChatPanel from '@/components/ChatPanel';
import { AudioService, ParticipantAudioMixer } from '@/services/audio';
import { StreamingManager } from '@/services/streaming';
import { WebRTCService } from '@/services/webrtc';
import { GunChatService } from '@/services/gun-chat';
import { ENSService } from '@/services/ens';
import { web3Service } from '@/services/web3';
import { calendarService } from '@/services/calendar';
import { AudioConfig, Participant } from '@/types';
import toast from 'react-hot-toast';

export default function Meeting() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    currentMeeting,
    participants,
    isMuted,
    isStreaming,
    setCurrentMeeting,
    setIsMuted,
    setIsStreaming,
    setIsAudioEnabled,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setParticipants,
  } = useStore();

  const [audioService] = useState(() => new AudioService());
  const [audioMixer] = useState(() => new ParticipantAudioMixer());
  const [webrtcService] = useState(() => new WebRTCService());
  const [chatService, setChatService] = useState<GunChatService | null>(null);
  const [streamingManager, setStreamingManager] = useState<StreamingManager | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [audioElement] = useState(() => new Audio());

  useEffect(() => {
    // Don't redirect immediately - allow time for auto-reconnect
    if (meetingId && isAuthenticated) {
      loadMeeting(meetingId);
    }

    return () => {
      cleanup();
    };
  }, [meetingId, isAuthenticated]);

  const loadMeeting = async (id: string) => {
    const meeting = calendarService.getMeeting(id);
    if (!meeting) {
      toast.error('Meeting not found');
      navigate('/calendar');
      return;
    }

    setCurrentMeeting(meeting);

    // Initialize audio
    await initializeAudio();
  };

  const initializeAudio = async () => {
    try {
      const audioConfig: AudioConfig = {
        sampleRate: 48000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      await audioService.initialize();
      const devices = await audioService.getAudioDevices();
      
      if (devices.length > 0) {
        const stream = await audioService.captureAudio(devices[0].deviceId, audioConfig);
        
        if (stream && user && meetingId) {
          // Add local audio to mixer
          audioMixer.addParticipant(user.address, stream);
          
          // Initialize ENS service and WebRTC
          const provider = web3Service.getProvider();
          if (provider) {
            const ens = new ENSService(provider);
            
            // Initialize Gun.js chat (fully decentralized!)
            try {
              const chat = new GunChatService();
              await chat.joinMeetingChat(meetingId, user.address);
              setChatService(chat);
              console.log('✅ Gun.js chat initialized');
              toast.success('Chat enabled', { icon: '💬' });
            } catch (error) {
              console.warn('Chat initialization failed:', error);
              // Chat is optional - don't break the meeting if it fails
            }
            
            // Initialize WebRTC with participant data
            // This will announce presence and add us to the participants list
            await initializeWebRTC(stream, ens);
          }
        }
        
        setIsAudioEnabled(true);
        toast.success('Audio initialized');
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
      toast.error('Failed to access microphone');
    }
  };

  const initializeWebRTC = async (localStream: MediaStream, ens: ENSService) => {
    if (!user || !meetingId) return;

    try {
      // Get ENS profile first
      const profile = await ens.getProfile(user.address);
      const displayName = profile.name || ens.shortenAddress(user.address);

      const participantData = {
        displayName,
        ensName: profile.name,
        ensAvatar: profile.avatar,
        isHost: currentMeeting?.hostAddress === user.address,
      };

      // STEP 1: Set up WebRTC event handlers FIRST (before initializing!)
      webrtcService.setOnParticipantJoined(async (participant) => {
        // Don't add ourselves
        if (participant.address.toLowerCase() === user.address.toLowerCase()) {
          console.log('Ignoring self in participant joined event');
          return;
        }

        // Also check if already in list
        const existing = participants.find(
          p => p.address.toLowerCase() === participant.address.toLowerCase()
        );
        if (existing) {
          console.log('Participant already exists, skipping:', participant.address);
          return;
        }

        console.log('New participant joined:', participant);
        
        // Fetch ENS info
        const profile = await ens.getProfile(participant.address);
        participant.ensName = profile.name;
        participant.ensAvatar = profile.avatar;
        participant.displayName = profile.name || ens.shortenAddress(participant.address);
        
        addParticipant(participant);
        toast.success(`${participant.displayName} joined`);
      });

      webrtcService.setOnParticipantLeft((participantId) => {
        console.log('Participant left:', participantId);
        const participant = participants.find(p => p.address === participantId);
        if (participant) {
          removeParticipant(participantId);
          toast(`${participant.displayName} left`);
        }
      });

      webrtcService.setOnRemoteStream((participantId, stream) => {
        console.log('🎙️ Received audio stream from:', participantId);
        
        // Add remote participant's audio to mixer
        audioMixer.addParticipant(participantId, stream);
        updateParticipant(participantId, { audioStream: stream });
        
        // Update audio playback to include new participant
        playMixedAudio();
        
        // Set up speaking detection
        setInterval(() => {
          const isSpeaking = audioMixer.isParticipantSpeaking(participantId, 0.1);
          updateParticipant(participantId, { isSpeaking });
        }, 100);
      });

      // STEP 2: Initialize WebRTC (this announces to Gun.js and starts listening)
      await webrtcService.initialize(
        meetingId,
        user.address,
        localStream,
        participantData
      );

      // STEP 3: Add local participant
      // The store will prevent duplicates automatically
      const localParticipant: Participant = {
        address: user.address,
        ensName: profile.name,
        ensAvatar: profile.avatar,
        displayName,
        audioStream: localStream,
        isHost: currentMeeting?.hostAddress === user.address,
        isMuted: false,
        isSpeaking: false,
      };
      addParticipant(localParticipant);

      console.log('✅ WebRTC initialized (fully decentralized via Gun.js)');
      
      // Start audio playback
      playMixedAudio();
      
      toast.success('Connected to P2P network');
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      toast.error('Failed to initialize P2P connections. Using local mode.');
    }
  };

  const playMixedAudio = () => {
    try {
      const mixedStream = audioMixer.getMixedStream();
      console.log('playMixedAudio called - Mixed stream:', mixedStream);
      console.log('  Audio tracks:', mixedStream?.getAudioTracks().length);
      console.log('  Active participants in mixer:', audioMixer.getParticipants());
      
      if (mixedStream && audioElement) {
        // Connect mixed stream to audio element for playback
        audioElement.srcObject = mixedStream;
        audioElement.volume = 1.0; // Max volume
        audioElement.play().then(() => {
          console.log('🔊 Audio playback started successfully!');
        }).catch(e => {
          console.warn('⚠️ Audio autoplay blocked. Click anywhere or unmute to enable:', e);
          toast('Click anywhere to enable audio', { icon: '🔊', duration: 5000 });
        });
      } else {
        console.warn('No mixed stream available yet');
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleMuteToggle = () => {
    if (!user) return;
    
    const newMutedState = !isMuted;
    audioService.setStreamMuted(user.address, newMutedState);
    setIsMuted(newMutedState);
    toast.success(newMutedState ? 'Muted' : 'Unmuted');
  };

  const handleStreamToggle = async () => {
    if (!currentMeeting) return;

    if (isStreaming) {
      // Stop streaming
      await streamingManager?.stopStreaming();
      setIsStreaming(false);
      toast.success('Streaming stopped');
    } else {
      // Start streaming
      try {
        const mixedStream = audioMixer.getMixedStream();
        if (!mixedStream) {
          toast.error('No audio to stream');
          return;
        }

        const manager = new StreamingManager({
          whipUrl: currentMeeting.whipUrl,
          rtmpUrl: currentMeeting.rtmpUrl,
          bitrate: 128000,
          codec: 'opus',
        });

        await manager.startStreaming(mixedStream);
        setStreamingManager(manager);
        setIsStreaming(true);
        toast.success('Streaming started');
      } catch (error) {
        console.error('Error starting stream:', error);
        toast.error('Failed to start streaming');
      }
    }
  };

  const handleSettingsClick = () => {
    toast('Audio settings coming soon!', { icon: '⚙️' });
  };

  const handleLeaveMeeting = () => {
    cleanup();
    navigate('/calendar');
    toast.success('Left meeting');
  };

  const cleanup = () => {
    audioService.cleanup();
    audioMixer.cleanup();
    webrtcService.cleanup();
    chatService?.cleanup();
    streamingManager?.stopStreaming();
    
    // Stop audio playback
    if (audioElement) {
      audioElement.pause();
      audioElement.srcObject = null;
    }
    
    setCurrentMeeting(null);
    setParticipants([]);
    setIsAudioEnabled(false);
    setIsMuted(false);
    setIsStreaming(false);
    setIsChatOpen(false);
  };

  // Show wallet connection prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="glass rounded-lg p-12">
          <Phone className="w-16 h-16 mx-auto mb-4 text-primary-400" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Join Meeting
          </h2>
          <p className="text-gray-400 mb-8">
            Connect your wallet to join this audio conference
          </p>
          <div className="text-sm text-gray-500 mb-8">
            Meeting ID: {meetingId}
          </div>
          <p className="text-primary-400">
            Click "Connect Wallet" in the top right to continue →
          </p>
        </div>
      </div>
    );
  }

  // Show loading while meeting loads
  if (!currentMeeting) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto" />
        <p className="text-gray-400 mt-4">Loading meeting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {currentMeeting.title}
            </h1>
            <p className="text-gray-400">{currentMeeting.description}</p>
          </div>
          <button
            onClick={handleLeaveMeeting}
            className="btn bg-red-500 hover:bg-red-600 text-white flex items-center space-x-2"
          >
            <Phone className="w-5 h-5" />
            <span>Leave Meeting</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Audio Controls */}
        <div className="lg:col-span-1 space-y-6">
          <AudioControls
            onMuteToggle={handleMuteToggle}
            onStreamToggle={handleStreamToggle}
            onSettingsClick={handleSettingsClick}
          />

          {/* Chat Toggle Button */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-full flex items-center justify-center space-x-3 p-4 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 transition-all"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="font-medium">
              {isChatOpen ? 'Hide Chat' : 'Show Chat'}
            </span>
          </button>

          {/* Streaming Info */}
          {isStreaming && (
            <div className="glass rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                Streaming To:
              </h3>
              <div className="space-y-2 text-xs text-gray-400">
                {currentMeeting.whipUrl && (
                  <div>
                    <span className="text-gray-500">WHIP:</span>{' '}
                    <span className="text-white">{currentMeeting.whipUrl}</span>
                  </div>
                )}
                {currentMeeting.rtmpUrl && (
                  <div>
                    <span className="text-gray-500">RTMP:</span>{' '}
                    <span className="text-white">{currentMeeting.rtmpUrl}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Participants */}
        <div className="lg:col-span-2">
          <ParticipantList
            participants={participants}
            currentUserAddress={user?.address}
          />
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel
        chatService={chatService}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={user}
      />
    </div>
  );
}


