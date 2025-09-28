import { Andreani } from "../models/mongodb/andreani.js";

export class AndreaniController {
  constructor(model) {
    this.model = model;
  }

  async cotizar(req, res) {
    try {
      const { cpDestino, peso, valorDeclarado } = req.body;
      if (!cpDestino || !peso || !valorDeclarado)
        return res.status(400).json({ message: "Faltan datos para cotizar" });

      const data = await this.model.cotizar({ cpDestino, peso, valorDeclarado });
      return res.status(200).json(data);
    } catch (e) {
      console.error("Error en cotizar:", e);
      return res.status(500).json({ message: e.message || "Error en cotización" });
    }
  }

  async generarEnvio(req, res) {
    try {
      const { destinatario, bultos, referencias } = req.body;
      if (!destinatario || !bultos || !Array.isArray(bultos) || bultos.length === 0)
        return res.status(400).json({ message: "Faltan datos de destinatario o bultos" });

      const data = await this.model.generarEnvio({ destinatario, bultos, referencias });
      return res.status(201).json(data);
    } catch (e) {
      console.error("Error en generar envío:", e);
      return res.status(500).json({ message: e.message || "Error generando envío" });
    }
  }

  async tracking(req, res) {
    try {
      const { nroEnvio } = req.params;
      if (!nroEnvio) return res.status(400).json({ message: "Falta nroEnvio" });
      const data = await this.model.tracking(nroEnvio);
      return res.status(200).json(data);
    } catch (e) {
      console.error("Error en tracking:", e);
      return res.status(500).json({ message: e.message || "Error obteniendo tracking" });
    }
  }

  async sucursales(req, res) {
    try {
      const { cp, provincia } = req.query;
      const data = await this.model.sucursales({ cp, provincia });
      return res.status(200).json(data);
    } catch (e) {
      console.error("Error en sucursales:", e);
      return res.status(500).json({ message: e.message || "Error obteniendo sucursales" });
    }
  }
}