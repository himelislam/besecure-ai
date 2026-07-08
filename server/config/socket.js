import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = payload.userId || payload.sub || payload._id;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    logger.info(`Socket connected: user:${socket.userId}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: user:${socket.userId}`);
    });
  });

  logger.info('Socket.io initialized');
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized — call initSocket() first');
  }
  return io;
}

export function emitToUser(userId, event, data) {
  getIO().to(`user:${userId}`).emit(event, data);
}

export default initSocket;
