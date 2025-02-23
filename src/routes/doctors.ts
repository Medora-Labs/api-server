import express from 'express';
import Doctor from '../models/doctor';

const router = express.Router();

// Create or update doctor profile
router.post('/profile', async (req: express.Request, res: express.Response) => {
  try {
    const { name, specialization, phoneNumber, workingHours, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const doctor = await Doctor.findOneAndUpdate(
      { userId },
      {
        name,
        specialization,
        phoneNumber,
        workingHours,
        userId,
      },
      { upsert: true, new: true }
    );

    res.json(doctor);
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    res.status(500).json({ error: 'Failed to update doctor profile' });
  }
});

// Get doctor profile
router.get('/profile/:userId', async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const doctor = await Doctor.findOne({ userId });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    res.status(500).json({ error: 'Failed to fetch doctor profile' });
  }
});

// Get doctor by ID (public route)
router.get('/:doctorId', async (req: express.Request, res: express.Response) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.params.doctorId });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
});

// Update working hours
router.patch('/working-hours', async (req: express.Request, res: express.Response) => {
  try {
    const { start, end } = req.body;
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start) || !timeRegex.test(end)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:mm format' });
    }

    const doctor = await Doctor.findOneAndUpdate(
      { userId },
      {
        $set: {
          'workingHours.start': start,
          'workingHours.end': end,
        },
      },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error updating working hours:', error);
    res.status(500).json({ error: 'Failed to update working hours' });
  }
});

// Get all doctors
router.get('/get-all-doctors', async (req: express.Request, res: express.Response) => {
  try {
    const doctors = await Doctor.find();
    console.log(doctors);
    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

export default router; 