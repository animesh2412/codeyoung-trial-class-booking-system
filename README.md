**Project Tittle : codeyoung-trial-class-booking-system**

codeyoung-trial-class-booking-system is a full-stack web application that simplifies trial-class scheduling by allowing parents to book a convenient time slot while automatically assigning an eligible mentor. It handles international time zones, daylight-saving-time transitions, booking conflicts, daily mentor capacity, and email notifications.

Built with **React, Node.js, Express, and MongoDB**, MentorSlot demonstrates full-stack development, scheduling logic, transactional database operations, and email integration.

---

## 1. Project Overview

Scheduling trial classes across different countries can be challenging because of time-zone differences, daylight-saving-time transitions, overlapping appointments, and limited mentor availability.

codeyoung-trial-class-booking-system provides a centralized scheduling system that validates booking requests, checks mentor availability, assigns eligible mentors, and manages appointments consistently.

**Project objectives**

- Simplify trial-class booking for parents.
- Automatically assign eligible mentors.
- Support international time-zone differences.
- Prevent overlapping appointments and daily capacity violations.
- Notify parents and mentors about appointments.
- Maintain consistent booking records during concurrent requests.

## 2. Key Features

- **Automatic Mentor Assignment:** Selects an eligible mentor based on availability and existing bookings.
- **Time-Zone-Aware Scheduling:** Supports international time zones using IANA identifiers.
- **Daylight-Saving-Time Handling:** Accounts for skipped and repeated local times.
- **Booking Conflict Prevention:** Checks appointment overlaps before confirming a booking.
- **Daily Capacity Management:** Limits each mentor to two confirmed demo classes per mentor-local calendar day.
- **Input Validation:** Validates booking details and time-zone information.
- **Email Notifications:** Sends booking information through SMTP using Nodemailer.
- **Meeting Link Integration:** Includes a configurable demo-class URL in booking details.
- **Transactional Database Operations:** Coordinates booking and capacity updates using MongoDB transactions.
- **Email Status Tracking:** Records notification delivery states.
- **API Security:** Uses Helmet, CORS, request validation, and rate limiting.
- **Database Seeding:** Provides a script to create ten sample mentors.

## 3. Technology Stack

| Component       | Technology                         |
| --------------- | ---------------------------------- |
| Frontend        | React 18, Vite                     |
| Backend         | Node.js, Express.js                |
| Database        | MongoDB                            |
| ODM             | Mongoose                           |
| Date and time   | Luxon                              |
| Validation      | Zod                                |
| Email           | Nodemailer                         |
| Security        | Helmet, CORS, express-rate-limit   |
| Testing         | Vitest, Supertest, Testing Library |
| Version control | Git, GitHub                        |

## 4. Architecture

MentorSlot follows a client-server architecture. The frontend communicates with the backend through REST APIs, while the backend manages scheduling, mentor assignment, database operations, and email notifications.

### Project Structure

```text
mentorslot/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── .env.example
│   └── package.json
├── server/
│   ├── src/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── app.js
│   │   ├── config.js
│   │   ├── db.js
│   │   ├── index.js
│   │   └── seed.js
│   ├── test/
│   ├── .env.example
│   └── package.json
├── docs/
│   └── ARCHITECTURE.md
├── .gitignore
├── package.json
├── README.md
└── TRANSCRIPT.md
```

**Main components**

- **Frontend:** Collects booking details and displays available slots and confirmations.
- **REST API:** Handles health checks, time zones, availability, bookings, and confirmations.
- **Booking Service:** Validates mentor eligibility, checks conflicts, and coordinates booking operations.
- **Time Utilities:** Handle UTC instants, IANA time zones, and local working hours.
- **Database Models:** Store mentors, bookings, daily capacity, and notification records.
- **Email Service:** Attempts notification delivery after a booking transaction commits.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for detailed design decisions.

## 5. Installation and Configuration

### Prerequisites

- Node.js 20 or newer
- npm
- MongoDB Atlas or a local MongoDB replica set
- SMTP credentials for email notifications
- Git (optional)

**Important:** MongoDB transactions require a replica set or supported sharded cluster. A standalone MongoDB server does not support the transaction workflow used by this project.

### Step 1: Clone the Repository

```bash
git clone <your-github-repository-url>
cd mentorslot
```

### Step 2: Install Dependencies

```bash
npm install
npm run install:all
```

### Step 3: Create Environment Files

**Windows PowerShell**

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

**macOS / Linux**

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### Step 4: Configure the Backend

Update `server/.env` with your database, SMTP, and meeting-link settings.

```dotenv
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-smtp-email>
SMTP_PASS=<your-smtp-app-password>
EMAIL_FROM="MentorSlot <no-reply@example.com>"

DEMO_CLASS_URL=https://example.com/demo-class
BOOKING_DURATION_MINUTES=30
```

Replace the placeholders with your actual configuration. Use an App Password when required by your email provider. Never commit credentials or private meeting links to GitHub.

### Step 5: Configure the Frontend

Set the API URL in `client/.env`, matching the supplied environment example.

```dotenv
VITE_API_URL=http://localhost:5000/api
```

### Step 6: Seed the Database

```bash
npm run seed --prefix server
```

This command creates ten sample mentors. Replace placeholder mentor email addresses before testing real email delivery.

## 6. Running the Application

Start both services from the project root:

```bash
npm run dev
```

Alternatively, run each service in a separate terminal.

**Backend**

```bash
npm run dev --prefix server
```

**Frontend**

```bash
npm run dev --prefix client
```

### Local Development URLs

| Service              | URL                              |
| -------------------- | -------------------------------- |
| Frontend             | http://localhost:5173            |
| Backend health check | http://localhost:5000/api/health |

Verify that the backend responds and that the database connection succeeds in the server logs.

## 7. API Documentation

All endpoints use the `/api` prefix.

| Method | Endpoint                            | Description                   |
| ------ | ----------------------------------- | ----------------------------- |
| GET    | `/api/health`                       | Check API health              |
| GET    | `/api/timezones`                    | Retrieve supported time zones |
| GET    | `/api/slots`                        | Retrieve available slots      |
| POST   | `/api/bookings`                     | Create a booking              |
| GET    | `/api/bookings/confirmation/:token` | Retrieve booking confirmation |

### Retrieve Available Slots

```http
GET /api/slots?date=2027-01-15&timezone=America/New_York
```

The request specifies a local calendar date and a valid IANA time-zone identifier.

### Create a Booking

```http
POST /api/bookings
Content-Type: application/json
```

Example request body:

```json
{
  "parentName": "Alex Morgan",
  "parentEmail": "parent@example.com",
  "parentTimezone": "America/New_York",
  "startAt": "2027-01-15T15:00:00.000Z"
}
```

The `startAt` field represents a specific UTC instant. The backend validates the request and attempts to assign an eligible mentor. A successful booking returns HTTP `201`.

### Booking Workflow

1. The parent enters their details and selects a time zone.
2. The frontend requests available slots.
3. The backend checks mentor availability, working hours, and daily capacity.
4. The parent submits the selected slot.
5. The backend validates the request and coordinates booking operations.
6. The booking and notification records are saved.
7. Email delivery is attempted after the booking transaction commits.
8. The application returns booking details and notification statuses.

### Error Handling

| Status | Meaning                                     |
| ------ | ------------------------------------------- |
| `400`  | Invalid request data                        |
| `404`  | Unknown route or invalid confirmation token |
| `409`  | Booking conflict or unavailable slot        |
| `429`  | Rate limit exceeded                         |
| `500`  | Unexpected server error                     |

## 8. Database Design and Testing

### Database Models

| Model               | Purpose                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| `Mentor`            | Stores mentor details, time zone, working hours, and active status.              |
| `Booking`           | Stores parent details, mentor assignment, appointment times, and booking status. |
| `MentorDayCapacity` | Tracks confirmed bookings per mentor and local calendar date.                    |
| `EmailOutbox`       | Tracks notification status, attempts, and errors.                                |

### Scheduling and Data Consistency

- Booking timestamps are stored as UTC instants.
- Parent and mentor time zones are handled separately.
- Daily capacity is calculated using the mentor's local calendar date.
- MongoDB transactions coordinate booking and capacity updates.
- Booking overlap checks help prevent double-booking.
- Email delivery occurs after the booking transaction commits.

Mentor assignment uses deterministic first-eligible selection rather than advanced workload balancing.

### Run the Tests

Run both test suites from the project root:

```bash
npm test
```

Run individual suites:

```bash
npm test --prefix server
npm test --prefix client
```

Build the frontend:

```bash
npm run build
```

Verify time-zone conversions, daylight-saving-time transitions, booking conflicts, daily capacity limits, and email status reporting. Run transactional tests against a supported MongoDB replica-set deployment.

## 9. Security and Future Improvements

### Security Considerations

- Store secrets in environment variables.
- Exclude `.env` files from version control.
- Restrict CORS to the intended frontend origin.
- Validate incoming requests.
- Use security headers and rate limiting.
- Restrict database permissions.
- Keep booking confirmation tokens private.
- Use HTTPS and production-appropriate settings when deploying.

### Current Limitations

- Sample mentor records are intended for demonstration.
- The default trial-class duration is 30 minutes.
- Mentor selection uses first-eligible assignment.
- Booking cancellation and rescheduling are not exposed as API endpoints.
- Automatic email retries require a background worker or queue.

### Future Improvements

- Administrative dashboard for mentors and bookings.
- Mentor dashboard for assigned classes.
- Booking cancellation and rescheduling.
- Background email retries and delivery monitoring.
- Expanded integration and end-to-end testing.
- Workload-aware mentor assignment.
- Production deployment automation and monitoring.

These are proposed improvements, not claims about implemented functionality.

---

## Author

**Animesh Mandal**

B.Tech — Computer Science and Engineering (Cyber Security)

## GitHub: [animesh2412](https://github.com/animesh2412)

## project repo link: https://github.com/animesh2412/codeyoung-trial-class-booking-system.git
