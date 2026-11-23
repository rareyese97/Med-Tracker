# Med-Tracker.app

Med-Tracker.app is a full-stack medication tracking application designed to make it easier to organize medication schedules, record completed doses, and stay aware of upcoming or missed doses.

The application includes an interactive dashboard, account verification, timezone-aware reminders, and email notifications.

**Live application:** https://www.med-tracker.app

---

## Features

### Medication management
- Create, edit, and delete medication entries.
- Set a dosage, scheduled time, and one or more days of the week for each medication.
- View medications scheduled for a selected calendar date.
- Record whether a medication was taken on a particular date.
- Save dose history to the database and keep dashboard sections synchronized with the saved record.

### Dashboard and tracking
- Calendar for navigating between dates.
- Daily medication list.
- Reminders and alerts area for dose status.
- Taken-dose totals displayed in a chart.
- Account menu for medication management, timezone settings, sign-out, and account deletion.

### Timezone-aware reminders
- Automatically follows the device's current timezone when the user opens the app or returns to it.
- Supports a fixed timezone selected in account settings.
- Uses the account timezone to determine the local date, weekday, and scheduled reminder time.
- Handles local time formatting through the IANA timezone database.

### Account and email features
- User registration and login.
- Password hashing and authenticated API requests.
- Email verification using a one-time code.
- Password reset by email.
- Branded transactional emails for verification, password resets, and medication reminders.

---

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript |
| Styling and UI | Tailwind CSS 4, Heroicons |
| Charts and dates | Recharts, date-fns |
| Backend | Node.js, Express 5 |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| Email | SendGrid |
| Scheduling and timezones | node-cron, date-fns-tz, IANA timezones |
| Deployment | Vercel (frontend), Render (API and reminder cron job) |

---

## Application Architecture

The project is organized as a frontend and backend application:

```text
Med-Tracker/
├── frontend/          # Next.js application
│   └── src/
│       └── app/       # Pages, components, and client-side services
└── backend/           # Express API and background reminder task
    └── src/
        ├── jobs/      # Scheduled medication reminder job
        ├── middleware/
        ├── models/    # Mongoose models
        ├── routes/    # Authentication, medication, and interaction routes
        └── utils/     # Email and OTP utilities
```

### Request flow

1. The Next.js frontend sends requests to the Express API.
2. The API authenticates protected requests using a bearer token.
3. Mongoose reads and writes account and medication records in MongoDB.
4. The reminder cron job checks users' medication schedules using each account's saved timezone.
5. SendGrid delivers verification, password-reset, and medication-reminder emails.

The reminder worker is deployed separately from the API so it can run on a recurring schedule.

---

## Getting Started

### Prerequisites

- Node.js 20 LTS (or a compatible supported Node.js version)
- npm
- A MongoDB database (MongoDB Atlas or a local MongoDB instance)
- A SendGrid account and verified sender address for email functionality

### 1. Clone the repository

```bash
git clone https://github.com/rareyese97/Med-Tracker.git
cd Med-Tracker
```

### 2. Configure the backend

Install backend dependencies:

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
FRONTEND_URL=http://localhost:3000
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=your_verified_sender_email
```

Environment variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Port used by the Express API. Defaults to `5001`. |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` | Secret used to sign and verify authentication tokens. |
| `FRONTEND_URL` | Frontend origin used for CORS and password-reset links. |
| `SENDGRID_API_KEY` | SendGrid API key used to send transactional emails. |
| `FROM_EMAIL` | Verified sender address used for outgoing emails. |

Keep the `.env` file private. Never commit API keys, database credentials, or JWT secrets.

Start the API in development mode:

```bash
npm run dev
```

The API runs at `http://localhost:5001` by default. Its root endpoint can be used as a basic health check.

### 3. Configure the frontend

Open a second terminal and install frontend dependencies:

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
```

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run the reminder job locally (optional)

The reminder worker is a separate process from the API. It requires the backend environment variables, including `MONGO_URI`, `SENDGRID_API_KEY`, and `FROM_EMAIL`.

From the `backend/` directory, run:

```bash
node --env-file=.env src/jobs/sendReminders.js
```

This executes one reminder-checking run. For local recurring reminders, run it using a scheduler. In production, configure the Render Cron Job as described below.

---

## Deployment

The production application uses separate services:

| Service | Platform | Configuration |
| --- | --- | --- |
| Frontend | Vercel | Deploy the `frontend/` directory; set `NEXT_PUBLIC_API_BASE_URL` to the deployed API URL. |
| Backend API | Render Web Service | Run the backend start command `npm start`; configure the backend environment variables. |
| Reminder worker | Render Cron Job | Run `node src/jobs/sendReminders.js` from the `backend/` directory on a recurring schedule. |
| Database | MongoDB Atlas | Set `MONGO_URI` to the existing database connection string. |

### Reminder schedule

The reminder worker compares the current local weekday and time for each account with that user's medication schedule. It is designed to run every minute so scheduled times can be matched accurately.

Configure the Render Cron Job with:

- **Working directory:** `backend`
- **Command:** `node src/jobs/sendReminders.js`
- **Schedule:** `* * * * *` (every minute)

Add the required backend environment variables to the cron service as well as the API service. The cron job connects to MongoDB, checks due medications, sends reminder emails, and disconnects when the run finishes.

In automatic timezone mode, the browser updates the saved timezone when the user opens the application or returns to it. If a user changes timezones while the application is closed, the saved timezone is refreshed the next time the application is opened.

---

## API Overview

The API is mounted under `/api`. Protected endpoints require an authorization header:

```http
Authorization: Bearer <token>
```

### Authentication — `/api/auth`

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/register` | Create an account. |
| POST | `/login` | Authenticate an account. |
| POST | `/send-code` | Send an email verification code. |
| POST | `/verify-code` | Verify an email address. |
| POST | `/request-password-reset` | Request a password-reset email. |
| POST | `/reset-password` | Set a new password using a valid reset token. |
| GET | `/me` | Get the authenticated user's profile and timezone preferences. |
| PUT | `/timezone` | Save automatic or fixed timezone preferences. |
| POST | `/delete-account` | Delete the authenticated account after password confirmation. |

### Medications — `/api/meds`

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | Get the authenticated user's medications. Accepts an optional `date=YYYY-MM-DD` query parameter to filter by scheduled weekday. |
| POST | `/` | Create a medication. |
| PUT | `/:medId` | Update a medication. |
| PUT | `/:medId/toggle` | Toggle the taken status for a supplied date. |
| DELETE | `/:medId` | Delete a medication. |

### Interactions — `/api/interactions`

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | Retrieve medication interaction information for the authenticated user's scheduled medications and requested date. Accepts a `date=YYYY-MM-DD` query parameter. |

---

## Data and Security Notes

- Passwords are hashed with bcryptjs before being stored.
- Protected API routes use JWT authentication.
- Medication records are associated with their owning user.
- Verification codes and password-reset tokens have expiration times.
- Account deletion removes the account's medication records and associated OTP records.
- Keep production secrets in your hosting provider's environment-variable settings, not in source control.
- Medication schedules and dose history are intended for personal tracking. Always confirm medication instructions and possible interactions with a qualified healthcare professional.

## Scripts

### Frontend

Run these commands from `frontend/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Start the production server. |

### Backend

Run these commands from `backend/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Express API with Nodemon. |
| `npm start` | Start the Express API. |

---

## Disclaimer

Med-Tracker.app is a personal organization and tracking tool. It is not a medical device and does not provide medical advice, diagnosis, or treatment recommendations. It does not replace instructions from a prescriber or pharmacist. Always consult a qualified healthcare professional about medication schedules, missed doses, dosage changes, and potential drug interactions.

## License

No license has been specified for this repository. Unless a license is added, the code remains subject to its default copyright protections.
