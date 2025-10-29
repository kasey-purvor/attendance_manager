import { getDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDatabase();
    const users = await db.collection('users')
      .find({})
      .project({ name: 1, _id: 1 })
      .sort({ name: 1 })
      .toArray();

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

