import { Link } from 'react-router-dom';
import { Mic, Calendar, Users } from 'lucide-react';
import WalletButton from './WalletButton';

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 p-2 rounded-lg">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">
              Community Chats
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/communities"
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>Communities</span>
            </Link>
            <Link
              to="/calendar"
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <Calendar className="w-5 h-5" />
              <span>Calendar</span>
            </Link>
          </nav>

          <WalletButton />
        </div>
      </div>
    </header>
  );
}

