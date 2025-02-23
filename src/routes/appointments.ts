import express from 'express';
import Appointment from '../models/appointment';
import Doctor from '../models/doctor';

const router = express.Router();

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

// Create a new appointment
router.post('/', async (req, res) => {
  try {
    const { doctorId, patientName, patientPhone, startTime, endTime, notes } = req.body;

    // Validate required fields
    if (!doctorId || !patientName || !patientPhone || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create the appointment
    const appointment = await Appointment.create({
      doctorId,
      patientName,
      patientPhone,
      startTime,
      endTime,
      notes,
      status: 'scheduled'
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Get doctor's appointments
router.get('/doctor/:doctorId', async (req, res) => {
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
router.patch('/:appointmentId', async (req, res) => {
  try {
    const { status } = req.body;
    const appointmentId = req.params.appointmentId;

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
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

// Delete/Cancel appointment
router.delete('/:appointmentId', async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status: 'cancelled' },
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