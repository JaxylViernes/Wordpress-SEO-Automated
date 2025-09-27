// server/utils/timezone-utils.ts

/**
 * Convert a local time to UTC based on timezone
 * @param localTime Time in HH:MM format (e.g., "09:00")
 * @param timezone IANA timezone string (e.g., "Asia/Tokyo")
 * @returns UTC time in HH:MM format
 */
export function convertLocalTimeToUTC(localTime: string, timezone: string): string {
  const [hours, minutes] = localTime.split(':').map(Number);
  
  // Create a date object for today with the specified time
  const now = new Date();
  const localDate = new Date(
    now.toLocaleString("en-US", { timeZone: timezone })
  );
  localDate.setHours(hours, minutes, 0, 0);
  
  // Get UTC hours and minutes
  const utcDate = new Date(localDate.toLocaleString("en-US", { timeZone: "UTC" }));
  
  // Alternative approach using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Create a date in the user's timezone
  const tempDate = new Date();
  tempDate.setHours(hours, minutes, 0, 0);
  
  // Get timezone offset in minutes
  const targetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Calculate the offset
  const timezoneOffset = getTimezoneOffset(timezone);
  
  // Adjust the time by the offset
  const utcHours = (hours - Math.floor(timezoneOffset / 60) + 24) % 24;
  const utcMinutes = (minutes - (timezoneOffset % 60) + 60) % 60;
  
  return `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
}

/**
 * Get timezone offset in minutes from UTC
 * @param timezone IANA timezone string
 * @returns Offset in minutes (positive for ahead of UTC, negative for behind)
 */
export function getTimezoneOffset(timezone: string): number {
  const now = new Date();
  
  // Format date in the target timezone
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  // Format the same date in UTC
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  
  // Calculate difference in minutes
  return Math.round((tzDate.getTime() - utcDate.getTime()) / (1000 * 60));
}

/**
 * Convert UTC time to local time based on timezone
 * @param utcTime Time in HH:MM format
 * @param timezone IANA timezone string
 * @returns Local time in HH:MM format
 */
export function convertUTCToLocalTime(utcTime: string, timezone: string): string {
  const [hours, minutes] = utcTime.split(':').map(Number);
  
  // Create a UTC date
  const utcDate = new Date();
  utcDate.setUTCHours(hours, minutes, 0, 0);
  
  // Format in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(utcDate);
  const hour = parts.find(p => p.type === 'hour')?.value || '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  
  return `${hour}:${minute}`;
}

/**
 * Check if current UTC time matches scheduled UTC time (within 5 minute window)
 * @param scheduledUTCTime Time in HH:MM format (UTC)
 * @param currentUTCHour Current UTC hour
 * @param currentUTCMinutes Current UTC minutes
 * @returns true if current time is within 5 minutes of scheduled time
 */
export function isTimeToRun(
  scheduledUTCTime: string,
  currentUTCHour: number,
  currentUTCMinutes: number
): boolean {
  const [scheduleHour, scheduleMinutes] = scheduledUTCTime.split(":").map(Number);
  
  // Check if we're within 5 minutes of the scheduled time
  if (currentUTCHour !== scheduleHour) {
    return false;
  }
  
  return Math.abs(currentUTCMinutes - scheduleMinutes) <= 5;
}

/**
 * Enhanced timezone-aware time checking using a more reliable method
 * @param localTime The time in user's timezone (HH:MM)
 * @param timezone User's timezone
 * @returns Object with UTC time and whether it should run now
 */
export function checkScheduleTime(
  localTime: string,
  timezone: string
): { utcTime: string; shouldRunNow: boolean; debugInfo: any } {
  const [localHour, localMinute] = localTime.split(':').map(Number);
  
  // Create a date for today in the user's timezone
  const now = new Date();
  
  // Create a date string in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const localDateParts = formatter.format(now).split('/');
  const localYear = parseInt(localDateParts[2]);
  const localMonth = parseInt(localDateParts[0]);
  const localDay = parseInt(localDateParts[1]);
  
  // Create a date object for the scheduled time in the user's timezone
  // This is a bit tricky - we need to create a date that when formatted
  // in the user's timezone shows the desired local time
  const testDates = [];
  
  // Try today and tomorrow to handle edge cases around midnight
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const testDate = new Date(
      Date.UTC(localYear, localMonth - 1, localDay + dayOffset, localHour, localMinute, 0, 0)
    );
    
    // Adjust for timezone offset
    const tzOffsetMinutes = -testDate.getTimezoneOffset();
    const targetTzOffset = getTimezoneOffsetForDate(testDate, timezone);
    const adjustmentMinutes = targetTzOffset - tzOffsetMinutes;
    
    testDate.setUTCMinutes(testDate.getUTCMinutes() - adjustmentMinutes);
    testDates.push(testDate);
  }
  
  // Find which date is closest to now
  const nowTime = now.getTime();
  let scheduledDate = testDates[0];
  let minDiff = Math.abs(scheduledDate.getTime() - nowTime);
  
  for (const testDate of testDates) {
    const diff = Math.abs(testDate.getTime() - nowTime);
    if (diff < minDiff) {
      minDiff = diff;
      scheduledDate = testDate;
    }
  }
  
  // Get the UTC time
  const utcHours = scheduledDate.getUTCHours();
  const utcMinutes = scheduledDate.getUTCMinutes();
  const utcTime = `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
  
  // Check if we should run now
  const currentUTCHour = now.getUTCHours();
  const currentUTCMinutes = now.getUTCMinutes();
  const shouldRunNow = isTimeToRun(utcTime, currentUTCHour, currentUTCMinutes);
  
  return {
    utcTime,
    shouldRunNow,
    debugInfo: {
      localTime,
      timezone,
      utcTime,
      currentUTC: `${String(currentUTCHour).padStart(2, '0')}:${String(currentUTCMinutes).padStart(2, '0')}`,
      scheduledDate: scheduledDate.toISOString(),
      nowDate: now.toISOString()
    }
  };
}

/**
 * Get timezone offset for a specific date
 * (handles DST transitions)
 */
function getTimezoneOffsetForDate(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const tzParts = formatter.formatToParts(date);
  const utcParts = utcFormatter.formatToParts(date);
  
  const getTotalMinutes = (parts: any[]) => {
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    return day * 24 * 60 + hour * 60 + minute;
  };
  
  const tzMinutes = getTotalMinutes(tzParts);
  const utcMinutes = getTotalMinutes(utcParts);
  
  return tzMinutes - utcMinutes;
}