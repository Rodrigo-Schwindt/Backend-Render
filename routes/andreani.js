// import { Router } from "express";
// import { AndreaniController } from "../controllers/andreani.js";
// import { Andreani } from "../models/mongodb/andreani.js";

export const routeForAndreani = Router();

export function andreaniRoute(model = Andreani) {
  const andreaniController = new AndreaniController(model);

  // Cotización
  routeForAndreani.post("/cotizar", (req, res) => andreaniController.cotizar(req, res));

  // Generar envío
  routeForAndreani.post("/enviar", (req, res) => andreaniController.generarEnvio(req, res));

  // Trcking
  routeForAndreani.get("/tracking/:nroEnvio", (req, res) => andreaniController.tracking(req, res));

  // Sucursales
  routeForAndreani.get("/sucursales", (req, res) => andreaniController.sucursales(req, res));
}