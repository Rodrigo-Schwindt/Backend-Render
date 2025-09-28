import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import  routeForAccesorios  from "./routes/accesorios.js";
import  routeForCalzados  from "./routes/calzados.js";
import  routeForRopa  from "./routes/ropa.js";
import { routeForUser } from "./routes/user.js";
import productosRoutes from "./routes/filter.products.js";
//import { routeForAndreani, andreaniRoute } from "./routes/andreani.js";

dotenv.config();

export const app = express();
//andreaniRoute();
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

export function createApp() {
  app.get("/", (_req, res) => res.send("hola mundo"));

  // Inicializa controladores/handlers sobre los routers


  // Enruta los routers
  app.use("/calzados", routeForCalzados);
  app.use("/ropa", routeForRopa);
  app.use("/accesorios", routeForAccesorios);
  app.use("/user", routeForUser);
  app.use("/filter", productosRoutes);
  //app.use("/andreani", routeForAndreani);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ message: "404 Not Found" });
  });

  return app; // IMPORTANTE: devolver app
}

// Nota: no hagas app.listen aquí. El server se levanta en el startpoint.