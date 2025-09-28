import express from "express";
import { Productos } from "../controllers/mysql/filter.products.js";
import { normalizeQueryFilters } from "../utils/normalizeQueryFilters.js";

const router = express.Router();

// GET /productos/filter
router.get("/", async (req, res) => {
  try {
    console.log("🔍 Query params recibidos:", req.query);

    const normalizedQuery = normalizeQueryFilters(req.query);
    console.log("🔍 Query params normalizados:", normalizedQuery);

    const productos = await Productos.GetProductosForFilter(normalizedQuery);
    res.json(productos);
  } catch (err) {
    console.error("❌ Error en /filter:", err);
    res.status(500).json({ error: "Error al filtrar productos" });
  }
});

export default router;