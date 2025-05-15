/**
 * Utility helper functions for the TaskMaster app
 */

/**
 * Format a date object or timestamp string into a human-readable format
 * @param {Date|string|object} timestamp - The timestamp to format (can be Date, string, or Firestore timestamp)
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  // Handle Firebase Timestamp objects (which have toDate method)
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  // Make sure the date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}; 