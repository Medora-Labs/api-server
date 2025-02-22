import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import Doctor, { IDoctor } from '../models/doctor';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CREDENTIALS_PATH = path.join(__dirname, '../../credentials/credentials.json');

interface TimeSlot {
  start: Date;
  end: Date;
}

interface FreeBusyResponse {
  calendars: {
    [key: string]: {
      busy: Array<{
        start: string;
        end: string;
      }>;
    };
  };
}

interface CalendarInfo {
  id: string;
  summary?: string;
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;

  constructor() {
    try {
      const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
      const { client_id, client_secret, redirect_uris } = credentials.web;
      
      this.oauth2Client = new OAuth2Client(
        client_id,
        client_secret,
        redirect_uris[0] || 'http://localhost:3000/api/auth/google/callback'
      );

      this.calendar = google.calendar({
        version: 'v3',
        auth: this.oauth2Client as any // Type assertion needed due to googleapis typing issue
      });
    } catch (error) {
      console.error('Error loading credentials:', error);
      throw new Error('Failed to initialize Google Calendar service');
    }
  }

  // Public method to set credentials
  setOAuthCredentials(tokens: Credentials) {
    this.oauth2Client.setCredentials(tokens);
  }

  private async refreshTokenIfNeeded(doctor: IDoctor): Promise<void> {
    if (!doctor.calendarTokens?.refresh_token) return;

    const expiryDate = doctor.calendarTokens.expiry_date;
    // Refresh if token expires in less than 5 minutes
    if (Date.now() + 300000 > expiryDate) {
      try {
        this.oauth2Client.setCredentials({
          refresh_token: doctor.calendarTokens.refresh_token
        });
        
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        // Update tokens in database
        await Doctor.findByIdAndUpdate(doctor._id, {
          $set: {
            calendarTokens: {
              access_token: credentials.access_token,
              refresh_token: credentials.refresh_token || doctor.calendarTokens.refresh_token,
              expiry_date: credentials.expiry_date,
            },
          },
        });

        this.oauth2Client.setCredentials(credentials);
      } catch (error) {
        console.error('Error refreshing token:', error);
        throw new Error('Failed to refresh token');
      }
    } else {
      // Use existing valid tokens
      this.oauth2Client.setCredentials(doctor.calendarTokens);
    }
  }

  private generateTimeSlots(
    startDate: Date,
    endDate: Date,
    interval: number = 30
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    let currentTime = new Date(startDate);
    const end = new Date(endDate);

    // Generate slots only during business hours (9 AM to 5 PM)
    while (currentTime < end) {
      const hour = currentTime.getHours();
      if (hour >= 9 && hour < 17) {
        slots.push({
          start: new Date(currentTime),
          end: new Date(currentTime.getTime() + interval * 60000),
        });
      }
      currentTime = new Date(currentTime.getTime() + interval * 60000);
    }

    return slots;
  }

  async getAvailableSlots(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSlot[]> {
    try {
      // Get doctor and refresh token if needed
      const doctor = await Doctor.findById(doctorId);
      if (!doctor || !doctor.calendarId) {
        throw new Error('Doctor not found or calendar not connected');
      }

      await this.refreshTokenIfNeeded(doctor);
      
      // Get busy slots
      const busyResponse = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: [{ id: doctor.calendarId }],
        },
      });

      const busySlots = (busyResponse.data as FreeBusyResponse).calendars[doctor.calendarId]?.busy || [];
      
      // Generate all possible time slots
      const allSlots = this.generateTimeSlots(startDate, endDate);
      
      // Filter out busy slots and past times
      const now = new Date();
      const availableSlots = allSlots.filter(slot => {
        // Filter out past slots
        if (slot.start <= now) return false;

        // Filter out busy slots
        return !busySlots.some(busySlot => {
          const busyStart = new Date(busySlot.start);
          const busyEnd = new Date(busySlot.end);
          return (
            (slot.start >= busyStart && slot.start < busyEnd) ||
            (slot.end > busyStart && slot.end <= busyEnd) ||
            (slot.start <= busyStart && slot.end >= busyEnd)
          );
        });
      });

      return availableSlots;
    } catch (error) {
      console.error('Error fetching available slots:', error);
      throw new Error('Failed to fetch available slots');
    }
  }

  async createAppointment(
    doctorId: string,
    startTime: Date,
    endTime: Date,
    patientName: string,
    patientPhone: string
  ): Promise<string> {
    try {
      // Get doctor and refresh token if needed
      const doctor = await Doctor.findById(doctorId);
      if (!doctor || !doctor.calendarId) {
        throw new Error('Doctor not found or calendar not connected');
      }

      await this.refreshTokenIfNeeded(doctor);
      
      const event = await this.calendar.events.insert({
        calendarId: doctor.calendarId,
        requestBody: {
          summary: `Appointment with ${patientName}`,
          description: `Patient Phone: ${patientPhone}`,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'UTC',
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 },
            ],
          },
        },
      });

      return event.data.id || '';
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw new Error('Failed to create appointment');
    }
  }

  async cancelAppointment(
    doctorId: string,
    eventId: string
  ): Promise<void> {
    try {
      // Get doctor and refresh token if needed
      const doctor = await Doctor.findById(doctorId);
      if (!doctor || !doctor.calendarId) {
        throw new Error('Doctor not found or calendar not connected');
      }

      await this.refreshTokenIfNeeded(doctor);
      
      await this.calendar.events.delete({
        calendarId: doctor.calendarId,
        eventId,
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw new Error('Failed to cancel appointment');
    }
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      include_granted_scopes: true,
      prompt: 'consent'  // Force consent screen to ensure we get refresh token
    });
  }

  async setCredentials(code: string): Promise<Credentials> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async getPrimaryCalendar(): Promise<CalendarInfo> {
    const calendarList = await this.calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);
    
    if (!primaryCalendar?.id) {
      throw new Error('Could not find primary calendar');
    }

    return {
      id: primaryCalendar.id,
      summary: primaryCalendar.summary || undefined,
    };
  }
}

export default new GoogleCalendarService(); 