import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  likeNotification: [],
};

const rtnSlice = createSlice({
  name: 'rtn',
  initialState,
  reducers: {
    setLikeNotification(state, action) {
      state.likeNotification = action.payload;
    },
  },
});

export const { setLikeNotification } = rtnSlice.actions;
export default rtnSlice.reducer;
