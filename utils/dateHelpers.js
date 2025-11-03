import { format, addDays, startOfWeek, nextMonday, isMonday } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

const TIMEZONE = 'Europe/London';

/**
 * Get the current working week's Monday date
 */
export function getCurrentWorkingWeekMonday() {
  const now = utcToZonedTime(new Date(), TIMEZONE);
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // If it's Monday through Friday (1-5), return this week's Monday
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return startOfWeek(now, { weekStartsOn: 1 });
  }
  
  // If it's Saturday or Sunday, return next week's Monday
  return nextMonday(now);
}

/**
 * Get the next working week's Monday date
 * If today is Mon-Thu: next Monday
 * If today is Fri-Sun: upcoming Monday
 */
export function getNextWorkingWeekMonday() {
  const now = utcToZonedTime(new Date(), TIMEZONE);
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // If it's Monday through Thursday (1-4), get next week's Monday
  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    return nextMonday(now);
  }
  
  // If it's Friday, Saturday, or Sunday (5, 6, 0), get the upcoming Monday
  if (dayOfWeek === 0) {
    // Sunday - tomorrow is Monday
    return addDays(now, 1);
  }
  
  // Friday or Saturday - calculate days until Monday
  return nextMonday(now);
}

/**
 * Format a date as ISO string (YYYY-MM-DD) for the Monday of the week
 */
export function formatWeekDate(date) {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Get the Monday of a given week
 */
export function getMondayOfWeek(date) {
  const zonedDate = utcToZonedTime(date, TIMEZONE);
  return startOfWeek(zonedDate, { weekStartsOn: 1 }); // 1 = Monday
}

/**
 * Get array of dates for Monday-Friday of a given week
 */
export function getWeekDays(mondayDate) {
  const monday = new Date(mondayDate);
  return {
    monday: format(monday, 'yyyy-MM-dd'),
    tuesday: format(addDays(monday, 1), 'yyyy-MM-dd'),
    wednesday: format(addDays(monday, 2), 'yyyy-MM-dd'),
    thursday: format(addDays(monday, 3), 'yyyy-MM-dd'),
    friday: format(addDays(monday, 4), 'yyyy-MM-dd'),
  };
}

/**
 * Get a nicely formatted week display string
 */
export function getWeekDisplayString(mondayDate) {
  const monday = new Date(mondayDate);
  const friday = addDays(monday, 4);
  return `Week of ${format(monday, 'MMM d')} - ${format(friday, 'MMM d, yyyy')}`;
}

/**
 * Add or subtract weeks from a Monday date
 */
export function addWeeks(mondayDate, weeks) {
  const date = new Date(mondayDate);
  return format(addDays(date, weeks * 7), 'yyyy-MM-dd');
}

