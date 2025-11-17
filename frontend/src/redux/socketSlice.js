import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  connected: false,
  id: null,
};

const socketSlice = createSlice({
  name: 'socketio',
  initialState,
  reducers: {
    setSocket(state, action) {
      const payload = action.payload;
      if (!payload) {
        state.connected = false;
        state.id = null;
      } else {
        state.connected = !!payload.connected;
        state.id = payload.id || null;
      }
    },
  },
});

export const { setSocket } = socketSlice.actions;
export default socketSlice.reducer;
