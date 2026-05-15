import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OnlineUser {
  userId: string;
  status: string;
}

interface SocketState {
  connected: boolean;
  onlineUsers: OnlineUser[];
  typingUsers: Array<{ userId: string; taskId: string }>;
}

const socketSlice = createSlice({
  name: 'socket',
  initialState: {
    connected: false,
    onlineUsers: [],
    typingUsers: [],
  } as SocketState,
  reducers: {
    connectSocket() {},
    setConnected(state, action: PayloadAction<boolean>) {
      state.connected = action.payload;
    },
    setUserOnline(state, action: PayloadAction<OnlineUser>) {
      const exists = state.onlineUsers.find((u) => u.userId === action.payload.userId);
      if (!exists) {
        state.onlineUsers.push(action.payload);
      } else {
        exists.status = action.payload.status;
      }
    },
    setUserOffline(state, action: PayloadAction<string>) {
      state.onlineUsers = state.onlineUsers.filter((u) => u.userId !== action.payload);
    },
    updateUserStatus(state, action: PayloadAction<OnlineUser>) {
      const user = state.onlineUsers.find((u) => u.userId === action.payload.userId);
      if (user) user.status = action.payload.status;
    },
    setTyping(state, action: PayloadAction<{ userId: string; taskId: string; isTyping: boolean }>) {
      const { userId, taskId, isTyping } = action.payload;
      if (isTyping) {
        const exists = state.typingUsers.find((u) => u.userId === userId && u.taskId === taskId);
        if (!exists) state.typingUsers.push({ userId, taskId });
      } else {
        state.typingUsers = state.typingUsers.filter(
          (u) => !(u.userId === userId && u.taskId === taskId),
        );
      }
    },
  },
});

export const { connectSocket, setConnected, setUserOnline, setUserOffline, updateUserStatus, setTyping } =
  socketSlice.actions;
export default socketSlice.reducer;
