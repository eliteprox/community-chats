import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Lock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { web3Service } from '@/services/web3';
import { Community } from '@/types';
import toast from 'react-hot-toast';

export default function Communities() {
  const navigate = useNavigate();
  const { isAuthenticated, user, communities, setCommunities } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadCommunities();
    }
  }, [isAuthenticated, user]);

  const loadCommunities = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get user's communities
      const userCommunityIds = await web3Service.getUserCommunities(user.address);
      
      // Fetch details for each community
      const communityDetails = await Promise.all(
        userCommunityIds.map((id) => web3Service.getCommunityInfo(id))
      );

      setCommunities(communityDetails);
    } catch (error) {
      console.error('Error loading communities:', error);
      toast.error('Failed to load communities');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <Lock className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-2xl font-bold text-white mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-gray-400">
          Please connect your wallet to view communities
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Communities</h1>
          <p className="text-gray-400">
            Join or create audio conference communities
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create Community</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto" />
          <p className="text-gray-400 mt-4">Loading communities...</p>
        </div>
      ) : communities.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              onSelect={() => navigate(`/community/${community.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 glass rounded-lg">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No Communities Yet
          </h3>
          <p className="text-gray-400 mb-6">
            Create your first community to get started
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Community
          </button>
        </div>
      )}

      {showCreateModal && (
        <CreateCommunityModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadCommunities}
        />
      )}
    </div>
  );
}

interface CommunityCardProps {
  community: Community;
  onSelect: () => void;
}

function CommunityCard({ community, onSelect }: CommunityCardProps) {
  return (
    <div
      onClick={onSelect}
      className="glass rounded-lg p-6 cursor-pointer hover:bg-gray-800/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2">
            {community.name}
          </h3>
          <p className="text-gray-400 text-sm line-clamp-2">
            {community.description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2 text-gray-400">
          <Users className="w-4 h-4" />
          <span>{community.participantCount} members</span>
        </div>
        {community.isActive && (
          <span className="flex items-center space-x-1 text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>Active</span>
          </span>
        )}
      </div>
    </div>
  );
}

interface CreateCommunityModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateCommunityModal({ onClose, onCreated }: CreateCommunityModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requireLivepeer, setRequireLivepeer] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a community name');
      return;
    }

    setIsCreating(true);
    try {
      await web3Service.createCommunity(name, description, requireLivepeer);
      toast.success('Community created successfully!');
      onCreated();
      onClose();
    } catch (error) {
      console.error('Error creating community:', error);
      toast.error('Failed to create community');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-6">
          Create New Community
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Community Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              placeholder="My Community"
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
              placeholder="Describe your community..."
            />
          </div>

          <div className="flex items-start space-x-3 p-4 bg-gray-800/50 rounded-lg">
            <input
              type="checkbox"
              id="requireLivepeer"
              checked={requireLivepeer}
              onChange={(e) => setRequireLivepeer(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <label
                htmlFor="requireLivepeer"
                className="text-sm font-medium text-gray-300 cursor-pointer"
              >
                Require Livepeer Registration
              </label>
              <p className="text-xs text-gray-400 mt-1">
                Only allow Livepeer service providers to join
              </p>
            </div>
          </div>
        </div>

        <div className="flex space-x-4 mt-6">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex-1 btn btn-primary"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

