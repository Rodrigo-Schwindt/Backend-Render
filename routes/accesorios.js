import { Router } from "express";
import { accesoriosController } from "../controllers/mysql/accesorios.js";

import { 
  uploadProductWithVariants, 
  extractCloudinaryUrls,  // <--- Importamos el nuevo middleware
  uploadSingle, 
  uploadMultiple, 
} from "../middleware/upload.js"; // Asegúrate de que este path sea correcto

const routeForAccesorios = Router();

// Rutas básicas de productos
routeForAccesorios.get("/", accesoriosController.getAll);
routeForAccesorios.get("/filter", accesoriosController.getForFilter);
routeForAccesorios.get("/types-brands", accesoriosController.getTypesBrands);
routeForAccesorios.get("/:id", accesoriosController.getById);

// Crear producto
// Ahora usamos uploadProductWithVariants para subir y luego extractCloudinaryUrls para obtener las URLs
routeForAccesorios.post('/', 
  uploadProductWithVariants, 
  extractCloudinaryUrls, // <--- CAMBIO CLAVE: Reemplaza processProductImages
  accesoriosController.create
);

// Actualizar un producto (PATCH)
// Esta ruta es para actualizar cualquier campo del producto, incluida la portada
routeForAccesorios.patch("/:id", 
  uploadSingle, 
  extractCloudinaryUrls, // <--- CAMBIO CLAVE: Reemplaza processImage
  accesoriosController.update
);

// Reemplazar un producto (PUT)
routeForAccesorios.put("/:id", 
  uploadSingle, 
  extractCloudinaryUrls, // <--- CAMBIO CLAVE: Reemplaza processImage
  accesoriosController.replace
);

// Borrar un producto
routeForAccesorios.delete("/:id", accesoriosController.delete);

// Rutas de variantes
routeForAccesorios.post("/:id/variants", accesoriosController.addVariant);
routeForAccesorios.post("/:id/variants/:color/images", 
  uploadMultiple, 
  extractCloudinaryUrls, // <--- CAMBIO CLAVE: Reemplaza processImages
  accesoriosController.addVariantImages
);
routeForAccesorios.post("/:id/variants/increment", accesoriosController.incrementStock);
routeForAccesorios.post("/:id/variants/decrement", accesoriosController.decrementStock);
routeForAccesorios.put("/:id/variants/:color", accesoriosController.updateVariant);
routeForAccesorios.delete("/:id/variants/:color", accesoriosController.deleteVariant);

export default routeForAccesorios;