import dotenv from "dotenv";
dotenv.config();

import { createApp } from "../index.js";
import { sequelize } from "../config/mysql.js"; // Tu instancia de Sequelize

// Importa y ejecuta el archivo de asociaciones
import "../schemes/mysql/associations.js";

const main = async () => {
  try {
    // Conecta y sincroniza Sequelize (puedes usar {alter:true} solo en desarrollo)
    await sequelize.authenticate();
    await sequelize.sync(); // ¡Ahora las relaciones están cargadas!

    const app = createApp();

    const PORT = process.env.PORT || 3010;
    const server = app.listen(PORT, () => {
      console.log(`Servidor en http://localhost:${server.address().port}`);
    });
  } catch (err) {
    console.error("No se pudo iniciar el servidor:", err);
    process.exit(1);
  }
};

main();