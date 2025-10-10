import path from "path";
import fs from "fs/promises";
import { Ropa } from "../../models/mysql/ropa.js";

function toArray(val) {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * Normaliza los filtros de query parameters para que coincidan con lo que espera el modelo
 */
function normalizeIncomingBody(raw = {}) {
  const body = { ...raw };

  // Normalizar tipo → types
  if (body.tipo && !body.types) {
    body.types = toArray(body.tipo);
    delete body.tipo;
  }

  // Normalizar imágenes principales del producto
  if (body.images) {
    if (typeof body.images === "string") {
      try {
        body.images = JSON.parse(body.images);
      } catch {
        body.images = [body.images];
      }
    }

    if (!Array.isArray(body.images)) {
      body.images = [body.images];
    }

    if (!body.coverImage && body.images.length > 0) {
      body.coverImage = body.images[0];
    }
  }

  // Normalizar variantes
  if (typeof body.variants === "string") {
    try {
      body.variants = JSON.parse(body.variants);
    } catch {}
  }

  if (!body.variants || !Array.isArray(body.variants) || body.variants.length === 0) {
    const colors = toArray(body.color);
    const sizes = toArray(body.size);
    if (colors.length && sizes.length) {
      body.variants = colors.map((col) => ({
        color: String(col),
        images: [],
        sizes: sizes.map((sz) => ({
          size: String(sz),
          stock: 0,
        })),
      }));
    }
  }

  if (Array.isArray(body.variants)) {
    body.variants = body.variants.map((v) => {
      let images = Array.isArray(v.images) ? v.images : []; 
      
      return {
        ...v,
        images, 
        sizes: Array.isArray(v.sizes)
          ? v.sizes.map((s) => ({
              size: String(s.size),
              stock: Number(s.stock ?? 0),
              ...(s.sku ? { sku: String(s.sku) } : {}),
            }))
          : [],
      };
    });
  }

  return body;
}

function normalizeProductVariants(product) {
  if (product && Array.isArray(product.variants)) {
    product.variants = product.variants.map(variant => {

      if (typeof variant.images === 'string') {
        try {
          variant.images = JSON.parse(variant.images);
        } catch (e) {
          variant.images = [variant.images];
        }
      }
      if (!Array.isArray(variant.images)) {
        variant.images = [variant.images];
      }
      return variant;
    });
  }
  return product;
}

export const ropaController = {
  async getAll(req, res) {
    try {
      const items = await Ropa.GetRopa();
      const normalizedItems = items.map(normalizeProductVariants);
      res.status(200).json(normalizedItems);
    } catch (e) {
      console.error("Error en getAll:", e);
      res.status(500).json({ message: "Error al obtener ropa", error: e.message });
    }
  },

  async getForFilter(req, res) {
    try {
      console.log("🔍 Query params recibidos:", req.query); // Debug
      
      const normalizedQuery = normalizeQueryFilters(req.query);
      console.log("🔍 Query params normalizados:", normalizedQuery); // Debug
      
      const items = await Ropa.GetRopaForFilter(normalizedQuery);
      const normalizedItems = items.map(normalizeProductVariants);
      
      console.log(`✅ Productos filtrados encontrados: ${normalizedItems.length}`); // Debug
      
      res.status(200).json(normalizedItems);
    } catch (e) {
      console.error("Error en getForFilter:", e);
      res.status(500).json({ message: "Error al filtrar ropa", error: e.message });
    }
  },
  async getById(req, res) {
    try {
      const item = await Ropa.GetRopaForID(req.params.id);
      if (!item) return res.status(404).json({ message: "Producto no encontrado" });
      const normalizedItem = normalizeProductVariants(item);
      res.status(200).json(normalizedItem);
    } catch (e) {
      res.status(500).json({ message: "Error al obtener producto", error: e.message });
    }
  },

async create(req, res) {
  try {
    const body = normalizeIncomingBody(req.body);
    if (req.fileUrl) body.coverImage = req.fileUrl;

    if (req.variantImageUrls && body.variants) {
      body.variants = body.variants.map((variant, index) => ({
        ...variant,
        images: req.variantImageUrls[index] || []
      }));
    }

    const created = await Ropa.CreateRopa(body);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ message: "Error al crear producto", error: e.message });
  }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const body = normalizeIncomingBody(req.body);
      if (req.fileUrl) body.coverImage = req.fileUrl;
      const updated = await Ropa.UpdateRopa(body, id);
      if (!updated) return res.status(404).json({ message: "Producto no encontrado" });
      res.status(200).json(updated);
    } catch (e) {
      res.status(500).json({ message: "Error al actualizar ropa", error: e.message });
    }
  },

  async replace(req, res) {
    try {
      const { id } = req.params;
      const body = normalizeIncomingBody(req.body);
      if (req.fileUrl) body.coverImage = req.fileUrl;
      const replaced = await Ropa.ReplaceRopa(body, id);
      if (!replaced) return res.status(404).json({ message: "Producto no encontrado" });
      res.status(200).json(replaced);
    } catch (e) {
      res.status(500).json({ message: "Error al reemplazar ropa", error: e.message });
    }
  },

async delete(req, res) {
  const { id } = req.params;
  try {
    const imageUrls = await Ropa.getAllImageUrls(id);
    if (!imageUrls) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const deleted = await Ropa.DeleteRopa(id);
    if (!deleted) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    for (const url of imageUrls) {
      const fileName = path.basename(url);
      const filePath = path.join(process.cwd(), "uploads", fileName);
      try {
        await fs.unlink(filePath);
        console.log(`✅ Imagen eliminada: ${filePath}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`❌ Error al eliminar imagen ${filePath}:`, err);
        }
      }
    }

    res.json({ message: "Producto eliminado", id });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar producto", error: err.message });
  }
},

  async getTypesBrands(req, res) {
    try {
      const result = await Ropa.getAllTypesAndBrands();
      res.json(result);
    } catch (e) {
      res.status(500).json({ message: "Error al obtener tipos y marcas", error: e.message });
    }
  },


  async updateCover(req, res) {
    try {
      const { id } = req.params;
      if (!req.fileUrl) return res.status(400).json({ message: "No se subió ninguna imagen" });

      const updated = await Ropa.UpdateRopa({ coverImage: req.fileUrl }, id);
      if (!updated) return res.status(404).json({ message: "Producto no encontrado" });

      res.json({ message: "Imagen de portada actualizada", product: updated });
    } catch (e) {
      res.status(500).json({ message: "Error actualizando portada", error: e.message });
    }
  },

  async addVariant(req, res) {
    try {
      const { id } = req.params;
      const { color, colorCode, images = [], sizes = [] } = req.body;
      if (!color) return res.status(400).json({ message: "color es requerido" });
      try {
        const product = await Ropa.AddVariantToProduct(id, { color, colorCode, images, sizes });
        res.json({ message: "Variante agregada", product });
      } catch (e) {
        if (e.message === "La variante (color) ya existe") {
          return res.status(409).json({ message: e.message });
        }
        throw e;
      }
    } catch (e) {
      res.status(500).json({ message: "Error agregando variante", error: e.message });
    }
  },

  async addVariantImages(req, res) {
    try {
      const { id, color } = req.params;
      const urlsFromFiles = Array.isArray(req.fileUrls) ? req.fileUrls : [];
      const bodyImages = Array.isArray(req.body?.images) ? req.body.images.map(String) : [];
      const toAdd = [...urlsFromFiles, ...bodyImages].filter(Boolean);
      if (!toAdd.length) return res.status(400).json({ message: "No se enviaron imágenes" });
      const updated = await Ropa.AddImagesToVariant(id, color, toAdd);
      if (!updated) return res.status(404).json({ message: "Producto/variante no encontrado" });
      res.json({
        message: "Imágenes agregadas a la variante",
        added: toAdd,
        product: updated,
      });
    } catch (e) {
      res.status(500).json({ message: "Error agregando imágenes", error: e.message });
    }
  },

  async decrementStock(req, res) {
    try {
      const { id } = req.params;
      const { color, size, quantity } = req.body;
      const qty = Number(quantity);
      if (!color || !size || !Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ message: "Datos inválidos" });
      }
      try {
        const product = await Ropa.DecrementStock(id, color, size, qty);
        res.json({ message: "Stock decrementado", product });
      } catch (e) {
        if (e.code === "NO_STOCK") return res.status(409).json({ message: "Stock insuficiente o variante/talle inexistente" });
        throw e;
      }
    } catch (e) {
      res.status(500).json({ message: "Error decrementando stock", error: e.message });
    }
  },

  async incrementStock(req, res) {
    try {
      const { id } = req.params;
      const { color, size, quantity } = req.body;
      const qty = Number(quantity);
      if (!color || !size || !Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ message: "Datos inválidos" });
      }
      try {
        const product = await Ropa.IncrementStock(id, color, size, qty);
        res.json({ message: "Stock incrementado", product });
      } catch (e) {
        if (e.code === "NO_SIZE" || e.code === "NO_VARIANT") return res.status(404).json({ message: "Variante o talle no encontrado" });
        throw e;
      }
    } catch (e) {
      res.status(500).json({ message: "Error incrementando stock", error: e.message });
    }
  },

  async updateVariant(req, res) {
    try {
      const { id, color } = req.params;
      let { color: newColor, colorCode, images, sizes } = req.body;
      if (typeof sizes === "string") {
        try {
          sizes = JSON.parse(sizes);
        } catch {}
      }
      try {
        const product = await Ropa.UpdateVariant(id, color, { color: newColor, colorCode, images, sizes });
        if (!product) return res.status(404).json({ message: "Variante (color) no encontrada" });
        res.json({ message: "Variante actualizada", product });
      } catch (e) {
        if (e.message === "Ya existe otra variante con ese color") {
          return res.status(409).json({ message: e.message });
        }
        throw e;
      }
    } catch (e) {
      res.status(500).json({ message: "Error actualizando variante", error: e.message });
    }
  },

  async deleteVariant(req, res) {
    try {
      const { id, color } = req.params;
      const product = await Ropa.DeleteVariant(id, color);
      if (!product) return res.status(404).json({ message: "Variante (color) no encontrada" });
      res.json({ message: "Variante eliminada", product });
    } catch (e) {
      res.status(500).json({ message: "Error eliminando variante", error: e.message });
    }
  }
};