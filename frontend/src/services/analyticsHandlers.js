// frontend/src/services/analyticsHandlers.js

export const analyticsHandlers = {
  // Show performance by quarter
  showQuarterPerformance: (navigate, params = {}) => {
    const { quarter } = params;
    navigate(`/performance?quarter=${quarter}`);
    return { success: true, message: `Showing Q${quarter} performance` };
  },

  // Show user performance
  showUserPerformance: (navigate, params = {}) => {
    const { user } = params;
    navigate(`/performance?user=${encodeURIComponent(user)}`);
    return { success: true, message: `Showing ${user}'s performance` };
  },

  // Show time period
  showTimePeriod: (navigate, params = {}) => {
    const { period } = params; // 'week', 'month', 'year'
    navigate(`/performance?period=${period}`);
    return { success: true, message: `Showing ${period} data` };
  },

  // Filter by date
  filterByDate: (navigate, params = {}) => {
    const { startDate, endDate } = params;
    const query = new URLSearchParams();
    
    if (startDate) query.set('start', startDate);
    if (endDate) query.set('end', endDate);
    
    navigate(`/performance?${query.toString()}`);
    return { success: true, message: 'Date filter applied' };
  },

  // Clear filters
  clearFilters: (navigate) => {
    navigate('/performance');
    
    // Dispatch event to clear filters
    window.dispatchEvent(new CustomEvent('clearFilters'));
    
    return { success: true, message: 'Filters cleared' };
  },

  // Export data
  exportData: () => {
    window.dispatchEvent(new CustomEvent('exportData'));
    return { success: true, message: 'Exporting data' };
  },

  // Show reports
  showReports: (navigate) => {
    navigate('/reports');
    return { success: true, message: 'Showing reports' };
  }
};