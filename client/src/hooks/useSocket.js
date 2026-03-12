import { useCallback } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export default function useSocket() {
  const { socket, connected } = useSocketContext();

  const joinRoom = useCallback((roomId, name) => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not connected'));
      socket.emit('room:join', { roomId, name }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (socket) {
      socket.emit('room:leave');
    }
  }, [socket]);

  const getRoomUsers = useCallback((roomId) => {
    return new Promise((resolve) => {
      if (!socket) return resolve({ users: [] });
      socket.emit('room:get-users', { roomId }, (response) => {
        resolve(response);
      });
    });
  }, [socket]);

  const sendOffer = useCallback((target, offer) => {
    if (socket) {
      socket.emit('signal:offer', { target, offer });
    }
  }, [socket]);

  const sendAnswer = useCallback((target, answer) => {
    if (socket) {
      socket.emit('signal:answer', { target, answer });
    }
  }, [socket]);

  const sendIceCandidate = useCallback((target, candidate) => {
    if (socket) {
      socket.emit('signal:ice-candidate', { target, candidate });
    }
  }, [socket]);

  return {
    socket,
    connected,
    joinRoom,
    leaveRoom,
    getRoomUsers,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
  };
}
