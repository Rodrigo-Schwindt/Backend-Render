import { sequelize } from "../../config/mysql.js";
import { Product } from "./product.js";
import { Variant } from "./variant.js";
import { Size } from "./size.js";

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Conexión a MySQL exitosa");
    await sequelize.sync({ alter: true });
    console.log("Tablas Product, Variant y Size sincronizadas");
  } catch (err) {
    console.error("Error de conexión o sync:", err);
  } finally {
    await sequelize.close();
  }
})();