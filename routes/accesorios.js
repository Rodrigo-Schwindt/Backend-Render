import { Router } from "express";
import { accesoriosController } from "../controllers/mysql/accesorios.js";

import { 
  uploadProductWithVariants, 
  extractCloudinaryUrls,  
  uploadSingle, 
  uploadMultiple, 
} from "../middleware/upload.js"; 

const routeForAccesorios = Router();

// Rutas básicas de productos
routeForAccesorios.get("/", accesoriosController.getAll);
routeForAccesorios.get("/filter", accesoriosController.getForFilter);
routeForAccesorios.get("/types-brands", accesoriosController.getTypesBrands);
routeForAccesorios.get("/:id", accesoriosController.getById);


routeForAccesorios.post('/', 
  uploadProductWithVariants, 
  extractCloudinaryUrls, 
  accesoriosController.create
);

routeForAccesorios.patch("/:id", 
  uploadSingle, 
  extractCloudinaryUrls, 
  accesoriosController.update
);

routeForAccesorios.put("/:id", 
  uploadSingle, 
  extractCloudinaryUrls, 
  accesoriosController.replace
);

routeForAccesorios.delete("/:id", accesoriosController.delete);

routeForAccesorios.post("/:id/variants", accesoriosController.addVariant);
routeForAccesorios.post("/:id/variants/:color/images", 
  uploadMultiple, 
  extractCloudinaryUrls, 
  accesoriosController.addVariantImages
);
routeForAccesorios.post("/:id/variants/increment", accesoriosController.incrementStock);
routeForAccesorios.post("/:id/variants/decrement", accesoriosController.decrementStock);
routeForAccesorios.put("/:id/variants/:color", accesoriosController.updateVariant);
routeForAccesorios.delete("/:id/variants/:color", accesoriosController.deleteVariant);

export default routeForAccesorios;