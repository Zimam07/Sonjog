import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  onlineUsers: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setOnlineUsers(state, action) {
      state.onlineUsers = action.payload;
    },
  },
});

export const { setOnlineUsers } = chatSlice.actions;
export default chatSlice.reducer;
