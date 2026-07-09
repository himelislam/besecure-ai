import cloudinary from '../../config/cloudinary.js';

export async function uploadPDF(buffer, scanId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'reports',
        public_id: `report-${scanId}`,
        resource_type: 'raw',
        overwrite: true,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, publicId: result.public_id, bytes: result.bytes });
      }
    );
    stream.end(buffer);
  });
}

export default uploadPDF;
