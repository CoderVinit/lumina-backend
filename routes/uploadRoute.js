import express from 'express';
import { upload } from '../middleware/uploadMiddleware.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// The 'image' field refers to the name attribute in the FormData from frontend
router.post('/', verifyToken, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            console.error("Multer/Cloudinary Upload Error:", err);
            return res.status(500).json({
                message: "Upload failed",
                error: err.message,
                details: err.http_code || err.name || null
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file provided" });
        }

        console.log("Uploaded file:", req.file);

        res.status(200).json({
            message: "Image uploaded successfully",
            imageUrl: req.file.path
        });
    });
});

router.post('/multiple', verifyToken, (req, res, next) => {
    upload.array('images', 4)(req, res, (err) => {
        if (err) {
            console.error("Multer/Cloudinary Multiple Upload Error:", err);
            return res.status(500).json({
                message: "Upload failed",
                error: err.message,
                details: err.http_code || err.name || null
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files provided" });
        }

        console.log("Uploaded files:", req.files);

        const imageUrls = req.files.map(file => file.path);

        res.status(200).json({
            message: "Images uploaded successfully",
            imageUrls
        });
    });
});

export default router;
