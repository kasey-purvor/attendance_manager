import { getDatabase } from '../../lib/mongodb';
import { getNextWeekMonday } from '../../utils/dateHelpers';

export default async function handler(req, res) {
  // This endpoint is triggered by Vercel Cron
  // Only allow GET requests from Vercel Cron
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDatabase();

    // Get next week's Monday date
    const nextWeekMonday = getNextWeekMonday();
    const week = nextWeekMonday.toISOString().split('T')[0];

    // Fetch all users
    const allUsers = await db.collection('users').find({}).toArray();

    // Fetch attendance records for next week
    const attendanceRecords = await db.collection('attendance')
      .find({ week })
      .toArray();

    // Check if at least one person has submitted
    if (attendanceRecords.length === 0) {
      return res.status(200).json({
        message: 'No submissions yet for next week. Notification not sent.'
      });
    }

    // Get Teams webhook URL
    const config = await db.collection('config').findOne({ _id: 'settings' });

    if (!config || !config.teamsWebhookUrl) {
      return res.status(500).json({
        error: 'Teams webhook URL not configured'
      });
    }

    // Calculate Monday and Friday dates for the week
    const monday = new Date(week);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    // Format dates nicely
    const mondayFormatted = monday.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long'
    });
    const fridayFormatted = friday.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let messageText = `📋 Attendance Summary for Next Week\n\n`;
    messageText += `**Week of ${mondayFormatted} - ${fridayFormatted}**\n\n`;

    // Build the attendance summary for each day
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    dayNames.forEach((day, index) => {
      const office = [];
      const remote = [];
      const holiday = [];
      const offsite = [];

      attendanceRecords.forEach(record => {
        const status = record.days[day];
        if (status === 'office') office.push(record.userName);
        else if (status === 'remote') remote.push(record.userName);
        else if (status === 'holiday') holiday.push(record.userName);
        else if (status === 'offsite') offsite.push(record.userName);
      });

      messageText += `**${dayLabels[index]}**\n`;
      if (office.length > 0) {
        messageText += `🏢 Office: ${office.join(', ')}\n`;
      }
      if (remote.length > 0) {
        messageText += `🏠 Remote: ${remote.join(', ')}\n`;
      }
      if (offsite.length > 0) {
        messageText += `✈️ Offsite: ${offsite.join(', ')}\n`;
      }
      if (holiday.length > 0) {
        messageText += `🌴 Holiday: ${holiday.join(', ')}\n`;
      }
      messageText += '\n';
    });

    // Add list of users who haven't submitted yet
    const submittedUserIds = attendanceRecords.map(r => r.userId.toString());
    const pendingUsers = allUsers.filter(
      user => !submittedUserIds.includes(user._id.toString())
    );

    if (pendingUsers.length > 0) {
      const pendingNames = pendingUsers.map(u => u.name).join(', ');
      messageText += `⏳ Haven't submitted yet: ${pendingNames}\n\n`;
    }

    messageText += `📅 View full schedule: https://attendance-manager-murex-one.vercel.app/`;

    const message = {
      text: messageText.trim()
    };

    // Send to Teams
    await fetch(config.teamsWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    return res.status(200).json({
      success: true,
      message: 'Weekly reminder sent successfully',
      submittedCount: attendanceRecords.length,
      pendingCount: pendingUsers.length
    });

  } catch (error) {
    console.error('Error sending weekly reminder:', error);
    return res.status(500).json({ error: 'Failed to send weekly reminder' });
  }
}
