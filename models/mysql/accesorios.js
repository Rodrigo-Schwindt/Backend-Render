import { Product } from "../../schemes/mysql/product.js";
import { Variant } from "../../schemes/mysql/variant.js";
import { Size } from "../../schemes/mysql/size.js";
import { Op, fn, col, where as sequelizeWhere } from "sequelize";

function slugify(str = "") {
  return String(str).trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toArray(val) {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}

// Función para normalizar valores a arrays
function normalizeToArray(val) {
  if (val == null || val === undefined) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function buildQueryFromFilter(filter = {}) {
  const where = {};
  const andConditions = [];

  // 🔍 Filtro por título (LIKE)
  if (filter.title) {
    where.title = { [Op.like]: `%${filter.title}%` };
  }

  // 🔍 Filtro por marca
  if (filter.brand) {
    const brandSlugs = toArray(filter.brand).map(slugify);
    andConditions.push({ brandSlug: { [Op.in]: brandSlugs } });
  }

  // 🔍 Filtro por types (JSON_CONTAINS en typeSlugs)
  const rawTypes = [...toArray(filter.types), ...toArray(filter.tipo)];
  if (rawTypes.length) {
    rawTypes.forEach(type => {
      andConditions.push(
        sequelizeWhere(
          fn("JSON_CONTAINS", col("Product.typeSlugs"), JSON.stringify(slugify(type))),
          1
        )
      );
    });
  }

  // 🔍 Filtro por género (JSON_CONTAINS en genero)
  if (filter.genero) {
    const generos = toArray(filter.genero).map(slugify);
    generos.forEach(g => {
      andConditions.push(
        sequelizeWhere(
          fn("JSON_CONTAINS", col("Product.genero"), JSON.stringify(g)),
          1
        )
      );
    });
  }

  // 🔍 Agregar condiciones acumuladas al WHERE
  if (andConditions.length) {
    where[Op.and] = andConditions;
  }

  return where;
}

/**
 * Lógica de negocio para accesorios (MySQL/Sequelize)
 */
export class Accesorios {
  // Traer todos los accesorios
  static async GetAccesorios() {
    return Product.findAll({
      where: { category: "accesorios" },
      include: [{
        model: Variant,
        as: "variants",
        include: [{ model: Size, as: "sizes" }]
      }],
      order: [["createdAt", "DESC"]]
    });
  }

  // Traer por filtro
  static async GetAccesoriosForFilter(filter) {
    const where = buildQueryFromFilter(filter);
    const variantsWhere = {};
    if (filter.color) variantsWhere.colorSlug = { [Op.in]: toArray(filter.color).map(slugify) };
    const sizesWhere = {};
    if (filter.size) {
      sizesWhere.size = {
        [Op.in]: toArray(filter.size).map(String) // normaliza todo a string
      };
    }
    return Product.findAll({
      where: {
        category: "accesorios", // Fija la categoría
        ...where, // Añade los filtros dinámicos
      },
      include: [{
        model: Variant,
        as: "variants",
        where: Object.keys(variantsWhere).length ? variantsWhere : undefined,
        required: !!Object.keys(variantsWhere).length,
        include: [{
          model: Size,
          as: "sizes",
          where: Object.keys(sizesWhere).length ? sizesWhere : undefined,
           required: false
        }]
      }],
      order: [["createdAt", "DESC"]]
    });
  }

  // Traer uno por ID
  static async GetAccesoriosForID(id) {
    return Product.findByPk(id, {
      include: [{
        model: Variant,
        as: "variants",
        include: [{ model: Size, as: "sizes" }]
      }]
    });
  }

  // Tipos y marcas
  static async getAllTypesAndBrands() {
  const productos = await Product.findAll({
    where: { category: "accesorios" },
    include: [{
      model: Variant,
      as: "variants",
      include: [{ model: Size, as: "sizes" }]
    }],
    order: [["createdAt", "DESC"]]
  });

  // 💥 Aquí es donde procesas los datos para asegurarte de que las imágenes son arrays
  return productos.map(p => {
    const productData = p.toJSON();
    if (Array.isArray(productData.variants)) {
      productData.variants = productData.variants.map(v => {
        // Convierte la cadena JSON en un array de JavaScript
        if (typeof v.images === 'string') {
          try {
            v.images = JSON.parse(v.images);
          } catch (e) {
            console.error("Error al parsear imágenes:", e);
            v.images = [];
          }
        }
        return v;
      });
    }
    return productData;
  });
  }

  // Crear accesorio (con variantes y talles)
static async CreateAccesorios(data) {
  // Normalizamos los campos que deben ser arrays
  const types = normalizeToArray(data.types);
  const typeSlugs = types.map(type => slugify(type));
  const genero = normalizeToArray(data.genero);

  const { variants, ...base } = data;

  // Crear el producto con los arrays normalizados
  const product = await Product.create({
    ...base,
    category: "accesorios",
    types,
    typeSlugs,
    genero,
    // Si hay brand, también generar brandSlug
    ...(data.brand && { brandSlug: slugify(data.brand) })
  });

  if (Array.isArray(variants)) {
    for (const variant of variants) {
      const { sizes, ...restVariant } = variant;

      // 🔹 CAMBIO CLAVE: Normalizamos imágenes, asumiendo que ya son un array de URLs de Cloudinary
      let images = Array.isArray(restVariant.images) ? restVariant.images : [];

      const nuevaVariante = await Variant.create({
        ...restVariant,
        images, // Ya es un array de URLs de string
        colorSlug: slugify(variant.color),
        productId: product.id
      });

      if (Array.isArray(sizes)) {
        for (const sz of sizes) {
          await Size.create({ ...sz, variantId: nuevaVariante.id });
        }
      }
    }
  }

  return this.GetAccesoriosForID(product.id);
}

  static async UpdateAccesorios(data, id) {
    const accesorio = await Product.findByPk(id);
    if (!accesorio) return null;

    // Normalizar arrays si están presentes
    const normalizedData = { ...data };
    if (data.types) {
      normalizedData.types = normalizeToArray(data.types);
      normalizedData.typeSlugs = normalizedData.types.map(type => slugify(type));
    }
    if (data.genero) {
      normalizedData.genero = normalizeToArray(data.genero);
    }
    if (data.brand) {
      normalizedData.brandSlug = slugify(data.brand);
    }

    await accesorio.update(normalizedData);
    return this.GetAccesoriosForID(id);
  }

  static async ReplaceAccesorios(data, id) {
    const accesorio = await Product.findByPk(id);
    if (!accesorio) return null;

    // Normalizar arrays para replace también
    const normalizedData = { ...data };
    if (data.types) {
      normalizedData.types = normalizeToArray(data.types);
      normalizedData.typeSlugs = normalizedData.types.map(type => slugify(type));
    }
    if (data.genero) {
      normalizedData.genero = normalizeToArray(data.genero);
    }
    if (data.brand) {
      normalizedData.brandSlug = slugify(data.brand);
    }

    await accesorio.update(normalizedData);
    return this.GetAccesoriosForID(id);
  }

  static async DeleteAccesorios(id) {
    const accesorio = await Product.findByPk(id);
    if (!accesorio) return null;
    await Variant.destroy({ where: { productId: id } });
    await accesorio.destroy();
    return true;
  }

  // Agregar variante a un producto
  static async AddVariantToProduct(productId, { color, colorCode, images = [], sizes = [] }) {
    const product = await Product.findByPk(productId, {
      include: [{ model: Variant, as: "variants" }]
    });
    if (!product) return null;
    const cSlug = slugify(color);

    if (product.variants && product.variants.some(v => v.colorSlug === cSlug)) {
      throw new Error("La variante (color) ya existe");
    }
    const nuevaVariante = await Variant.create({
      color: String(color),
      colorSlug: cSlug,
      colorCode: colorCode ? String(colorCode) : null,
      images: toArray(images).map(String),
      productId: product.id
    });
    if (Array.isArray(sizes)) {
      for (const sz of sizes) {
        await Size.create({ ...sz, variantId: nuevaVariante.id });
      }
    }
    return this.GetAccesoriosForID(productId);
  }

  // Agregar imágenes a una variante
  static async AddImagesToVariant(productId, color, imagesArr) {
    const cSlug = slugify(decodeURIComponent(color));
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) return null;
    const finalImgs = [...(variant.images || []), ...imagesArr];
    await variant.update({ images: finalImgs });
    return this.GetAccesoriosForID(productId);
  }

  // Eliminar imagen de una variante
  static async RemoveImageFromVariant(productId, color, image) {
    const cSlug = slugify(decodeURIComponent(color));
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) return null;
    const imgs = (variant.images || []).filter(img => img !== image);
    await variant.update({ images: imgs });
    return this.GetAccesoriosForID(productId);
  }

  // Actualizar variante
  static async UpdateVariant(productId, color, data) {
    const cSlug = slugify(color);
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) return null;
    if (data.color && slugify(data.color) !== variant.colorSlug) {
      // Verificar que no exista
      const exists = await Variant.findOne({ where: { productId, colorSlug: slugify(data.color) } });
      if (exists) throw new Error("Ya existe otra variante con ese color");
    }
    await variant.update({
      ...data,
      colorSlug: data.color ? slugify(data.color) : variant.colorSlug
    });
    // Actualizar talles si vienen
    if (data.sizes) {
      await Size.destroy({ where: { variantId: variant.id } });
      for (const sz of data.sizes) {
        await Size.create({ ...sz, variantId: variant.id });
      }
    }
    return this.GetAccesoriosForID(productId);
  }

  // Eliminar variante
  static async DeleteVariant(productId, color) {
    const cSlug = slugify(color);
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) return null;
    await Size.destroy({ where: { variantId: variant.id } });
    await variant.destroy();
    return this.GetAccesoriosForID(productId);
  }

  // Decrementar stock
  static async DecrementStock(productId, color, size, qty) {
    const cSlug = slugify(color);
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) throw Object.assign(new Error("Variante no encontrada"), { code: "NO_VARIANT" });
    const talle = await Size.findOne({ where: { variantId: variant.id, size: String(size) } });
    if (!talle) throw Object.assign(new Error("Talle no encontrado"), { code: "NO_SIZE" });
    if (talle.stock < qty) throw Object.assign(new Error("Stock insuficiente"), { code: "NO_STOCK" });
    await talle.update({ stock: talle.stock - qty });
    return this.GetAccesoriosForID(productId);
  }

  // Incrementar stock
  static async IncrementStock(productId, color, size, qty) {
    const cSlug = slugify(color);
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) throw Object.assign(new Error("Variante no encontrada"), { code: "NO_VARIANT" });
    const talle = await Size.findOne({ where: { variantId: variant.id, size: String(size) } });
    if (!talle) throw Object.assign(new Error("Talle no encontrado"), { code: "NO_SIZE" });
    await talle.update({ stock: talle.stock + qty });
    return this.GetAccesoriosForID(productId);
  }
}