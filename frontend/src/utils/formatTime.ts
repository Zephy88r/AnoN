/**
 * Format ISO timestamp to: "YYYY-MM-DD HH:MM GMT±HH:MM"
 * Example: "2026-02-10 13:54 GMT+05:45"
 */
export function formatAdminTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    
    // Get year, month, day
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Get hours, minutes
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // Get timezone offset
    const offset = date.getTimezoneOffset();
    const absOffset = Math.abs(offset);
    const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const offsetMinutes = String(absOffset % 60).padStart(2, '0');
    const sign = offset <= 0 ? '+' : '-';
    
    return `${year}-${month}-${day} ${hours}:${minutes} GMT${sign}${offsetHours}:${offsetMinutes}`;
  } catch {
    return isoString; // fallback to original if parsing fails
  }
}
