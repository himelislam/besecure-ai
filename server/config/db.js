import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connection state: connected');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection state: disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB connection state: reconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error({ message: 'MongoDB connection error', error: err.message });
});

export async function connectDB() {
  mongoose.set('strictQuery', true);
  if (process.env.NODE_ENV === 'production') {
    mongoose.set('debug', false);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

export default mongoose;
