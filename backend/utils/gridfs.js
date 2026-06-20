import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

let gridFSBucket = null;

export const initGridFS = () => {
  if (!gridFSBucket && mongoose.connection.db) {
    gridFSBucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'avatars'
    });
    console.log('GridFS initialized for avatars');
  }
  return gridFSBucket;
};

export const getGridFS = () => {
  if (!gridFSBucket) {
    return initGridFS();
  }
  return gridFSBucket;
};

// Upload file to GridFS
export const uploadFileToGridFS = (buffer, filename, metadata = {}) => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFS();
    if (!bucket) {
      reject(new Error('GridFS not initialized'));
      return;
    }

    const uploadStream = bucket.openUploadStream(filename, {
      metadata
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve(uploadStream.id.toString());
    });

    uploadStream.end(buffer);
  });
};

// Get file from GridFS
export const getFileFromGridFS = (fileId) => {
  const bucket = getGridFS();
  if (!bucket) {
    throw new Error('GridFS not initialized');
  }
  
  const objectId = new mongoose.Types.ObjectId(fileId);
  return bucket.openDownloadStream(objectId);
};

// Delete file from GridFS
export const deleteFileFromGridFS = async (fileId) => {
  const bucket = getGridFS();
  if (!bucket) {
    throw new Error('GridFS not initialized');
  }
  
  const objectId = new mongoose.Types.ObjectId(fileId);
  await bucket.delete(objectId);
};

// Find file by ID
export const findFileById = async (fileId) => {
  const bucket = getGridFS();
  if (!bucket) {
    throw new Error('GridFS not initialized');
  }
  
  const objectId = new mongoose.Types.ObjectId(fileId);
  const files = await bucket.find({ _id: objectId }).toArray();
  return files[0] || null;
};
