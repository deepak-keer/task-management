import { useEffect } from 'react';
import { getSocket } from '../store/middleware/socketMiddleware';

export const useSocket = () => {
  const socket = getSocket();
  return socket;
};

export const useJoinBoard = (projectId: string | null) => {
  const socket = getSocket();

  useEffect(() => {
    if (!socket || !projectId) return;
    socket.emit('join-board', { projectId });
    return () => {
      socket.emit('leave-board', { projectId });
    };
  }, [socket, projectId]);
};

export const useTypingIndicator = (projectId: string, taskId: string) => {
  const socket = getSocket();

  const setTyping = (isTyping: boolean) => {
    if (!socket) return;
    socket.emit('typing-comment', { projectId, taskId, isTyping });
  };

  return { setTyping };
};
