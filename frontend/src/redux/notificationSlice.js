import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notification',
  initialState: {
    notifications: [],
    unreadCount: 0,
  },
  reducers: {
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications.pop();
      }
    },
    removeNotification: (state, action) => {
      const index = state.notifications.findIndex(
        (n) => n._id === action.payload
      );
      if (index !== -1) {
        state.notifications.splice(index, 1);
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    markAsRead: (state) => {
      state.unreadCount = 0;
    },
  },
});

export const {
  addNotification,
  removeNotification,
  clearNotifications,
  markAsRead,
} = notificationSlice.actions;

export default notificationSlice.reducer;
