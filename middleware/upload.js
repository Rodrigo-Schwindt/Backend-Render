import multer from "multer";
import sharp from "sharp";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir);
}

// Configuración base de multer
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo se permiten archivos de imagen"), false);
  }
});

// Función auxiliar para eliminar archivos temporales
async function safeUnlink(filePath, retries = 5, delay = 200) {
  for (let i = 0; i < retries; i++) {
    try {
      await fs.unlink(filePath);
      return;
    } catch (err) {
      if ((err.code === 'EBUSY' || err.code === 'EPERM') && i < retries - 1) {
        await new Promise(res => setTimeout(res, delay));
        continue;
      } else if (err.code === 'ENOENT') {
        return;
      }
      throw err;
    }
  }
}

// MIDDLEWARES ORIGINALES (para mantener compatibilidad)

// SINGLE: procesar una imagen (cover)
export const uploadSingle = upload.single("imagen");

export const processImage = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const inputPath = req.file.path;
    const outputFileName = `${Date.now()}-${Math.round(Math.random() * 1e6)}.avif`;
    const outputPath = path.join(uploadDir, outputFileName);

    await sharp(inputPath).resize(1000).avif({ quality: 50 }).toFile(outputPath);
    await safeUnlink(inputPath);

    req.fileUrl = `/uploads/${outputFileName}`;
    next();
  } catch (error) {
    console.error("❌ Error al procesar imagen:", error);
    res.status(500).json({ success: false, message: "Error al procesar la imagen", error: error.message });
  }
};

// MULTIPLE: procesar varias imágenes (variante)
export const uploadMultiple = upload.array("images", 10);

export const processImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();
  try {
    const urls = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const inputPath = file.path;
      const outputFileName = `${Date.now()}-${i}-${Math.round(Math.random() * 1e6)}.avif`;
      const outputPath = path.join(uploadDir, outputFileName);

      await sharp(inputPath).resize(1000).avif({ quality: 50 }).toFile(outputPath);
      await safeUnlink(inputPath);

      urls.push(`/uploads/${outputFileName}`);
    }
    req.fileUrls = urls;
    next();
  } catch (error) {
    console.error("❌ Error al procesar imágenes:", error);
    res.status(500).json({ success: false, message: "Error al procesar las imágenes", error: error.message });
  }
};

// NUEVOS MIDDLEWARES (para creación de productos con variantes)

// Middleware para manejar imágenes de variantes en creación
export const uploadProductWithVariants = upload.fields([
  { name: 'imagen', maxCount: 1 }, // imagen de portada
  { name: 'variant_images_0', maxCount: 10 }, // imágenes variante 0 (principal)
  { name: 'variant_images_1', maxCount: 10 }, // imágenes variante 1
  { name: 'variant_images_2', maxCount: 10 }, // etc...
  { name: 'variant_images_3', maxCount: 10 },
  { name: 'variant_images_4', maxCount: 10 },
  { name: 'variant_images_5', maxCount: 10 },
  { name: 'variant_images_6', maxCount: 10 },
  { name: 'variant_images_7', maxCount: 10 },
  { name: 'variant_images_8', maxCount: 10 },
  { name: 'variant_images_9', maxCount: 10 }
]);

export const processProductImages = async (req, res, next) => {
  try {
    const files = req.files || {};
    
    // Procesar imagen de portada
    if (files.imagen && files.imagen[0]) {
      const coverFile = files.imagen[0];
      const outputFileName = `${Date.now()}-cover.avif`;
      const outputPath = path.join(uploadDir, outputFileName);
      
      await sharp(coverFile.path).resize(1000).avif({ quality: 50 }).toFile(outputPath);
      await safeUnlink(coverFile.path);
      
      req.fileUrl = `/uploads/${outputFileName}`;
    }
    
    // Procesar imágenes de variantes
    req.variantImageUrls = {};
    
    for (let i = 0; i < 10; i++) {
      const fieldName = `variant_images_${i}`;
      if (files[fieldName] && files[fieldName].length > 0) {
        const urls = [];
        
        for (let j = 0; j < files[fieldName].length; j++) {
          const file = files[fieldName][j];
          const outputFileName = `${Date.now()}-variant-${i}-${j}.avif`;
          const outputPath = path.join(uploadDir, outputFileName);
          
          await sharp(file.path).resize(1000).avif({ quality: 50 }).toFile(outputPath);
          await safeUnlink(file.path);
          
          urls.push(`/uploads/${outputFileName}`);
        }
        
        req.variantImageUrls[i] = urls;
      }
    }
    
    next();
  } catch (error) {
    console.error("Error procesando imágenes del producto:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al procesar las imágenes", 
      error: error.message 
    });
  }
};