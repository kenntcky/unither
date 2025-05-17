/**
 * Utility helper functions for the TaskMaster app
 */

/**
 * Format a date or timestamp to a human-readable string
 * @param {Date|Object} timestamp - Date object or Firestore timestamp
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown date';
  
  // Handle Firestore timestamps that have toDate() method
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}; 