import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Mic, Shield, Globe, Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useStore();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-20">
        <h1 className="text-6xl font-bold mb-6">
          <span className="gradient-text">Web3 Audio Conference</span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Decentralized audio-only meetings with blockchain-based access control,
          ENS integration, and professional streaming capabilities.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => navigate('/communities')}
            className="btn btn-primary text-lg px-8 py-3"
          >
            {isAuthenticated ? 'Browse Communities' : 'Get Started'}
          </button>
          <button
            onClick={() => navigate('/calendar')}
            className="btn btn-outline text-lg px-8 py-3"
          >
            View Calendar
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 py-12">
        <FeatureCard
          icon={<Shield className="w-8 h-8" />}
          title="Blockchain Gated"
          description="Control access via Arbitrum smart contracts and Livepeer Service Registry"
        />
        <FeatureCard
          icon={<Mic className="w-8 h-8" />}
          title="Multi-Source Audio"
          description="Broadcast from multiple audio sources with professional mixing"
        />
        <FeatureCard
          icon={<Zap className="w-8 h-8" />}
          title="WHIP/RTMP Streaming"
          description="Stream to any ingest endpoint for recording and processing"
        />
        <FeatureCard
          icon={<Users className="w-8 h-8" />}
          title="ENS Integration"
          description="Display names and avatars from ENS profiles automatically"
        />
        <FeatureCard
          icon={<Calendar className="w-8 h-8" />}
          title="Community Calendar"
          description="Schedule and manage recurring community calls"
        />
        <FeatureCard
          icon={<Globe className="w-8 h-8" />}
          title="ArWeave Hosted"
          description="Fully decentralized hosting on the blockchain"
        />
      </div>

      {/* How It Works */}
      <div className="py-12">
        <h2 className="text-3xl font-bold text-center mb-12 gradient-text">
          How It Works
        </h2>
        <div className="space-y-8">
          <Step
            number={1}
            title="Connect Your Wallet"
            description="Use MetaMask or any Web3 wallet to authenticate securely"
          />
          <Step
            number={2}
            title="Join or Create a Community"
            description="Communities can be gated by allowlist or Livepeer registration"
          />
          <Step
            number={3}
            title="Schedule or Join Meetings"
            description="Create scheduled events or join live audio conferences"
          />
          <Step
            number={4}
            title="Stream to Any Platform"
            description="Broadcast mixed audio to WHIP or RTMP endpoints for recording"
          />
        </div>
      </div>

      {/* CTA */}
      <div className="glass rounded-2xl p-12 text-center my-12">
        <h2 className="text-3xl font-bold mb-4">Ready to Start?</h2>
        <p className="text-gray-300 mb-6">
          Connect your wallet and join your first community audio call
        </p>
        <button
          onClick={() => navigate('/communities')}
          className="btn btn-primary text-lg px-8 py-3"
        >
          Explore Communities
        </button>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="glass rounded-lg p-6 hover:bg-gray-800/50 transition-all">
      <div className="text-primary-400 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

interface StepProps {
  number: number;
  title: string;
  description: string;
}

function Step({ number, title, description }: StepProps) {
  return (
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
        {number}
      </div>
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}

