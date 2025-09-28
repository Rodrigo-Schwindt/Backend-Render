import { Router } from "express";
import { calzadosController } from "../controllers/mysql/calzados.js";

import { 
  uploadProductWithVariants, 
  processProductImages,
  uploadSingle, 
  processImage, 
  uploadMultiple, 
  processImages 
} from "../middleware/upload.js";

const routeForCalzados = Router();

// Rutas básicas de productos
routeForCalzados.get("/", calzadosController.getAll);
routeForCalzados.get("/filter", calzadosController.getForFilter);
routeForCalzados.get("/types-brands", calzadosController.getTypesBrands);
routeForCalzados.get("/:id", calzadosController.getById);

// Crear producto (con variantes e imágenes múltiples)
routeForCalzados.post('/', uploadProductWithVariants, processProductImages, calzadosController.create);

// Actualizar producto (PATCH unificado)
routeForCalzados.patch("/:id", uploadSingle, processImage, calzadosController.update);

// Reemplazar un producto (PUT)
routeForCalzados.put("/:id", uploadSingle, processImage, calzadosController.replace);

routeForCalzados.delete("/:id", calzadosController.delete);

// Rutas de variantes
routeForCalzados.post("/:id/variants", calzadosController.addVariant);
routeForCalzados.post("/:id/variants/:color/images", uploadMultiple, processImages, calzadosController.addVariantImages);
routeForCalzados.post("/:id/variants/increment", calzadosController.incrementStock);
routeForCalzados.post("/:id/variants/decrement", calzadosController.decrementStock);
routeForCalzados.put("/:id/variants/:color", calzadosController.updateVariant);
routeForCalzados.delete("/:id/variants/:color", calzadosController.deleteVariant);

export default routeForCalzados;