import cloudinary from '../../config/cloudinary.js';

export async function uploadPDF(buffer, scanId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'reports',
        // resource_type: 'raw' doesn't get an auto-appended format the way
        // image/video uploads do — the delivered secure_url's filename is
        // exactly this public_id. Without ".pdf" here, the URL (and therefore
        // whatever filename the browser suggests on download) has no
        // extension at all.
        public_id: `report-${scanId}.pdf`,
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
