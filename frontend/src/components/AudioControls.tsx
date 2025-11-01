import { useState } from 'react';
import { Mic, MicOff, Radio, RadioTower, Settings } from 'lucide-react';
import { useStore } from '@/store/useStore';
import toast from 'react-hot-toast';

interface AudioControlsProps {
  onMuteToggle: () => void;
  onStreamToggle: () => void;
  onSettingsClick: () => void;
}

export default function AudioControls({
  onMuteToggle,
  onStreamToggle,
  onSettingsClick,
}: AudioControlsProps) {
  const { isMuted, isStreaming, isAudioEnabled } = useStore();

  return (
    <div className="glass rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Audio Controls</h3>

      <div className="flex flex-col space-y-4">
        {/* Mute Button */}
        <button
          onClick={onMuteToggle}
          disabled={!isAudioEnabled}
          className={`flex items-center justify-center space-x-3 p-4 rounded-lg transition-all ${
            isMuted
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
              : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
          <span className="font-medium">
            {isMuted ? 'Unmute' : 'Mute'}
          </span>
        </button>

        {/* Stream Button */}
        <button
          onClick={onStreamToggle}
          disabled={!isAudioEnabled}
          className={`flex items-center justify-center space-x-3 p-4 rounded-lg transition-all ${
            isStreaming
              ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
              : 'bg-primary-500/20 hover:bg-primary-500/30 text-primary-400'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isStreaming ? (
            <RadioTower className="w-6 h-6 animate-pulse" />
          ) : (
            <Radio className="w-6 h-6" />
          )}
          <span className="font-medium">
            {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
          </span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onSettingsClick}
          className="flex items-center justify-center space-x-3 p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 transition-all"
        >
          <Settings className="w-6 h-6" />
          <span className="font-medium">Audio Settings</span>
        </button>
      </div>

      {/* Status Indicators */}
      <div className="mt-6 space-y-2">
        <StatusIndicator
          label="Audio"
          active={isAudioEnabled}
          color="blue"
        />
        <StatusIndicator
          label="Microphone"
          active={isAudioEnabled && !isMuted}
          color="green"
        />
        <StatusIndicator
          label="Broadcasting"
          active={isStreaming}
          color="purple"
        />
      </div>
    </div>
  );
}

interface StatusIndicatorProps {
  label: string;
  active: boolean;
  color: 'blue' | 'green' | 'purple';
}

function StatusIndicator({ label, active, color }: StatusIndicatorProps) {
  const colorClasses = {
    blue: active ? 'bg-blue-500' : 'bg-gray-600',
    green: active ? 'bg-green-500' : 'bg-gray-600',
    purple: active ? 'bg-purple-500' : 'bg-gray-600',
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <div className="flex items-center space-x-2">
        <div
          className={`w-2 h-2 rounded-full ${colorClasses[color]} ${
            active ? 'animate-pulse' : ''
          }`}
        />
        <span className={active ? 'text-white' : 'text-gray-500'}>
          {active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );
}

