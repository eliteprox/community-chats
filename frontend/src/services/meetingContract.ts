import { BrowserProvider, Contract } from 'ethers';
import { config } from '@/config';
import { CalendarEvent } from './calendar';

export enum MeetingStatus {
  Scheduled = 0,
  Live = 1,
  Ended = 2,
  Cancelled = 3,
}

export interface ContractMeeting {
  id: bigint;
  communityId: bigint;
  title: string;
  description: string;
  scheduledTime: bigint;
  duration: bigint;
  host: string;
  whipUrl: string;
  rtmpUrl: string;
  isRecording: boolean;
  status: number;
  createdAt: bigint;
  participantCount: bigint;
}

/**
 * Service for interacting with the MeetingScheduler smart contract
 */
export class MeetingContractService {
  private provider: BrowserProvider | null = null;
  private contract: Contract | null = null;

  // ABI for MeetingScheduler contract
  private readonly abi = [
    'function createMeeting(uint256 communityId, string title, string description, uint256 scheduledTime, uint256 duration, string whipUrl, string rtmpUrl) returns (uint256)',
    'function updateMeeting(uint256 meetingId, string title, string description, uint256 scheduledTime, uint256 duration, string whipUrl, string rtmpUrl)',
    'function changeMeetingStatus(uint256 meetingId, uint8 newStatus)',
    'function deleteMeeting(uint256 meetingId)',
    'function joinMeeting(uint256 meetingId)',
    'function getMeeting(uint256 meetingId) view returns (uint256 id, uint256 communityId, string title, string description, uint256 scheduledTime, uint256 duration, address host, string whipUrl, string rtmpUrl, bool isRecording, uint8 status, uint256 createdAt, uint256 participantCount)',
    'function getMeetingParticipants(uint256 meetingId) view returns (address[])',
    'function getCommunityMeetings(uint256 communityId) view returns (uint256[])',
    'function getHostMeetings(address host) view returns (uint256[])',
    'function getUpcomingCommunityMeetings(uint256 communityId, uint256 limit) view returns (uint256[])',
    'function isParticipant(uint256 meetingId, address participant) view returns (bool)',
    'function meetingCount() view returns (uint256)',
    'event MeetingCreated(uint256 indexed meetingId, uint256 indexed communityId, address indexed host, string title, uint256 scheduledTime)',
    'event MeetingUpdated(uint256 indexed meetingId, string title)',
    'event MeetingStatusChanged(uint256 indexed meetingId, uint8 status)',
    'event MeetingDeleted(uint256 indexed meetingId)',
    'event ParticipantJoined(uint256 indexed meetingId, address indexed participant)',
  ];

  setProvider(provider: BrowserProvider) {
    this.provider = provider;
    this.contract = null; // Reset contract when provider changes
  }

  async getContract(): Promise<Contract> {
    if (!this.provider) {
      throw new Error('Provider not initialized. Call setProvider() first.');
    }

    if (this.contract) {
      return this.contract;
    }

    if (!config.meetingSchedulerContract) {
      throw new Error('Meeting Scheduler contract address not configured');
    }

    const signer = await this.provider.getSigner();
    this.contract = new Contract(config.meetingSchedulerContract, this.abi, signer);
    return this.contract;
  }

  /**
   * Create a new meeting on-chain
   */
  async createMeeting(meeting: Omit<CalendarEvent, 'id' | 'participants' | 'status'>): Promise<string> {
    try {
      const contract = await this.getContract();
      
      const scheduledTimestamp = Math.floor(meeting.scheduledTime.getTime() / 1000);
      
      const tx = await contract.createMeeting(
        meeting.communityId,
        meeting.title,
        meeting.description,
        scheduledTimestamp,
        meeting.duration,
        meeting.whipUrl || '',
        meeting.rtmpUrl || ''
      );

      const receipt = await tx.wait();
      
      // Extract meeting ID from event logs
      const event = receipt.logs
        .map((log: any) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === 'MeetingCreated');

      if (event && event.args) {
        return event.args.meetingId.toString();
      }

      throw new Error('Meeting created but ID not found in events');
    } catch (error) {
      console.error('Error creating meeting on-chain:', error);
      throw error;
    }
  }

  /**
   * Update an existing meeting
   */
  async updateMeeting(meetingId: string, meeting: Partial<CalendarEvent>): Promise<void> {
    try {
      const contract = await this.getContract();
      
      // Get current meeting data
      const currentMeeting = await this.getMeeting(meetingId);
      
      const scheduledTimestamp = meeting.scheduledTime 
        ? Math.floor(meeting.scheduledTime.getTime() / 1000)
        : Math.floor(currentMeeting.scheduledTime.getTime() / 1000);

      const tx = await contract.updateMeeting(
        meetingId,
        meeting.title || currentMeeting.title,
        meeting.description || currentMeeting.description,
        scheduledTimestamp,
        meeting.duration || currentMeeting.duration,
        meeting.whipUrl !== undefined ? meeting.whipUrl : currentMeeting.whipUrl || '',
        meeting.rtmpUrl !== undefined ? meeting.rtmpUrl : currentMeeting.rtmpUrl || ''
      );

      await tx.wait();
    } catch (error) {
      console.error('Error updating meeting on-chain:', error);
      throw error;
    }
  }

  /**
   * Change meeting status
   */
  async changeMeetingStatus(meetingId: string, status: MeetingStatus): Promise<void> {
    try {
      const contract = await this.getContract();
      const tx = await contract.changeMeetingStatus(meetingId, status);
      await tx.wait();
    } catch (error) {
      console.error('Error changing meeting status:', error);
      throw error;
    }
  }

  /**
   * Delete (cancel) a meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      const contract = await this.getContract();
      const tx = await contract.deleteMeeting(meetingId);
      await tx.wait();
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  }

  /**
   * Check if user is already a participant
   */
  async isParticipant(meetingId: string, address: string): Promise<boolean> {
    try {
      const contract = await this.getContract();
      return await contract.isParticipant(meetingId, address);
    } catch (error) {
      console.error('Error checking participant status:', error);
      return false;
    }
  }

  /**
   * Join a meeting (only if not already joined)
   */
  async joinMeeting(meetingId: string): Promise<void> {
    try {
      const contract = await this.getContract();
      
      // Check if already joined to avoid error
      const signer = await this.provider!.getSigner();
      const address = await signer.getAddress();
      const alreadyJoined = await this.isParticipant(meetingId, address);
      
      if (alreadyJoined) {
        console.log('Already joined meeting, skipping transaction');
        return; // Skip if already joined
      }

      const tx = await contract.joinMeeting(meetingId);
      await tx.wait();
      console.log('Successfully joined meeting on-chain');
    } catch (error) {
      // Handle "already joined" error gracefully
      if (error instanceof Error && error.message.includes('Already joined')) {
        console.log('Already joined this meeting (caught error)');
        return; // Don't throw, just return
      }
      console.error('Error joining meeting:', error);
      throw error;
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId: string): Promise<CalendarEvent> {
    try {
      const contract = await this.getContract();
      const meeting: ContractMeeting = await contract.getMeeting(meetingId);
      
      return this.convertToCalendarEvent(meeting);
    } catch (error) {
      console.error('Error fetching meeting:', error);
      throw error;
    }
  }

  /**
   * Get all meetings for a community
   */
  async getCommunityMeetings(communityId: number): Promise<CalendarEvent[]> {
    try {
      const contract = await this.getContract();
      const meetingIds: bigint[] = await contract.getCommunityMeetings(communityId);
      
      const meetings = await Promise.all(
        meetingIds.map(async (id) => {
          try {
            return await this.getMeeting(id.toString());
          } catch (error) {
            console.error(`Error fetching meeting ${id}:`, error);
            return null;
          }
        })
      );

      return meetings.filter((m): m is CalendarEvent => m !== null);
    } catch (error) {
      console.error('Error fetching community meetings:', error);
      return [];
    }
  }

  /**
   * Get meetings hosted by an address
   */
  async getHostMeetings(hostAddress: string): Promise<CalendarEvent[]> {
    try {
      const contract = await this.getContract();
      const meetingIds: bigint[] = await contract.getHostMeetings(hostAddress);
      
      const meetings = await Promise.all(
        meetingIds.map(async (id) => {
          try {
            return await this.getMeeting(id.toString());
          } catch (error) {
            console.error(`Error fetching meeting ${id}:`, error);
            return null;
          }
        })
      );

      return meetings.filter((m): m is CalendarEvent => m !== null);
    } catch (error) {
      console.error('Error fetching host meetings:', error);
      return [];
    }
  }

  /**
   * Get upcoming meetings for a community
   */
  async getUpcomingCommunityMeetings(communityId: number, limit: number = 10): Promise<CalendarEvent[]> {
    try {
      const contract = await this.getContract();
      const meetingIds: bigint[] = await contract.getUpcomingCommunityMeetings(communityId, limit);
      
      const meetings = await Promise.all(
        meetingIds.map(async (id) => {
          try {
            return await this.getMeeting(id.toString());
          } catch (error) {
            console.error(`Error fetching meeting ${id}:`, error);
            return null;
          }
        })
      );

      return meetings.filter((m): m is CalendarEvent => m !== null);
    } catch (error) {
      console.error('Error fetching upcoming meetings:', error);
      return [];
    }
  }

  /**
   * Get all meetings from the contract
   */
  async getAllMeetings(): Promise<CalendarEvent[]> {
    try {
      const contract = await this.getContract();
      const count: bigint = await contract.meetingCount();
      const meetingCount = Number(count);
      
      const meetings = await Promise.all(
        Array.from({ length: meetingCount }, async (_, i) => {
          try {
            return await this.getMeeting(i.toString());
          } catch (error) {
            // Meeting might be deleted or inaccessible
            return null;
          }
        })
      );

      return meetings.filter((m): m is CalendarEvent => m !== null);
    } catch (error) {
      console.error('Error fetching all meetings:', error);
      return [];
    }
  }

  /**
   * Get meeting participants
   */
  async getMeetingParticipants(meetingId: string): Promise<string[]> {
    try {
      const contract = await this.getContract();
      const participants: string[] = await contract.getMeetingParticipants(meetingId);
      return participants;
    } catch (error) {
      console.error('Error fetching meeting participants:', error);
      return [];
    }
  }

  /**
   * Convert contract meeting data to CalendarEvent
   */
  private convertToCalendarEvent(contractMeeting: ContractMeeting): CalendarEvent {
    const statusMap: { [key: number]: 'scheduled' | 'live' | 'ended' } = {
      [MeetingStatus.Scheduled]: 'scheduled',
      [MeetingStatus.Live]: 'live',
      [MeetingStatus.Ended]: 'ended',
      [MeetingStatus.Cancelled]: 'ended',
    };

    return {
      id: contractMeeting.id.toString(),
      communityId: Number(contractMeeting.communityId),
      title: contractMeeting.title,
      description: contractMeeting.description,
      scheduledTime: new Date(Number(contractMeeting.scheduledTime) * 1000),
      duration: Number(contractMeeting.duration),
      hostAddress: contractMeeting.host,
      whipUrl: contractMeeting.whipUrl || undefined,
      rtmpUrl: contractMeeting.rtmpUrl || undefined,
      isRecording: contractMeeting.isRecording,
      status: statusMap[contractMeeting.status] || 'scheduled',
      participants: [], // Participants are fetched separately if needed
    };
  }

  /**
   * Check if contract is configured
   */
  isConfigured(): boolean {
    return !!config.meetingSchedulerContract;
  }
}

// Create singleton instance
export const meetingContractService = new MeetingContractService();

