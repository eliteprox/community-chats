import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, Plus, Clock, Users, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { calendarService, CalendarEvent } from '@/services/calendar';
import { useMeetingContract } from '@/hooks/useMeetingContract';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Calendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useStore();
  const { isContractMode, isInitialized } = useMeetingContract();
  const [meetings, setMeetings] = useState<CalendarEvent[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<CalendarEvent[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load meetings on mount and when navigating to this page
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      console.log('Calendar useEffect - Contract mode:', isContractMode);
      loadMeetings();
    }
  }, [isAuthenticated, isInitialized, location.pathname, isContractMode]);

  const loadMeetings = async () => {
    try {
      setIsLoading(true);
      const allMeetings = await calendarService.getAllMeetings();
      const upcoming = await calendarService.getUpcomingMeetings();
      setMeetings(allMeetings);
      setUpcomingMeetings(upcoming);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await calendarService.deleteMeeting(meetingId);
      toast.success('Meeting deleted');
      loadMeetings(); // Refresh the list
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-2xl font-bold text-white mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-gray-400">
          Please connect your wallet to view the calendar
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Meeting Calendar
            {isContractMode && (
              <span className="text-sm px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                On-Chain
              </span>
            )}
          </h1>
          <p className="text-gray-400">
            {isContractMode 
              ? 'Meetings stored on Arbitrum blockchain'
              : 'Schedule and manage your community calls'
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadMeetings}
            disabled={isLoading}
            className="btn btn-secondary flex items-center space-x-2"
            title="Refresh meetings"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-400">Loading meetings...</span>
        </div>
      ) : (
        <>
          {/* Upcoming Meetings */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              Upcoming Meetings
            </h2>
            {upcomingMeetings.length > 0 ? (
              <div className="space-y-4">
                {upcomingMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    currentUserAddress={user?.address}
                    onDelete={handleDeleteMeeting}
                    onJoin={async () => {
                      try {
                        if (!user) {
                          toast.error('Please connect your wallet');
                          return;
                        }

                        // Check if current user is the host
                        const isHost = user.address.toLowerCase() === meeting.hostAddress.toLowerCase();
                        console.log('Joining meeting:', { 
                          meetingId: meeting.id, 
                          isHost, 
                          isContractMode,
                          userAddress: user.address,
                          hostAddress: meeting.hostAddress 
                        });
                        
                        // Double-check contract mode at join time
                        const contractModeNow = calendarService.isContractMode();
                        console.log('Contract mode at join time:', contractModeNow);
                        
                        if (contractModeNow) {
                          // Only host can change meeting status to Live
                          if (isHost && meeting.status !== 'live') {
                            console.log('Host starting meeting (changing status to Live)');
                            await calendarService.startMeeting(meeting.id);
                          } else if (!isHost) {
                            console.log('Participant joining (not changing status)');
                            // Just join, don't change status
                          } else {
                            console.log('Meeting already live, skipping status change');
                          }
                          
                          // Register as participant (everyone does this, but only if not already joined)
                          try {
                            console.log('Registering as participant on-chain');
                            await calendarService.joinMeeting(meeting.id);
                          } catch (joinError) {
                            // Ignore "already joined" errors
                            console.log('Join meeting completed (may have already been joined)');
                          }
                        } else {
                          // localStorage mode - anyone can start
                          console.log('localStorage mode - starting meeting locally');
                          await calendarService.startMeeting(meeting.id);
                        }
                        
                        navigate(`/meeting/${meeting.id}`);
                      } catch (error) {
                        console.error('Error joining meeting:', error);
                        toast.error('Failed to join meeting');
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="glass rounded-lg p-8 text-center">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400">No upcoming meetings</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* All Meetings */}
      {meetings.length > upcomingMeetings.length && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Past Meetings
          </h2>
          <div className="space-y-4">
            {meetings
              .filter((m) => !upcomingMeetings.find((um) => um.id === m.id))
              .map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  currentUserAddress={user?.address}
                  onDelete={handleDeleteMeeting}
                  onJoin={() => navigate(`/meeting/${meeting.id}`)}
                />
              ))}
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateMeetingModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            loadMeetings();
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

interface MeetingCardProps {
  meeting: CalendarEvent;
  currentUserAddress?: string;
  onJoin: () => void;
  onDelete?: (meetingId: string) => void;
}

function MeetingCard({ meeting, currentUserAddress, onJoin, onDelete }: MeetingCardProps) {
  const isLive = meeting.status === 'live';
  const isPast = meeting.status === 'ended';
  const isHost = currentUserAddress?.toLowerCase() === meeting.hostAddress.toLowerCase();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(meeting.id);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="glass rounded-lg p-6 hover:bg-gray-800/50 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-xl font-semibold text-white">
              {meeting.title}
            </h3>
            {isLive && (
              <span className="flex items-center space-x-1 text-red-400 text-sm">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span>Live</span>
              </span>
            )}
            {isHost && (
              <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">
                Host
              </span>
            )}
          </div>
          <p className="text-gray-400 mb-4">{meeting.description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>
                {format(new Date(meeting.scheduledTime), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>{meeting.participants.length} participants</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isHost && !isPast && onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              title="Delete Meeting"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          
          <button
            onClick={onJoin}
            disabled={isPast}
            className={`btn ${
              isLive ? 'bg-red-500 hover:bg-red-600' : 'btn-primary'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLive ? 'Join Now' : isPast ? 'Ended' : 'Join'}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-lg p-6 max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Delete Meeting?</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete "{meeting.title}"? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 btn bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CreateMeetingModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateMeetingModal({ onClose, onCreated }: CreateMeetingModalProps) {
  const { user } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledTime, setScheduledTime] = useState(new Date().toISOString().slice(0, 16));
  const [duration, setDuration] = useState(60);
  const [whipUrl, setWhipUrl] = useState('');
  const [rtmpUrl, setRtmpUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !scheduledTime) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!user) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setIsCreating(true);
      await calendarService.createMeeting({
        communityId: 0, // TODO: Select from communities
        title,
        description,
        scheduledTime: new Date(scheduledTime),
        duration,
        hostAddress: user.address,
        whipUrl,
        rtmpUrl,
        isRecording: Boolean(whipUrl || rtmpUrl),
        participants: [],
        status: 'scheduled',
      });

      toast.success('Meeting scheduled successfully!');
      onCreated();
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to schedule meeting');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-lg p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">
          Schedule New Meeting
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              placeholder="Community Call #1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none resize-none"
              placeholder="Meeting agenda..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                min="15"
                step="15"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              WHIP URL (optional)
            </label>
            <input
              type="url"
              value={whipUrl}
              onChange={(e) => setWhipUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              placeholder="https://example.com/whip"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              RTMP URL (optional)
            </label>
            <input
              type="url"
              value={rtmpUrl}
              onChange={(e) => setRtmpUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              placeholder="rtmp://example.com/live"
            />
          </div>
        </div>

        <div className="flex space-x-4 mt-6">
          <button 
            onClick={onClose} 
            className="flex-1 btn btn-secondary"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate} 
            className="flex-1 btn btn-primary flex items-center justify-center"
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Schedule'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

