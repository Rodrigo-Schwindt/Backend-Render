import { Router } from "express";
import { calzadosController } from "../controllers/mysql/calzados.js";

import { 
  uploadProductWithVariants, 
  uploadSingle, 
  uploadMultiple, 
  extractCloudinaryUrls, 
} from "../middleware/upload.js";

const routeForCalzados = Router();

routeForCalzados.get("/", calzadosController.getAll);
routeForCalzados.get("/filter", calzadosController.getForFilter);
routeForCalzados.get("/types-brands", calzadosController.getTypesBrands);
routeForCalzados.get("/:id", calzadosController.getById);

routeForCalzados.post('/', 
  uploadProductWithVariants, 
  extractCloudinaryUrls, 
  calzadosController.create
);


routeForCalzados.patch("/:id", 
  uploadSingle, 
  extractCloudinaryUrls, 
  calzadosController.update
);

routeForCalzados.put("/:id", 
  uploadSingle, 
  extractCloudinaryUrls,
  calzadosController.replace
);

routeForCalzados.delete("/:id", calzadosController.delete);

routeForCalzados.post("/:id/variants", calzadosController.addVariant);
routeForCalzados.post("/:id/variants/:color/images", 
  uploadMultiple, 
  extractCloudinaryUrls,
  calzadosController.addVariantImages
);
routeForCalzados.post("/:id/variants/increment", calzadosController.incrementStock);
routeForCalzados.post("/:id/variants/decrement", calzadosController.decrementStock);
routeForCalzados.put("/:id/variants/:color", calzadosController.updateVariant);
routeForCalzados.delete("/:id/variants/:color", calzadosController.deleteVariant);

export default routeForCalzados;