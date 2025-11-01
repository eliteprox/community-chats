import { Meeting } from '@/types';

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
 */
export class CalendarService {
  private meetings: Map<string, CalendarEvent> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Create a new meeting/event
   */
  createMeeting(meeting: Omit<CalendarEvent, 'id'>): CalendarEvent {
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
  updateMeeting(id: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
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
  deleteMeeting(id: string): boolean {
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
  getAllMeetings(): CalendarEvent[] {
    return Array.from(this.meetings.values());
  }

  /**
   * Get upcoming meetings
   */
  getUpcomingMeetings(limit?: number): CalendarEvent[] {
    const now = new Date();
    const upcoming = Array.from(this.meetings.values())
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
  startMeeting(id: string): CalendarEvent | null {
    return this.updateMeeting(id, { status: 'live' });
  }

  /**
   * End a meeting
   */
  endMeeting(id: string): CalendarEvent | null {
    return this.updateMeeting(id, { status: 'ended' });
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
  exportToICal(meetings?: CalendarEvent[]): string {
    const eventsToExport = meetings || this.getAllMeetings();

    let ical = 'BEGIN:VCALENDAR\n';
    ical += 'VERSION:2.0\n';
    ical += 'PRODID:-//Community Chats//Audio Conference//EN\n';
    ical += 'CALSCALE:GREGORIAN\n';

    eventsToExport.forEach((meeting) => {
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

