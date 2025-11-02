import Gun from 'gun';
import 'gun/sea';
import { config } from '@/config';

export interface ChatMessage {
  id: string;
  content: string;
  senderAddress: string;
  senderName: string;
  timestamp: Date;
  isOwn: boolean;
}

/**
 * Fully Decentralized Chat using Gun.js
 * No external services needed!
 */
export class GunChatService {
  private gun: any;
  private chatRef: any;
  private currentAddress: string = '';
  private seenMessages: Set<string> = new Set();

  constructor() {
    // Use same Gun instance configuration as signaling
    const peers = config.gunRelayUrl ? [config.gunRelayUrl] : [];

    this.gun = Gun({
      peers,
      localStorage: true,
      radisk: true,
    });
  }

  /**
   * Join meeting chat room
   */
  async joinMeetingChat(meetingId: string, userAddress: string): Promise<void> {
    this.currentAddress = userAddress.toLowerCase();
    
    // Reference to chat messages for this meeting
    this.chatRef = this.gun.get(`meeting_${meetingId}`).get('chat');
    
    console.log('✅ Gun.js chat initialized for meeting:', meetingId);
  }

  /**
   * Send a message to the meeting chat
   */
  async sendMessage(content: string, senderName: string): Promise<void> {
    if (!this.chatRef) {
      throw new Error('Not connected to meeting chat');
    }

    try {
      const messageId = `${this.currentAddress}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const message = {
        id: messageId,
        content,
        senderAddress: this.currentAddress,
        senderName,
        timestamp: Date.now(),
      };

      // Store message in Gun.js
      this.chatRef.get(messageId).put(message);
      
      console.log('Message sent via Gun.js:', messageId);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Stream messages in real-time
   */
  streamMessages(onMessage: (message: ChatMessage) => void): void {
    if (!this.chatRef) {
      throw new Error('Not connected to meeting chat');
    }

    // Listen for all messages in this meeting
    this.chatRef.map().on((data: any) => {
      if (!data || !data.id || this.seenMessages.has(data.id)) {
        return; // Skip if no data or already seen
      }

      // Mark as seen
      this.seenMessages.add(data.id);

      const message: ChatMessage = {
        id: data.id,
        content: data.content,
        senderAddress: data.senderAddress,
        senderName: data.senderName,
        timestamp: new Date(data.timestamp),
        isOwn: data.senderAddress.toLowerCase() === this.currentAddress,
      };

      onMessage(message);
    });
  }

  /**
   * Get message history
   */
  async getMessageHistory(_limit: number = 50): Promise<ChatMessage[]> {
    // Gun.js doesn't have built-in pagination, but messages sync automatically
    // The streamMessages will receive all messages in the graph
    return [];
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return Boolean(this.chatRef);
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.chatRef = null;
    this.seenMessages.clear();
    console.log('Gun.js chat cleanup complete');
  }
}

