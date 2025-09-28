import dotenv from "dotenv";
dotenv.config();

import { createApp } from "../index.js";
import { connectDB } from "../config/db.js";

// Usa los discriminators del esquema base

// Mantén tu modelo de usuario como lo tengas definido
import { User } from "../models/mongodb/user.js";

const main = async () => {
  try {
    await connectDB();

    // Opcional para ver queries
    // mongoose.set("debug", true);

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