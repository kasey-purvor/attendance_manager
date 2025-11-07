# Quick Setup Guide

## 1. Create Environment File

Create a file named `.env.local` in the root directory with these contents:

```
MONGODB_URI=mongodb+srv://attendance_manager:ECUNXeL3Uqo2krIY@cluster0.idf5iqw.mongodb.net/?appName=Cluster0
MONGODB_DATABASE=attendance
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Setup MongoDB Collections

In MongoDB Atlas, create these collections in the `attendance` database:

### users collection
Add team members manually:
```javascript
{
  name: "John Smith",
  password: "password123",
  teamsEmail: "john@company.com",
  phoneNumber: "+447123456789"
}
```

### config collection (optional - for Teams notifications)
```javascript
{
  _id: "settings",
  teamsWebhookUrl: "https://your-webhook-url.office.com/webhookb2/..."
}
```

The `attendance` collection will be created automatically.

## 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## 5. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or connect your GitHub repo to Vercel dashboard.

Don't forget to add environment variables in Vercel project settings!

