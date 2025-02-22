import express from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { google } from 'googleapis';
import calendarService from '../services/calendar';
import Doctor from '../models/doctor';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
      throw new Error('Invalid callback parameters');
    }

    // Get the doctor's userId from state parameter
    const userId = state;

    // Exchange the code for tokens
    const tokens = await calendarService.setCredentials(code);

    // Get the user's primary calendar ID
    const calendarList = await calendarService.getPrimaryCalendar();
    if (!calendarList.id) {
      throw new Error('Could not find primary calendar');
    }

    // Update doctor's calendar information
    await Doctor.findOneAndUpdate(
      { userId },
      {
        $set: {
          calendarId: calendarList.id,
          calendarTokens: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
          },
        },
      },
      { new: true }
    );

    // Redirect to frontend dashboard
    res.redirect(`${FRONTEND_URL}/dashboard?calendar_connected=true`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${FRONTEND_URL}/dashboard?calendar_error=true`);
  }
});

// Get Google OAuth URL
router.get('/google/url', ClerkExpressRequireAuth(), async (req: any, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if doctor exists
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Generate auth URL with state parameter containing userId
    const authUrl = calendarService.getAuthUrl();
    const urlWithState = `${authUrl}&state=${userId}`;

    res.json({ url: urlWithState });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

export default router; 