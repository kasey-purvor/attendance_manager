import { useState, useEffect } from 'react';
import { getCurrentWorkingWeekMonday, getNextWorkingWeekMonday, formatWeekDate, getWeekDisplayString, addWeeks } from '../utils/dateHelpers';

export default function Home() {
  const [currentWeek, setCurrentWeek] = useState('');
  const [nextWeek, setNextWeek] = useState('');
  const [users, setUsers] = useState([]);
  const [currentWeekAttendance, setCurrentWeekAttendance] = useState([]);
  const [nextWeekAttendance, setNextWeekAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState({});
  
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
  const [formExpanded, setFormExpanded] = useState(false);

  // Initialize with current and next working week
  useEffect(() => {
    const currentMonday = getCurrentWorkingWeekMonday();
    const nextMonday = getNextWorkingWeekMonday();
    setCurrentWeek(formatWeekDate(currentMonday));
    setNextWeek(formatWeekDate(nextMonday));
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

  // Load attendance for both current and next week
  useEffect(() => {
    if (!currentWeek || !nextWeek) return;

    async function loadAttendance() {
      setLoading(true);
      try {
        // Fetch both weeks in parallel
        const [currentRes, nextRes] = await Promise.all([
          fetch(`/api/attendance?week=${currentWeek}`),
          fetch(`/api/attendance?week=${nextWeek}`)
        ]);
        
        const [currentData, nextData] = await Promise.all([
          currentRes.json(),
          nextRes.json()
        ]);
        
        if (currentData.attendance) {
          setCurrentWeekAttendance(currentData.attendance);
        }
        
        if (nextData.attendance) {
          setNextWeekAttendance(nextData.attendance);
          
          // Pre-fill form if current user already submitted for next week
          const userAttendance = nextData.attendance.find(
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
  }, [currentWeek, nextWeek, selectedUserId]);

  const handleWeekChange = (direction) => {
    setCurrentWeek(prev => addWeeks(prev, direction));
    setNextWeek(prev => addWeeks(prev, direction));
    setMessage({ type: '', text: '' });
  };

  const toggleCard = (userId) => {
    setExpandedCards(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const getAttendanceSummary = (userAttendance) => {
    if (!userAttendance.attendance?.days) {
      return 'Not submitted';
    }
    
    const days = userAttendance.attendance.days;
    const counts = {
      office: 0,
      remote: 0,
      holiday: 0,
      offsite: 0
    };
    
    Object.values(days).forEach(status => {
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      }
    });
    
    const parts = [];
    if (counts.office > 0) parts.push(`${counts.office} 🏢`);
    if (counts.remote > 0) parts.push(`${counts.remote} 🏠`);
    if (counts.offsite > 0) parts.push(`${counts.offsite} ✈️`);
    if (counts.holiday > 0) parts.push(`${counts.holiday} 🌴`);
    
    return parts.length > 0 ? parts.join(', ') : 'Not submitted';
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
          week: nextWeek,
          days,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setPassword('');
        
        // Reload next week attendance to show updated data
        const attendanceRes = await fetch(`/api/attendance?week=${nextWeek}`);
        const attendanceData = await attendanceRes.json();
        if (attendanceData.attendance) {
          setNextWeekAttendance(attendanceData.attendance);
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
      case 'offsite':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-300';
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return '—';
    const emoji = {
      office: '🏢 ',
      remote: '🏠 ',
      offsite: '✈️ ',
      holiday: '🌴 '
    }[status] || '';
    return emoji + status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen py-4 md:py-8 px-3 md:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
            Office Attendance Tracker
          </h1>
          <p className="text-sm md:text-base text-gray-600">Track your team's weekly office attendance</p>
        </div>

        {/* Week Navigation */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
            <button
              onClick={() => handleWeekChange(-1)}
              className="w-full md:w-auto px-6 py-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg font-medium transition touch-manipulation"
            >
              ← Previous Week
            </button>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 text-center order-first md:order-none">
              Viewing weeks of {currentWeek ? new Date(currentWeek).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : '...'} & {nextWeek ? new Date(nextWeek).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : '...'}
            </h2>
            <button
              onClick={() => handleWeekChange(1)}
              className="w-full md:w-auto px-6 py-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg font-medium transition touch-manipulation"
            >
              Next Week →
            </button>
          </div>
        </div>

        {/* Team Attendance - Side by Side on Desktop, Stacked on Mobile */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6 md:mb-8">
            <div className="text-center py-8 text-gray-600">Loading attendance...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 md:mb-8">
            {/* Current Week */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h3 className="text-xl md:text-2xl font-semibold mb-4 text-blue-700">
                Current Week
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {currentWeek ? getWeekDisplayString(currentWeek) : ''}
              </p>
              
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Name</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700">Mon</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700">Tue</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700">Wed</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700">Thu</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700">Fri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentWeekAttendance.map((userAttendance, idx) => (
                      <tr key={userAttendance.userId} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-2 px-2 font-medium text-gray-900 text-sm">
                          {userAttendance.userName}
                        </td>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => {
                          const status = userAttendance.attendance?.days?.[day];
                          return (
                            <td key={day} className="text-center py-2 px-1">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                                {status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {currentWeekAttendance.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-500">
                          No attendance records yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Accordion View */}
              <div className="md:hidden space-y-2">
                {currentWeekAttendance.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No attendance records yet
                  </div>
                ) : (
                  currentWeekAttendance.map((userAttendance) => {
                    const isExpanded = expandedCards[`current-${userAttendance.userId}`];
                    return (
                      <div key={userAttendance.userId} className="border border-gray-200 rounded-lg bg-gray-50">
                        <button
                          onClick={() => toggleCard(`current-${userAttendance.userId}`)}
                          className="w-full p-3 flex justify-between items-center text-left touch-manipulation"
                        >
                          <span className="font-semibold text-gray-900">
                            {userAttendance.userName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">
                              {getAttendanceSummary(userAttendance)}
                            </span>
                            <span className="text-gray-400">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-2 border-t border-gray-200 pt-2">
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => {
                              const status = userAttendance.attendance?.days?.[day];
                              return (
                                <div key={day} className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-700 capitalize">
                                    {day}
                                  </span>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)}`}>
                                    {getStatusLabel(status)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Next Week */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h3 className="text-xl md:text-2xl font-semibold mb-4 text-green-700">
                Next Week
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {nextWeek ? getWeekDisplayString(nextWeek) : ''}
              </p>
              
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Name</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700">Mon</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700">Tue</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700">Wed</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700">Thu</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700">Fri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nextWeekAttendance.map((userAttendance, idx) => (
                      <tr key={userAttendance.userId} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-2 px-2 font-medium text-gray-900 text-sm">
                          {userAttendance.userName}
                        </td>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => {
                          const status = userAttendance.attendance?.days?.[day];
                          return (
                            <td key={day} className="text-center py-2 px-1">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                                {status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {nextWeekAttendance.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-500">
                          No attendance records yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Accordion View */}
              <div className="md:hidden space-y-2">
                {nextWeekAttendance.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No attendance records yet
                  </div>
                ) : (
                  nextWeekAttendance.map((userAttendance) => {
                    const isExpanded = expandedCards[`next-${userAttendance.userId}`];
                    return (
                      <div key={userAttendance.userId} className="border border-gray-200 rounded-lg bg-gray-50">
                        <button
                          onClick={() => toggleCard(`next-${userAttendance.userId}`)}
                          className="w-full p-3 flex justify-between items-center text-left touch-manipulation"
                        >
                          <span className="font-semibold text-gray-900">
                            {userAttendance.userName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">
                              {getAttendanceSummary(userAttendance)}
                            </span>
                            <span className="text-gray-400">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-2 border-t border-gray-200 pt-2">
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => {
                              const status = userAttendance.attendance?.days?.[day];
                              return (
                                <div key={day} className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-700 capitalize">
                                    {day}
                                  </span>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)}`}>
                                    {getStatusLabel(status)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Personal Attendance Submission Form */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl md:text-2xl font-semibold">Submit Your Attendance</h3>
              <p className="text-sm text-gray-600 mt-1">
                For {nextWeek ? getWeekDisplayString(nextWeek) : 'next week'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormExpanded(!formExpanded)}
              className="md:hidden px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition touch-manipulation"
            >
              {formExpanded ? 'Close' : 'Open Form'}
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className={`space-y-6 ${formExpanded ? 'block' : 'hidden'} md:block`}>
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <select
                value={selectedUserId}
                onChange={handleUserChange}
                className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
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
            <div className="space-y-3">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
                <div key={day} className="flex items-center gap-3">
                  <label className="w-24 text-sm font-medium text-gray-700 capitalize">
                    {day}
                  </label>
                  <div className="flex gap-1">
                    {['office', 'remote', 'offsite', 'holiday'].map(option => {
                      const isSelected = days[day] === option;
                      let selectedClasses = '';
                      if (isSelected) {
                        if (option === 'office') {
                          selectedClasses = 'bg-green-600 text-white border-green-600';
                        } else if (option === 'remote') {
                          selectedClasses = 'bg-blue-600 text-white border-blue-600';
                        } else if (option === 'offsite') {
                          selectedClasses = 'bg-purple-600 text-white border-purple-600';
                        } else if (option === 'holiday') {
                          selectedClasses = 'bg-yellow-500 text-white border-yellow-500';
                        }
                      }
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleDayChange(day, option)}
                          className={`py-2 px-3 md:py-1.5 md:px-3 rounded-md font-medium transition-all touch-manipulation text-sm border ${
                            isSelected
                              ? `${selectedClasses} shadow-sm`
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 active:bg-gray-300'
                          }`}
                        >
                          <span className="capitalize">
                            {option === 'office' && '🏢 '}
                            {option === 'remote' && '🏠 '}
                            {option === 'offsite' && '✈️ '}
                            {option === 'holiday' && '🌴 '}
                            {option}
                          </span>
                        </button>
                      );
                    })}
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
                className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
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
              className={`w-full py-4 md:py-3 px-6 rounded-lg font-semibold text-white transition text-base md:text-lg touch-manipulation ${
                submitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
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

