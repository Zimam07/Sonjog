import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  suggestedUsers: [],
  userProfile: null,
  posts: [],
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthUser(state, action) {
      state.user = action.payload;
    },
    setUserProfile(state, action) {
      state.userProfile = action.payload;
    },
    setSuggestedUsers(state, action) {
      state.suggestedUsers = action.payload;
    },
    setPosts(state, action) {
      state.posts = action.payload;
    },
  },
});

export const { setAuthUser, setUserProfile, setSuggestedUsers, setPosts } = authSlice.actions;
export default authSlice.reducer;
