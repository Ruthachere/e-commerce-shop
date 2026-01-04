import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { uploadDir } from './fileHelper';
// import the same folder

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const sanitized = file.originalname.replace(/\s+/g, '-');
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  cb(isValid ? null : new Error('Only image files are allowed'), isValid);
};

export const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });
