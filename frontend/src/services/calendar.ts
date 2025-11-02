import { Meeting } from '@/types';
import { meetingContractService, MeetingStatus } from './meetingContract';
import { BrowserProvider } from 'ethers';

export interface CalendarEvent extends Meeting {
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
}

/**
 * Local storage keys
 */
const STORAGE_KEYS = {
  MEETINGS: 'community_chats_meetings',
  EVENTS: 'community_chats_events',
};

/**
 * Calendar and meeting management service
 * Supports both on-chain (Arbitrum smart contract) and localStorage modes
 */
export class CalendarService {
  private meetings: Map<string, CalendarEvent> = new Map();
  private useContract: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Initialize with Web3 provider to enable contract mode
   */
  setProvider(provider: BrowserProvider) {
    meetingContractService.setProvider(provider);
    this.useContract = meetingContractService.isConfigured();
    
    console.log('CalendarService.setProvider called');
    console.log('  Contract configured:', meetingContractService.isConfigured());
    console.log('  useContract:', this.useContract);
  }

  /**
   * Check if contract mode is enabled
   */
  isContractMode(): boolean {
    return this.useContract;
  }

  /**
   * Create a new meeting/event
   */
  async createMeeting(meeting: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    if (this.useContract) {
      try {
        const meetingId = await meetingContractService.createMeeting(meeting);
        const createdMeeting = await meetingContractService.getMeeting(meetingId);
        // Also save to local cache
        this.meetings.set(meetingId, createdMeeting);
        return createdMeeting;
      } catch (error) {
        console.error('Error creating meeting on contract, falling back to localStorage:', error);
        // Fall back to localStorage on error
      }
    }

    // localStorage mode
    const id = this.generateId();
    const newMeeting: CalendarEvent = {
      ...meeting,
      id,
    };

    this.meetings.set(id, newMeeting);
    this.saveToStorage();

    return newMeeting;
  }

  /**
   * Update an existing meeting
   */
  async updateMeeting(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    if (this.useContract) {
      try {
        await meetingContractService.updateMeeting(id, updates);
        const updatedMeeting = await meetingContractService.getMeeting(id);
        this.meetings.set(id, updatedMeeting);
        return updatedMeeting;
      } catch (error) {
        console.error('Error updating meeting on contract:', error);
        throw error;
      }
    }

    // localStorage mode
    const meeting = this.meetings.get(id);
    if (!meeting) {
      return null;
    }

    const updated = { ...meeting, ...updates };
    this.meetings.set(id, updated);
    this.saveToStorage();

    return updated;
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(id: string): Promise<boolean> {
    if (this.useContract) {
      try {
        await meetingContractService.deleteMeeting(id);
        this.meetings.delete(id);
        return true;
      } catch (error) {
        console.error('Error deleting meeting on contract:', error);
        throw error;
      }
    }

    // localStorage mode
    const deleted = this.meetings.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Get a meeting by ID
   */
  getMeeting(id: string): CalendarEvent | null {
    return this.meetings.get(id) || null;
  }

  /**
   * Get all meetings for a community
   */
  getMeetingsForCommunity(communityId: number): CalendarEvent[] {
    return Array.from(this.meetings.values()).filter(
      (meeting) => meeting.communityId === communityId
    );
  }

  /**
   * Get all meetings
   */
  async getAllMeetings(): Promise<CalendarEvent[]> {
    if (this.useContract) {
      try {
        const meetings = await meetingContractService.getAllMeetings();
        // Update local cache
        meetings.forEach(meeting => {
          this.meetings.set(meeting.id, meeting);
        });
        return meetings;
      } catch (error) {
        console.error('Error fetching meetings from contract:', error);
        // Return cached data on error
        return Array.from(this.meetings.values());
      }
    }

    // localStorage mode
    return Array.from(this.meetings.values());
  }

  /**
   * Get upcoming meetings
   */
  async getUpcomingMeetings(limit?: number): Promise<CalendarEvent[]> {
    // First get all meetings (from contract or localStorage)
    const allMeetings = await this.getAllMeetings();
    
    const now = new Date();
    const upcoming = allMeetings
      .filter((meeting) => {
        const meetingDate = new Date(meeting.scheduledTime);
        return meetingDate > now && meeting.status !== 'ended';
      })
      .sort((a, b) => {
        return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
      });

    return limit ? upcoming.slice(0, limit) : upcoming;
  }

  /**
   * Get meetings for a specific date
   */
  getMeetingsForDate(date: Date): CalendarEvent[] {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    return Array.from(this.meetings.values()).filter((meeting) => {
      const meetingDate = new Date(meeting.scheduledTime);
      meetingDate.setHours(0, 0, 0, 0);
      return meetingDate.getTime() === targetDate.getTime();
    });
  }

  /**
   * Get meetings in a date range
   */
  getMeetingsInRange(startDate: Date, endDate: Date): CalendarEvent[] {
    return Array.from(this.meetings.values()).filter((meeting) => {
      const meetingDate = new Date(meeting.scheduledTime);
      return meetingDate >= startDate && meetingDate <= endDate;
    });
  }

  /**
   * Get live meetings
   */
  getLiveMeetings(): CalendarEvent[] {
    return Array.from(this.meetings.values()).filter(
      (meeting) => meeting.status === 'live'
    );
  }

  /**
   * Start a meeting (change status to live)
   */
  async startMeeting(id: string): Promise<CalendarEvent | null> {
    if (this.useContract) {
      try {
        await meetingContractService.changeMeetingStatus(id, MeetingStatus.Live);
        return await meetingContractService.getMeeting(id);
      } catch (error) {
        console.error('Error starting meeting on contract:', error);
        throw error;
      }
    }

    return await this.updateMeeting(id, { status: 'live' });
  }

  /**
   * End a meeting
   */
  async endMeeting(id: string): Promise<CalendarEvent | null> {
    if (this.useContract) {
      try {
        await meetingContractService.changeMeetingStatus(id, MeetingStatus.Ended);
        return await meetingContractService.getMeeting(id);
      } catch (error) {
        console.error('Error ending meeting on contract:', error);
        throw error;
      }
    }

    return await this.updateMeeting(id, { status: 'ended' });
  }

  /**
   * Join a meeting (register as participant on-chain)
   */
  async joinMeeting(id: string): Promise<void> {
    if (this.useContract) {
      try {
        await meetingContractService.joinMeeting(id);
      } catch (error) {
        console.error('Error joining meeting on contract:', error);
        throw error;
      }
    }
  }

  /**
   * Check if a meeting should be starting soon (within 15 minutes)
   */
  isMeetingStartingSoon(meeting: CalendarEvent): boolean {
    const now = new Date();
    const meetingTime = new Date(meeting.scheduledTime);
    const diffMinutes = (meetingTime.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes > 0 && diffMinutes <= 15;
  }

  /**
   * Generate recurring meeting instances
   */
  generateRecurringInstances(
    baseEvent: CalendarEvent,
    startDate: Date,
    endDate: Date
  ): CalendarEvent[] {
    if (!baseEvent.recurrence) {
      return [baseEvent];
    }

    const instances: CalendarEvent[] = [];
    const { frequency, interval, endDate: recurrenceEndDate } = baseEvent.recurrence;

    let currentDate = new Date(startDate);
    const finalEndDate = recurrenceEndDate
      ? new Date(Math.min(endDate.getTime(), recurrenceEndDate.getTime()))
      : endDate;

    while (currentDate <= finalEndDate) {
      const instance: CalendarEvent = {
        ...baseEvent,
        id: `${baseEvent.id}-${currentDate.getTime()}`,
        scheduledTime: new Date(currentDate),
      };
      instances.push(instance);

      // Increment based on frequency
      switch (frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + interval);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + interval * 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + interval);
          break;
      }
    }

    return instances;
  }

  /**
   * Export calendar to iCal format
   */
  async exportToICal(meetings?: CalendarEvent[]): Promise<string> {
    const eventsToExport = meetings || await this.getAllMeetings();

    let ical = 'BEGIN:VCALENDAR\n';
    ical += 'VERSION:2.0\n';
    ical += 'PRODID:-//Community Chats//Audio Conference//EN\n';
    ical += 'CALSCALE:GREGORIAN\n';

    eventsToExport.forEach((meeting: CalendarEvent) => {
      const dtstart = this.formatICalDate(new Date(meeting.scheduledTime));
      const dtend = this.formatICalDate(
        new Date(
          new Date(meeting.scheduledTime).getTime() +
            meeting.duration * 60 * 1000
        )
      );

      ical += 'BEGIN:VEVENT\n';
      ical += `UID:${meeting.id}@community-chats.app\n`;
      ical += `DTSTART:${dtstart}\n`;
      ical += `DTEND:${dtend}\n`;
      ical += `SUMMARY:${meeting.title}\n`;
      ical += `DESCRIPTION:${meeting.description}\n`;
      ical += `ORGANIZER:${meeting.hostAddress}\n`;
      ical += `STATUS:${meeting.status.toUpperCase()}\n`;
      ical += 'END:VEVENT\n';
    });

    ical += 'END:VCALENDAR\n';

    return ical;
  }

  /**
   * Format date for iCal
   */
  private formatICalDate(date: Date): string {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save meetings to local storage
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.meetings.values());
      localStorage.setItem(STORAGE_KEYS.MEETINGS, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }

  /**
   * Load meetings from local storage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEETINGS);
      if (data) {
        const meetings: CalendarEvent[] = JSON.parse(data);
        meetings.forEach((meeting) => {
          // Convert date strings back to Date objects
          meeting.scheduledTime = new Date(meeting.scheduledTime);
          if (meeting.recurrence?.endDate) {
            meeting.recurrence.endDate = new Date(meeting.recurrence.endDate);
          }
          this.meetings.set(meeting.id, meeting);
        });
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
  }

  /**
   * Clear all meetings (for testing)
   */
  clearAll(): void {
    this.meetings.clear();
    localStorage.removeItem(STORAGE_KEYS.MEETINGS);
  }
}

/**
 * Create a singleton instance
 */
export const calendarService = new CalendarService();

