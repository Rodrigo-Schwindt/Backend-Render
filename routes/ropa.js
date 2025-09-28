import { Router } from "express";
import { ropaController } from "../controllers/mysql/ropa.js";
import { 
  uploadProductWithVariants, 
  processProductImages,
  uploadSingle, 
  processImage, 
  uploadMultiple, 
  processImages 
} from "../middleware/upload.js";

const routeForRopa = Router();

// Rutas básicas de productos
routeForRopa.get("/", ropaController.getAll);
routeForRopa.get("/filter", ropaController.getForFilter);
routeForRopa.get("/types-brands", ropaController.getTypesBrands);
routeForRopa.get("/:id", ropaController.getById);

// Crear producto (con variantes e imágenes múltiples)
routeForRopa.post('/', uploadProductWithVariants, processProductImages, ropaController.create);

// Actualizar producto (PATCH unificado)
routeForRopa.patch("/:id", uploadSingle, processImage, ropaController.update);

// Reemplazar un producto (PUT)
routeForRopa.put("/:id", uploadSingle, processImage, ropaController.replace);

routeForRopa.delete("/:id", ropaController.delete);

// Rutas de variantes
routeForRopa.post("/:id/variants", ropaController.addVariant);
routeForRopa.post("/:id/variants/:color/images", uploadMultiple, processImages, ropaController.addVariantImages);
routeForRopa.post("/:id/variants/increment", ropaController.incrementStock);
routeForRopa.post("/:id/variants/decrement", ropaController.decrementStock);
routeForRopa.put("/:id/variants/:color", ropaController.updateVariant);
routeForRopa.delete("/:id/variants/:color", ropaController.deleteVariant);

export default routeForRopa;