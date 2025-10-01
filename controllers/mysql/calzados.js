import { Calzados } from "../../models/mysql/calzados.js";

function toArray(val) {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}
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
      // 🔹 Normalizar imágenes de cada variante
      // Asumimos que si viene es un array, o lo hacemos uno vacío si no.
      let images = Array.isArray(v.images) ? v.images : []; 
      
      return {
        ...v,
        images, // Ya es un array
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

/**
 * Normaliza las imágenes de las variantes de un producto para asegurar
 * que siempre sean un array, incluso si la base de datos las devuelve como una cadena de texto JSON.
 * @param {object} product El objeto del producto.
 * @returns {object} El objeto del producto con las imágenes normalizadas.
 */
function normalizeProductVariants(product) {
  if (product && Array.isArray(product.variants)) {
    product.variants = product.variants.map(variant => {
      // Intenta parsear la cadena de imágenes si es necesario
      if (typeof variant.images === 'string') {
        try {
          variant.images = JSON.parse(variant.images);
        } catch (e) {
          variant.images = [variant.images];
        }
      }
      // Asegúrate de que siempre sea un array
      if (!Array.isArray(variant.images)) {
        variant.images = [variant.images];
      }
      return variant;
    });
  }
  return product;
}

export const calzadosController = {
  async getAll(req, res) {
    try {
      const items = await Calzados.GetCalzados();
      // Mapea sobre cada item para normalizar las variantes antes de enviarlos
      const normalizedItems = items.map(normalizeProductVariants);
      res.status(200).json(normalizedItems);
    } catch (e) {
      res.status(500).json({ message: "Error al obtener calzados", error: e.message });
    }
  },

  async getForFilter(req, res) {
    try {
      const items = await Calzados.GetCalzadosForFilter(req.query);
      const normalizedItems = items.map(normalizeProductVariants);
      res.status(200).json(normalizedItems);
    } catch (e) {
      res.status(500).json({ message: "Error al filtrar calzados", error: e.message });
    }
  },
    async getTypesBrands(req, res) {
      try {
        const result = await Calzados.getAllTypesAndBrands();
        res.json(result);
      } catch (e) {
        res.status(500).json({ message: "Error al obtener tipos y marcas", error: e.message });
      }
    },

  async getById(req, res) {
    try {
      const item = await Calzados.GetCalzadosForID(req.params.id);
      if (!item) return res.status(404).json({ message: "Producto no encontrado" });
      // Normaliza un solo item
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

    // Integrar las URLs de imágenes de variantes procesadas
    if (req.variantImageUrls && body.variants) {
      body.variants = body.variants.map((variant, index) => ({
        ...variant,
        images: req.variantImageUrls[index] || []
      }));
    }

    const created = await Calzados.CreateCalzados(body);
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
      const updated = await Calzados.UpdateCalzados(body, id);
      if (!updated) return res.status(404).json({ message: "Producto no encontrado" });
      res.status(200).json(updated);
    } catch (e) {
      res.status(500).json({ message: "Error al actualizar calzado", error: e.message });
    }
  },

  async replace(req, res) {
    try {
      const { id } = req.params;
      const body = normalizeIncomingBody(req.body);
      if (req.fileUrl) body.coverImage = req.fileUrl;
      const replaced = await Calzados.ReplaceCalzados(body, id);
      if (!replaced) return res.status(404).json({ message: "Producto no encontrado" });
      res.status(200).json(replaced);
    } catch (e) {
      res.status(500).json({ message: "Error al reemplazar calzado", error: e.message });
    }
  },

  async delete(req, res) {
    const { id } = req.params;
    try {
      // Si necesitas borrar archivos, hazlo aquí.
      const deleted = await Calzados.DeleteCalzados(id);
      if (!deleted) return res.status(404).json({ message: "Producto no encontrado" });
      res.json({ message: "Producto eliminado", id });
    } catch (err) {
      res.status(500).json({ message: "Error al eliminar producto", error: err.message });
    }
  },

  async addVariant(req, res) {
    try {
      const { id } = req.params;
      const { color, colorCode, images = [], sizes = [] } = req.body;
      if (!color) return res.status(400).json({ message: "color es requerido" });
      try {
        const product = await Calzados.AddVariantToProduct(id, { color, colorCode, images, sizes });
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
      const updated = await Calzados.AddImagesToVariant(id, color, toAdd);
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
        const product = await Calzados.DecrementStock(id, color, size, qty);
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
        const product = await Calzados.IncrementStock(id, color, size, qty);
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
      if (typeof sizes === "string") { try { sizes = JSON.parse(sizes); } catch {} }
      try {
        const product = await Calzados.UpdateVariant(id, color, { color: newColor, colorCode, images, sizes });
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
      const product = await Calzados.DeleteVariant(id, color);
      if (!product) return res.status(404).json({ message: "Variante (color) no encontrada" });
      res.json({ message: "Variante eliminada", product });
    } catch (e) {
      res.status(500).json({ message: "Error eliminando variante", error: e.message });
    }
  }
};