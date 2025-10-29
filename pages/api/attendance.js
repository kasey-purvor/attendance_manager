import { getDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { week } = req.query;

  if (!week) {
    return res.status(400).json({ error: 'Week parameter is required (YYYY-MM-DD format)' });
  }

  try {
    const db = await getDatabase();
    
    // Get all users
    const users = await db.collection('users')
      .find({})
      .project({ name: 1, _id: 1 })
      .sort({ name: 1 })
      .toArray();

    // Get attendance records for this week
    const attendanceRecords = await db.collection('attendance')
      .find({ week })
      .toArray();

    // Create a map of attendance by userId
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.userId.toString()] = record;
    });

    // Combine users with their attendance (or null if not submitted)
    const result = users.map(user => ({
      userId: user._id,
      userName: user.name,
      attendance: attendanceMap[user._id.toString()] || null,
    }));

    return res.status(200).json({ week, attendance: result });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return res.status(500).json({ error: 'Failed to fetch attendance' });
  }
}

