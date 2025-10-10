import { Router } from "express";
import { ropaController } from "../controllers/mysql/ropa.js";
import { 
  uploadProductWithVariants, 
  uploadSingle, 
  uploadMultiple, 
  extractCloudinaryUrls,
} from "../middleware/upload.js";

const routeForRopa = Router();

routeForRopa.get("/", ropaController.getAll);
routeForRopa.get("/filter", ropaController.getForFilter);
routeForRopa.get("/types-brands", ropaController.getTypesBrands);
routeForRopa.get("/:id", ropaController.getById);

routeForRopa.post('/', 
  uploadProductWithVariants, 
  extractCloudinaryUrls, 
  ropaController.create
);


routeForRopa.patch("/:id", 
  uploadSingle, 
  extractCloudinaryUrls, 
  ropaController.update
);

routeForRopa.put("/:id", 
  uploadSingle, 
  extractCloudinaryUrls, 
  ropaController.replace
);

routeForRopa.delete("/:id", ropaController.delete);

routeForRopa.post("/:id/variants", ropaController.addVariant);
routeForRopa.post("/:id/variants/:color/images", 
  uploadMultiple, 
  extractCloudinaryUrls, 
  ropaController.addVariantImages
);
routeForRopa.post("/:id/variants/increment", ropaController.incrementStock);
routeForRopa.post("/:id/variants/decrement", ropaController.decrementStock);
routeForRopa.put("/:id/variants/:color", ropaController.updateVariant);
routeForRopa.delete("/:id/variants/:color", ropaController.deleteVariant);

export default routeForRopa;