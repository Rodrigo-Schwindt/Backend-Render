import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// 1. Configuración de Cloudinary (Usa las variables de entorno de Render)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configuración del Storage para Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
        // Define las transformaciones y la carpeta
        let transformation = {
            width: 1000,
            crop: "limit",
            quality: 60,
            format: "webp" // Usamos WebP para una codificación más rápida
        };

        let folder = 'clavestreetwear/productos';
        
        // Define un nombre de archivo público para evitar colisiones
        let public_id = `${path.basename(file.originalname, path.extname(file.originalname))}-${Date.now()}`;

        return {
            folder: folder,
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif'], // Puedes permitir AVIF como entrada
            public_id: public_id,
            transformation: transformation
        };
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Solo se permiten archivos de imagen"), false);
    }
});


// 3. MIDDLEWARES DE SUBIDA (Usan la configuración de Cloudinary)

// SINGLE: procesar una imagen (cover)
export const uploadSingle = upload.single("imagen");

// MULTIPLE: procesar varias imágenes (variante)
export const uploadMultiple = upload.array("images", 10);

// MULTIPLE FIELD: Imágenes de producto y variantes
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


// 4. MIDDLEWARE DE PROCESAMIENTO (AHORA SOLO EXTRAE LA URL)

/**
 * Reemplaza los viejos processImage, processImages y processProductImages.
 * Cloudinary ya hizo el trabajo de sharp. Solo extraemos la URL.
 */
export const extractCloudinaryUrls = async (req, res, next) => {
    try {
        const files = req.files || {};

        // A. Manejar SÓLO la subida de UN ARCHIVO (Middleware uploadSingle)
        if (req.file) {
            // Cloudinary usa req.file.path para la URL final
            req.fileUrl = req.file.path;
            return next();
        }

        // B. Manejar la subida de MÚLTIPLES ARCHIVOS (Middleware uploadMultiple)
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            req.fileUrls = req.files.map(file => file.path);
            return next();
        }

        // C. Manejar la subida por CAMPOS (Middleware uploadProductWithVariants)
        if (Object.keys(files).length > 0) {
            // 1. Imagen de portada ('imagen')
            if (files.imagen && files.imagen[0]) {
                req.fileUrl = files.imagen[0].path; // La URL completa de Cloudinary
            }

            // 2. Imágenes de variantes
            req.variantImageUrls = {};
            for (let i = 0; i < 10; i++) {
                const fieldName = `variant_images_${i}`;
                if (files[fieldName] && files[fieldName].length > 0) {
                    req.variantImageUrls[i] = files[fieldName].map(file => file.path);
                }
            }
            return next();
        }
        
        // Si no se subió nada
        next();
    } catch (error) {
        console.error("Error al extraer URLs de Cloudinary:", error);
        res.status(500).json({ success: false, message: "Error al guardar imágenes en la nube", error: error.message });
    }
};