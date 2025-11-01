import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Plus, Clock, Users } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { calendarService, CalendarEvent } from '@/services/calendar';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Calendar() {
  const navigate = useNavigate();
  const { isAuthenticated } = useStore();
  const [meetings, setMeetings] = useState<CalendarEvent[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<CalendarEvent[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadMeetings();
    }
  }, [isAuthenticated]);

  const loadMeetings = () => {
    const allMeetings = calendarService.getAllMeetings();
    const upcoming = calendarService.getUpcomingMeetings(10);
    setMeetings(allMeetings);
    setUpcomingMeetings(upcoming);
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
          <h1 className="text-3xl font-bold text-white mb-2">
            Meeting Calendar
          </h1>
          <p className="text-gray-400">
            Schedule and manage your community calls
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Schedule Meeting</span>
        </button>
      </div>

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
                onJoin={() => {
                  calendarService.startMeeting(meeting.id);
                  navigate(`/meeting/${meeting.id}`);
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

      {/* All Meetings */}
      {meetings.length > upcomingMeetings.length && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            All Meetings
          </h2>
          <div className="space-y-4">
            {meetings
              .filter((m) => !upcomingMeetings.find((um) => um.id === m.id))
              .map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
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
  onJoin: () => void;
}

function MeetingCard({ meeting, onJoin }: MeetingCardProps) {
  const isLive = meeting.status === 'live';
  const isPast = meeting.status === 'ended';

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
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [whipUrl, setWhipUrl] = useState('');
  const [rtmpUrl, setRtmpUrl] = useState('');

  const handleCreate = () => {
    if (!title.trim() || !scheduledTime) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!user) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      calendarService.createMeeting({
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
          <button onClick={onClose} className="flex-1 btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleCreate} className="flex-1 btn btn-primary">
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

