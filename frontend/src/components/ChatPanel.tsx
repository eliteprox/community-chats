import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';
import { GunChatService, ChatMessage } from '@/services/gun-chat';
import { User } from '@/types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ChatPanelProps {
  chatService: GunChatService | null;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({ chatService, currentUser, isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && chatService && currentUser) {
      startMessageStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chatService]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startMessageStream = () => {
    if (!chatService || !currentUser) return;

    try {
      chatService.streamMessages((message) => {
        setMessages((prev) => [...prev, message]);
        
        // Show toast for messages from others
        if (!message.isOwn) {
          toast(`${message.senderName}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`, {
            icon: '💬',
            duration: 3000,
          });
        }
      });
    } catch (error) {
      console.error('Error streaming messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || !chatService || !currentUser) return;

    setIsSending(true);
    try {
      await chatService.sendMessage(inputMessage.trim(), currentUser.displayName);
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] glass rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-white">Meeting Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessageItem key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="btn btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Powered by Gun.js • Fully decentralized P2P chat
        </p>
      </form>
    </div>
  );
}

interface ChatMessageItemProps {
  message: ChatMessage;
}

function ChatMessageItem({ message }: ChatMessageItemProps) {
  return (
    <div className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-lg p-3 ${
          message.isOwn
            ? 'bg-primary-600 text-white'
            : 'bg-gray-800 text-gray-200'
        }`}
      >
        {!message.isOwn && (
          <div className="text-xs font-medium mb-1 opacity-75">
            {message.senderName}
          </div>
        )}
        <div className="text-sm break-words">{message.content}</div>
        <div
          className={`text-xs mt-1 ${
            message.isOwn ? 'text-primary-100' : 'text-gray-500'
          }`}
        >
          {format(message.timestamp, 'h:mm a')}
        </div>
      </div>
    </div>
  );
}

// Floating chat button to open/close panel
export function ChatButton({ onClick }: { onClick: () => void }) {
  const [unreadCount] = useState(0);

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg transition-all hover:scale-110 z-40"
      title="Open Chat"
    >
      <MessageCircle className="w-6 h-6" />
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
          {unreadCount}
        </div>
      )}
    </button>
  );
}

