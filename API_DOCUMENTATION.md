# Appointment Booking API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All API endpoints require authentication using a Bearer token from Clerk. Include the token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## Endpoints

### 1. Get Available Slots

Get available appointment slots for a specific doctor.

**Endpoint:** `GET /appointments/available-slots/:doctorId`

**Parameters:**
- `doctorId` (path parameter): The ID of the doctor
- `date` (query parameter): The date for which to get available slots (format: YYYY-MM-DD)

**Example Request:**
```http
GET /api/appointments/available-slots/123?date=2024-03-20
```

**Response:**
```json
[
  {
    "start": "2024-03-20T09:00:00.000Z",
    "end": "2024-03-20T09:30:00.000Z"
  },
  {
    "start": "2024-03-20T10:00:00.000Z",
    "end": "2024-03-20T10:30:00.000Z"
  }
]
```

### 2. Book Appointment

Create a new appointment.

**Endpoint:** `POST /appointments`

**Request Body:**
```json
{
  "doctorId": "string",
  "patientName": "string",
  "patientPhone": "string",
  "startTime": "2024-03-20T09:00:00.000Z",
  "endTime": "2024-03-20T09:30:00.000Z",
  "notes": "string" // optional
}
```

**Response:**
```json
{
  "_id": "string",
  "doctorId": "string",
  "patientName": "string",
  "patientPhone": "string",
  "startTime": "2024-03-20T09:00:00.000Z",
  "endTime": "2024-03-20T09:30:00.000Z",
  "status": "scheduled",
  "notes": "string",
  "createdAt": "2024-03-20T09:00:00.000Z",
  "updatedAt": "2024-03-20T09:00:00.000Z"
}
```

### 3. Get Doctor's Appointments

Get all appointments for a specific doctor with optional filtering.

**Endpoint:** `GET /appointments/doctor/:doctorId`

**Parameters:**
- `doctorId` (path parameter): The ID of the doctor
- `status` (query parameter, optional): Filter by appointment status ('scheduled', 'cancelled', 'completed')
- `date` (query parameter, optional): Filter by date (format: YYYY-MM-DD)

**Example Request:**
```http
GET /api/appointments/doctor/123?status=scheduled&date=2024-03-20
```

**Response:**
```json
[
  {
    "_id": "string",
    "doctorId": "string",
    "patientName": "string",
    "patientPhone": "string",
    "startTime": "2024-03-20T09:00:00.000Z",
    "endTime": "2024-03-20T09:30:00.000Z",
    "status": "scheduled",
    "notes": "string",
    "createdAt": "2024-03-20T09:00:00.000Z",
    "updatedAt": "2024-03-20T09:00:00.000Z"
  }
]
```

### 4. Update Appointment Status

Update the status of an appointment.

**Endpoint:** `PATCH /appointments/:appointmentId`

**Parameters:**
- `appointmentId` (path parameter): The ID of the appointment

**Request Body:**
```json
{
  "status": "completed" // or "cancelled"
}
```

**Response:**
```json
{
  "_id": "string",
  "doctorId": "string",
  "patientName": "string",
  "patientPhone": "string",
  "startTime": "2024-03-20T09:00:00.000Z",
  "endTime": "2024-03-20T09:30:00.000Z",
  "status": "completed",
  "notes": "string",
  "createdAt": "2024-03-20T09:00:00.000Z",
  "updatedAt": "2024-03-20T09:00:00.000Z"
}
```

### 5. Cancel Appointment

Cancel an existing appointment.

**Endpoint:** `DELETE /appointments/:appointmentId`

**Parameters:**
- `appointmentId` (path parameter): The ID of the appointment

**Response:**
```json
{
  "message": "Appointment cancelled successfully"
}
```

### Error Responses

**400 Bad Request:**
```json
{
  "error": "Time slot is not available"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "error": "Doctor not found"
}
```
or
```json
{
  "error": "Appointment not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to create appointment"
}
```

## Notes

1. Available slots are generated in 30-minute intervals
2. Slots are only available during doctor's working hours (default: 9 AM to 5 PM)
3. Past time slots are not available for booking
4. Each slot can only be booked once
5. All times are in UTC timezone
6. Authentication is handled through Clerk
7. The system integrates with Google Calendar for appointment management 