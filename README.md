# Office Attendance Tracker - Developer Documentation

A Next.js application for tracking team office attendance with MongoDB backend, deployed on Vercel.

## Tech Stack

- **Frontend**: React 18, Next.js 14, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: MongoDB
- **Hosting**: Vercel
- **Date Management**: date-fns, date-fns-tz (Europe/London timezone)
- **Integrations**: Microsoft Teams Webhooks (optional)

## Architecture Overview

This is a full-stack Next.js application using:
- **Server-side rendering** for the main page
- **API Routes** as serverless backend endpoints
- **MongoDB** for data persistence
- **Vercel** for hosting and automatic deployments

### Why This Stack?

- **Next.js**: Provides both frontend and backend in a single codebase with automatic API route creation
- **Vercel**: Seamless deployment of Next.js apps with zero configuration
- **MongoDB**: Flexible document database perfect for attendance records with varying structures

## Project Structure

```
attendance_manager/
├── pages/
│   ├── index.js              # Main UI - attendance view and submission form
│   ├── _app.js               # Next.js app wrapper
│   └── api/                  # Serverless API endpoints
│       ├── users.js          # GET /api/users - fetch all users
│       ├── attendance.js     # GET /api/attendance?week=YYYY-MM-DD
│       └── submit-attendance.js  # POST /api/submit-attendance
├── lib/
│   └── mongodb.js            # MongoDB connection manager
├── utils/
│   └── dateHelpers.js        # Date utilities (timezone-aware)
├── styles/
│   └── globals.css           # Global styles and Tailwind imports
├── public/                   # Static assets
└── package.json              # Dependencies and scripts
```

## MongoDB Database Schema

### Database Name
`attendance` (configurable via `MONGODB_DATABASE` env var)

### Collections

#### 1. **users**
Stores user information and passwords.

```javascript
{
  _id: ObjectId("..."),
  name: "John Smith",           // Full name
  password: "john"               // Lowercase first name
}
```

#### 2. **attendance**
Stores weekly attendance submissions.

```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),       // Reference to users._id
  userName: "John Smith",        // Denormalized for convenience
  week: "2025-11-04",            // Monday of the week (YYYY-MM-DD)
  days: {
    monday: "office",            // Values: office, remote, holiday, offsite
    tuesday: "remote",
    wednesday: "office",
    thursday: "offsite",
    friday: "holiday"
  },
  submittedAt: ISODate("2025-11-03T10:30:00Z")
}


**Repository**: https://github.com/kasey-purvor/attendance_manager

**User Documentation**: See [USER_GUIDE.md](./USER_GUIDE.md)

