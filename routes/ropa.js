import { Router } from "express";
import { ropaController } from "../controllers/mysql/ropa.js";
import { 
  uploadProductWithVariants, 
  // Eliminamos processProductImages
  uploadSingle, 
  // Eliminamos processImage
  uploadMultiple, 
  // Eliminamos processImages
  extractCloudinaryUrls, // <--- CAMBIO CLAVE: Importamos el nuevo extractor
} from "../middleware/upload.js";

const routeForRopa = Router();

// Rutas básicas de productos
routeForRopa.get("/", ropaController.getAll);
routeForRopa.get("/filter", ropaController.getForFilter);
routeForRopa.get("/types-brands", ropaController.getTypesBrands);
routeForRopa.get("/:id", ropaController.getById);

// Crear producto (con variantes e imágenes múltiples)
routeForRopa.post('/', 
  uploadProductWithVariants, 
  extractCloudinaryUrls, // <--- Usamos el nuevo middleware
  ropaController.create
);

// Actualizar producto (PATCH unificado)
routeForRopa.patch("/:id", 
  uploadSingle, 
  extractCloudinaryUrls, // <--- Usamos el nuevo middleware
  ropaController.update
);

// Reemplazar un producto (PUT)
routeForRopa.put("/:id", 
  uploadSingle, 
  extractCloudinaryUrls, // <--- Usamos el nuevo middleware
  ropaController.replace
);

routeForRopa.delete("/:id", ropaController.delete);

// Rutas de variantes
routeForRopa.post("/:id/variants", ropaController.addVariant);
routeForRopa.post("/:id/variants/:color/images", 
  uploadMultiple, 
  extractCloudinaryUrls, // <--- Usamos el nuevo middleware
  ropaController.addVariantImages
);
routeForRopa.post("/:id/variants/increment", ropaController.incrementStock);
routeForRopa.post("/:id/variants/decrement", ropaController.decrementStock);
routeForRopa.put("/:id/variants/:color", ropaController.updateVariant);
routeForRopa.delete("/:id/variants/:color", ropaController.deleteVariant);

export default routeForRopa;