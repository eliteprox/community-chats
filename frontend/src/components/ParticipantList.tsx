import { Mic, MicOff, Crown } from 'lucide-react';
import { Participant } from '@/types';

interface ParticipantListProps {
  participants: Participant[];
  currentUserAddress?: string;
}

export default function ParticipantList({
  participants,
  currentUserAddress,
}: ParticipantListProps) {
  return (
    <div className="glass rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        Participants ({participants.length})
      </h3>

      <div className="space-y-2">
        {participants.map((participant) => (
          <ParticipantItem
            key={participant.address}
            participant={participant}
            isCurrentUser={participant.address === currentUserAddress}
          />
        ))}
      </div>

      {participants.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No participants yet
        </div>
      )}
    </div>
  );
}

interface ParticipantItemProps {
  participant: Participant;
  isCurrentUser: boolean;
}

function ParticipantItem({ participant, isCurrentUser }: ParticipantItemProps) {
  return (
    <div
      className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
        participant.isSpeaking
          ? 'bg-primary-500/20 speaking-animation'
          : 'bg-gray-800/50 hover:bg-gray-800'
      }`}
    >
      {/* Avatar */}
      <div className="relative">
        {participant.ensAvatar ? (
          <img
            src={participant.ensAvatar}
            alt={participant.displayName}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold">
              {participant.displayName[0].toUpperCase()}
            </span>
          </div>
        )}
        
        {participant.isSpeaking && (
          <div className="absolute inset-0 rounded-full border-2 border-primary-400 animate-pulse" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium truncate">
            {participant.displayName}
          </span>
          {participant.isHost && (
            <Crown className="w-4 h-4 text-yellow-500" title="Host" />
          )}
          {isCurrentUser && (
            <span className="text-xs text-gray-400">(You)</span>
          )}
        </div>
        {participant.ensName && (
          <div className="text-xs text-gray-400 truncate">
            {participant.address.slice(0, 6)}...{participant.address.slice(-4)}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center space-x-2">
        {participant.isMuted ? (
          <MicOff className="w-4 h-4 text-red-400" />
        ) : (
          <Mic className="w-4 h-4 text-green-400" />
        )}
      </div>
    </div>
  );
}

