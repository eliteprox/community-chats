import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, Settings } from 'lucide-react';
import { useStore } from '@/store/useStore';
import ParticipantList from '@/components/ParticipantList';
import AudioControls from '@/components/AudioControls';
import { AudioService, ParticipantAudioMixer } from '@/services/audio';
import { StreamingManager } from '@/services/streaming';
import { calendarService } from '@/services/calendar';
import { AudioConfig } from '@/types';
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
  } = useStore();

  const [audioService] = useState(() => new AudioService());
  const [audioMixer] = useState(() => new ParticipantAudioMixer());
  const [streamingManager, setStreamingManager] = useState<StreamingManager | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please connect your wallet first');
      navigate('/');
      return;
    }

    if (meetingId) {
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
        if (stream && user) {
          audioMixer.addParticipant(user.address, stream);
        }
        setIsAudioEnabled(true);
        toast.success('Audio initialized');
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
      toast.error('Failed to access microphone');
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
    streamingManager?.stopStreaming();
    setCurrentMeeting(null);
    setIsAudioEnabled(false);
    setIsMuted(false);
    setIsStreaming(false);
  };

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
    </div>
  );
}

