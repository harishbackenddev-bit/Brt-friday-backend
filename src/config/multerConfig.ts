import multer from "multer";
import path from "path";
import fs from "fs";


const profileUploadDir = "public/uploads/profiles";
if (!fs.existsSync(profileUploadDir)) fs.mkdirSync(profileUploadDir, { recursive: true });

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileUploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "profile-" + uniqueSuffix + ext);
  },
});

const profileFileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) cb(null, true);
  else cb(new Error("Only image files are allowed!"));
};

export const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: profileFileFilter,
});
