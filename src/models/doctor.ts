import mongoose, { Document, Schema } from 'mongoose';

export interface IDoctor extends Document {
  userId: string;
  name: string;
  specialization: string;
  description: string;
  phoneNumber?: string;
  workingHours?: {
    start: string; // Format: "HH:mm"
    end: string;   // Format: "HH:mm"
  };
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<IDoctor>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    specialization: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      default: '+1 (555) 0123-4567', // Default static number
    },
    workingHours: {
      start: {
        type: String,
        default: "09:00", // 9 AM
      },
      end: {
        type: String,
        default: "17:00", // 5 PM
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IDoctor>('Doctor', doctorSchema); 