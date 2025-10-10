import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
        let transformation = {
            width: 1000,
            crop: "limit",
            quality: 60,
            format: "webp" 
        };

        let folder = 'clavestreetwear/productos';
        
        let public_id = `${path.basename(file.originalname, path.extname(file.originalname))}-${Date.now()}`;

        return {
            folder: folder,
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif'], 
            public_id: public_id,
            transformation: transformation
        };
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Solo se permiten archivos de imagen"), false);
    }
});

export const uploadSingle = upload.single("imagen");

export const uploadMultiple = upload.array("images", 10);

export const uploadProductWithVariants = upload.fields([
  { name: 'imagen', maxCount: 1 },
  { name: 'variant_images_0', maxCount: 10 },
  { name: 'variant_images_1', maxCount: 10 },
  { name: 'variant_images_2', maxCount: 10 },
  { name: 'variant_images_3', maxCount: 10 },
  { name: 'variant_images_4', maxCount: 10 },
  { name: 'variant_images_5', maxCount: 10 },
  { name: 'variant_images_6', maxCount: 10 },
  { name: 'variant_images_7', maxCount: 10 },
  { name: 'variant_images_8', maxCount: 10 },
  { name: 'variant_images_9', maxCount: 10 }
]);


export const extractCloudinaryUrls = async (req, res, next) => {
    try {
        const files = req.files || {};

        if (req.file) {
            req.fileUrl = req.file.path;
            return next();
        }

        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            req.fileUrls = req.files.map(file => file.path);
            return next();
        }

        if (Object.keys(files).length > 0) {
            if (files.imagen && files.imagen[0]) {
                req.fileUrl = files.imagen[0].path;
            }

            req.variantImageUrls = {};
            for (let i = 0; i < 10; i++) {
                const fieldName = `variant_images_${i}`;
                if (files[fieldName] && files[fieldName].length > 0) {
                    req.variantImageUrls[i] = files[fieldName].map(file => file.path);
                }
            }
            return next();
        }
        
        next();
    } catch (error) {
        console.error("Error al extraer URLs de Cloudinary:", error);
        res.status(500).json({ success: false, message: "Error al guardar imágenes en la nube", error: error.message });
    }
};