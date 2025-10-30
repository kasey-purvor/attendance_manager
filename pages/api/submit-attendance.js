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
          // Fetch all attendance records for this week
          const allAttendance = await db.collection('attendance')
            .find({ week })
            .toArray();

          // Group users by their status for each day
          const weekDate = new Date(week);
          const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
          const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          
          let messageText = `✅ Everyone has submitted for week of ${weekDate.toLocaleDateString('en-GB', { 
            month: 'short',
            day: 'numeric'
          })}-${new Date(new Date(week).getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { 
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}!\n\n`;

          // Build the attendance summary for each day
          dayNames.forEach((day, index) => {
            const office = [];
            const remote = [];
            const holiday = [];

            allAttendance.forEach(record => {
              const status = record.days[day];
              if (status === 'office') office.push(record.userName);
              else if (status === 'remote') remote.push(record.userName);
              else if (status === 'holiday') holiday.push(record.userName);
            });

            messageText += `**${dayLabels[index]}:**\n`;
            if (office.length > 0) {
              messageText += `🏢 Office: ${office.join(', ')}\n`;
            }
            if (remote.length > 0) {
              messageText += `🏠 Remote: ${remote.join(', ')}\n`;
            }
            if (holiday.length > 0) {
              messageText += `🌴 Holiday: ${holiday.join(', ')}\n`;
            }
            messageText += '\n';
          });

          const message = {
            text: messageText.trim()
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

