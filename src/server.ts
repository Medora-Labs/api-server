import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import doctorRoutes from './routes/doctors';
import appointmentRoutes from './routes/appointments';
import WebSocketService from './services/websocket';
import { connectToDatabase } from './utils/database';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

// Initialize WebSocket service
new WebSocketService(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(ClerkExpressWithAuth());

// Routes
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Connect to database and start server
connectToDatabase().then(() => {
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch((error) => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
}); 