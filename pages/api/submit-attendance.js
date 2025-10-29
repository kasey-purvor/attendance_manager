import { getDatabase } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, userName, password, week, days } = req.body;

  // Validate required fields
  if (!userId || !userName || !password || !week || !days) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate days object has all weekdays
  const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const validValues = ['office', 'remote', 'holiday'];
  
  for (const day of requiredDays) {
    if (!days[day] || !validValues.includes(days[day])) {
      return res.status(400).json({ 
        error: `Invalid or missing value for ${day}. Must be: office, remote, or holiday` 
      });
    }
  }

  try {
    const db = await getDatabase();

    // Authenticate user - verify password matches
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Upsert attendance record
    const attendanceRecord = {
      userId: new ObjectId(userId),
      userName: user.name,
      week,
      days,
      submittedAt: new Date(),
    };

    await db.collection('attendance').updateOne(
      { userId: new ObjectId(userId), week },
      { $set: attendanceRecord },
      { upsert: true }
    );

    // Check if all users have submitted for this week
    const totalUsers = await db.collection('users').countDocuments();
    const submittedCount = await db.collection('attendance').countDocuments({ week });
    const allSubmitted = totalUsers === submittedCount;

    // If all submitted, send Teams notification
    if (allSubmitted) {
      try {
        const config = await db.collection('config').findOne({ _id: 'settings' });
        
        if (config && config.teamsWebhookUrl) {
          const weekDate = new Date(week);
          const message = {
            text: `✅ Everyone has submitted their office attendance for week of ${weekDate.toLocaleDateString('en-GB', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}!`
          };

          await fetch(config.teamsWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
          });
        }
      } catch (webhookError) {
        // Log error but don't fail the submission
        console.error('Failed to send Teams notification:', webhookError);
      }
    }

    return res.status(200).json({ 
      success: true, 
      allSubmitted,
      message: allSubmitted 
        ? 'Attendance submitted! Everyone has now submitted for this week.' 
        : 'Attendance submitted successfully!'
    });

  } catch (error) {
    console.error('Error submitting attendance:', error);
    return res.status(500).json({ error: 'Failed to submit attendance' });
  }
}

