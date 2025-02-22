import express from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import Appointment from '../models/appointment';
import Doctor from '../models/doctor';
import calendarService from '../services/calendar';

const router = express.Router();

// Middleware to require authentication for certain routes
const authMiddleware = ClerkExpressRequireAuth();

// Get available slots for a doctor
router.get('/available-slots/:doctorId', async (req, res) => {
  try {
    const { date } = req.query;
    const doctorId = req.params.doctorId;

    // Get doctor's working hours
    const doctor = await Doctor.findOne({ userId: doctorId });
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const selectedDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

    // Get existing appointments for the day
    const existingAppointments = await Appointment.find({
      doctorId,
      startTime: { $gte: startOfDay, $lte: endOfDay },
      status: 'scheduled',
    }).sort({ startTime: 1 });

    // Generate all possible slots
    const slots = [];
    const workStart = doctor.workingHours?.start || "09:00";
    const workEnd = doctor.workingHours?.end || "17:00";
    const [startHour, startMinute] = workStart.split(':').map(Number);
    const [endHour, endMinute] = workEnd.split(':').map(Number);
    
    let currentSlot = new Date(startOfDay);
    currentSlot.setHours(startHour, startMinute, 0, 0);
    const dayEnd = new Date(startOfDay);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    // Generate 30-minute slots
    while (currentSlot < dayEnd) {
      const slotEnd = new Date(currentSlot.getTime() + 30 * 60000);
      
      // Check if slot is available
      const isSlotTaken = existingAppointments.some(apt => {
        return (currentSlot >= apt.startTime && currentSlot < apt.endTime) ||
               (slotEnd > apt.startTime && slotEnd <= apt.endTime);
      });

      if (!isSlotTaken && currentSlot > new Date()) { // Only future slots
        slots.push({
          start: currentSlot.toISOString(),
          end: slotEnd.toISOString(),
        });
      }

      currentSlot = slotEnd;
    }

    res.json(slots);
  } catch (error) {
    console.error('Error getting available slots:', error);
    res.status(500).json({ error: 'Failed to get available slots' });
  }
});

// Create appointment
router.post('/', async (req, res) => {
  try {
    const { doctorId, patientName, patientPhone, startTime, endTime, notes } = req.body;

    // Validate time slot availability
    const existingAppointment = await Appointment.findOne({
      doctorId,
      status: 'scheduled',
      $or: [
        {
          startTime: { $lt: new Date(endTime) },
          endTime: { $gt: new Date(startTime) },
        },
      ],
    });

    if (existingAppointment) {
      return res.status(400).json({ error: 'Time slot is not available' });
    }

    const appointment = await Appointment.create({
      doctorId,
      patientName,
      patientPhone,
      startTime,
      endTime,
      notes,
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Get doctor's appointments
router.get('/doctor/:doctorId', authMiddleware, async (req, res) => {
  try {
    const { status, date } = req.query;
    const query: any = { doctorId: req.params.doctorId };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by date if provided
    if (date) {
      const selectedDate = new Date(date as string);
      const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const appointments = await Appointment.find(query).sort({ startTime: 1 });
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Update appointment status
router.patch('/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.appointmentId,
      { $set: { status } },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Cancel appointment
router.delete('/:appointmentId', async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.appointmentId,
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

export default router; 