import { useState, useEffect } from 'react';
import { getNextWorkingWeekMonday, formatWeekDate, getWeekDisplayString, addWeeks } from '../utils/dateHelpers';

export default function Home() {
  const [currentWeek, setCurrentWeek] = useState('');
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [password, setPassword] = useState('');
  const [days, setDays] = useState({
    monday: 'office',
    tuesday: 'office',
    wednesday: 'office',
    thursday: 'office',
    friday: 'office',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Initialize with next working week
  useEffect(() => {
    const nextMonday = getNextWorkingWeekMonday();
    setCurrentWeek(formatWeekDate(nextMonday));
  }, []);

  // Load users
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.users) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      }
    }
    loadUsers();
  }, []);

  // Load attendance for current week
  useEffect(() => {
    if (!currentWeek) return;

    async function loadAttendance() {
      setLoading(true);
      try {
        const res = await fetch(`/api/attendance?week=${currentWeek}`);
        const data = await res.json();
        if (data.attendance) {
          setAttendance(data.attendance);
          
          // Pre-fill form if current user already submitted
          const userAttendance = data.attendance.find(
            a => a.userId === selectedUserId && a.attendance
          );
          if (userAttendance && userAttendance.attendance.days) {
            setDays(userAttendance.attendance.days);
          }
        }
      } catch (error) {
        console.error('Error loading attendance:', error);
      } finally {
        setLoading(false);
      }
    }
    loadAttendance();
  }, [currentWeek, selectedUserId]);

  const handleWeekChange = (direction) => {
    setCurrentWeek(prev => addWeeks(prev, direction));
    setMessage({ type: '', text: '' });
  };

  const handleUserChange = (e) => {
    const userId = e.target.value;
    setSelectedUserId(userId);
    
    const user = users.find(u => u._id === userId);
    setSelectedUserName(user ? user.name : '');
    
    // Clear form when changing users
    setPassword('');
    setDays({
      monday: 'office',
      tuesday: 'office',
      wednesday: 'office',
      thursday: 'office',
      friday: 'office',
    });
  };

  const handleDayChange = (day, value) => {
    setDays(prev => ({ ...prev, [day]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    if (!selectedUserId || !password) {
      setMessage({ type: 'error', text: 'Please select your name and enter your password' });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/submit-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          userName: selectedUserName,
          password,
          week: currentWeek,
          days,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setPassword('');
        
        // Reload attendance to show updated data
        const attendanceRes = await fetch(`/api/attendance?week=${currentWeek}`);
        const attendanceData = await attendanceRes.json();
        if (attendanceData.attendance) {
          setAttendance(attendanceData.attendance);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit attendance' });
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'office':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'remote':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'holiday':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-300';
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return '—';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Office Attendance Tracker
          </h1>
          <p className="text-gray-600">Track your team's weekly office attendance</p>
        </div>

        {/* Week Navigation */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleWeekChange(-1)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
            >
              ← Previous Week
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {currentWeek ? getWeekDisplayString(currentWeek) : 'Loading...'}
            </h2>
            <button
              onClick={() => handleWeekChange(1)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
            >
              Next Week →
            </button>
          </div>
        </div>

        {/* Team Attendance Grid */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-2xl font-semibold mb-4">Team Attendance</h3>
          
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading attendance...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Monday</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Tuesday</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Wednesday</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Thursday</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Friday</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((userAttendance, idx) => (
                    <tr key={userAttendance.userId} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {userAttendance.userName}
                      </td>
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => {
                        const status = userAttendance.attendance?.days?.[day];
                        return (
                          <td key={day} className="text-center py-3 px-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)}`}>
                              {getStatusLabel(status)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-500">
                        No attendance records yet for this week
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Personal Attendance Submission Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-2xl font-semibold mb-4">Submit Your Attendance</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <select
                value={selectedUserId}
                onChange={handleUserChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select your name...</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Day Selectors */}
            <div className="space-y-4">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
                <div key={day} className="flex items-center space-x-4">
                  <label className="w-32 text-sm font-medium text-gray-700 capitalize">
                    {day}
                  </label>
                  <div className="flex space-x-4">
                    {['office', 'remote', 'holiday'].map(option => (
                      <label key={option} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name={day}
                          value={option}
                          checked={days[day] === option}
                          onChange={(e) => handleDayChange(day, e.target.value)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Message Display */}
            {message.text && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition ${
                submitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Attendance'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

