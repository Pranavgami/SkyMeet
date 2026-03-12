// In-memory room state: Map<roomId, Map<socketId, { name, socketId }>>
const rooms = new Map();

function createRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  return rooms.get(roomId);
}

function joinRoom(roomId, socketId, name) {
  const room = createRoom(roomId);
  if (room.size >= 6) {
    return { success: false, error: 'Room is full (max 6 participants)' };
  }
  room.set(socketId, { name, socketId });
  return { success: true, users: getUsersInRoom(roomId) };
}

function leaveRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const user = room.get(socketId);
  room.delete(socketId);

  if (room.size === 0) {
    rooms.delete(roomId);
  }

  return user;
}

function getUsersInRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.values());
}

function getUserInRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return room.get(socketId) || null;
}

function removeUserFromAllRooms(socketId) {
  const leftRooms = [];
  for (const [roomId, room] of rooms.entries()) {
    if (room.has(socketId)) {
      const user = room.get(socketId);
      room.delete(socketId);
      leftRooms.push({ roomId, user });
      if (room.size === 0) {
        rooms.delete(roomId);
      }
    }
  }
  return leftRooms;
}

function roomExists(roomId) {
  return rooms.has(roomId) && rooms.get(roomId).size > 0;
}

function getRoomCount(roomId) {
  const room = rooms.get(roomId);
  return room ? room.size : 0;
}

module.exports = {
  joinRoom,
  leaveRoom,
  getUsersInRoom,
  getUserInRoom,
  removeUserFromAllRooms,
  roomExists,
  getRoomCount,
};
