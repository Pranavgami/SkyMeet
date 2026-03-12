require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const {
  joinRoom,
  leaveRoom,
  getUsersInRoom,
  removeUserFromAllRooms,
} = require('./roomManager');

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

app.get('/', (_req, res) => {
  res.json({ status: 'SkyMeet signaling server running' });
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('room:join', ({ roomId, name }, callback) => {
    const result = joinRoom(roomId, socket.id, name);

    if (!result.success) {
      return callback({ success: false, error: result.error });
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.name = name;

    // Notify others in the room
    socket.to(roomId).emit('room:user-joined', {
      socketId: socket.id,
      name,
    });

    callback({ success: true, users: result.users });
  });

  socket.on('room:leave', () => {
    handleUserLeave(socket);
  });

  socket.on('room:get-users', ({ roomId }, callback) => {
    const users = getUsersInRoom(roomId);
    callback({ users });
  });

  // WebRTC signaling
  socket.on('signal:offer', ({ target, offer }) => {
    io.to(target).emit('signal:offer', {
      from: socket.id,
      offer,
      name: socket.data.name,
    });
  });

  socket.on('signal:answer', ({ target, answer }) => {
    io.to(target).emit('signal:answer', {
      from: socket.id,
      answer,
    });
  });

  socket.on('signal:ice-candidate', ({ target, candidate }) => {
    io.to(target).emit('signal:ice-candidate', {
      from: socket.id,
      candidate,
    });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    handleUserLeave(socket);
  });
});

function handleUserLeave(socket) {
  const leftRooms = removeUserFromAllRooms(socket.id);
  for (const { roomId, user } of leftRooms) {
    socket.to(roomId).emit('room:user-left', {
      socketId: socket.id,
      name: user.name,
    });
    socket.leave(roomId);
  }
}

server.listen(PORT, () => {
  console.log(`SkyMeet server listening on port ${PORT}`);
});
