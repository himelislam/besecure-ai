import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger.js';

let configured = false;

export function initCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    logger.warn('Cloudinary is not configured — file upload features will be unavailable');
    return null;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  configured = true;
  logger.info('Cloudinary configured');
  return cloudinary;
}

export function isCloudinaryConfigured() {
  return configured;
}

export default cloudinary;
