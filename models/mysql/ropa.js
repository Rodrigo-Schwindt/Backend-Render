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

export class Ropa {
  static async GetRopa() {
    return Product.findAll({
      where: { category: "ropa" },
      include: [{
        model: Variant,
        as: "variants",
        include: [{ model: Size, as: "sizes" }]
      }],
      order: [["createdAt", "DESC"]]
    });
  }

  static async GetRopaForFilter(filter) {
    const where = buildQueryFromFilter(filter);    
    // Filtros para variantes
    const variantsWhere = {};
    if (filter.color) {
      variantsWhere.colorSlug = { [Op.in]: toArray(filter.color).map(slugify) };
    }
    // Filtros para tallas
    const sizesWhere = {};
    if (filter.size) {
      sizesWhere.size = {
        [Op.in]: toArray(filter.size).map(String) // normaliza todo a string
      };
    }
    return Product.findAll({
      where: {
        category: "ropa", // Fija la categoría
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


  static async GetRopaForID(id) {
    return Product.findByPk(id, {
      include: [{
        model: Variant,
        as: "variants",
        include: [{ model: Size, as: "sizes" }]
      }]
    });
  }

  static async getAllTypesAndBrands() {
  const productos = await Product.findAll({
    where: { category: "ropa" },
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

static async CreateRopa(data) {
  // Normalizamos los campos que deben ser arrays
  const types = normalizeToArray(data.types);
  const typeSlugs = types.map(type => slugify(type));
  const genero = normalizeToArray(data.genero);

  const { variants, ...base } = data;

  // Crear el producto con los arrays normalizados
  const product = await Product.create({
    ...base,
    category: "ropa",
    types,
    typeSlugs,
    genero,
    // Si hay brand, también generar brandSlug
    ...(data.brand && { brandSlug: slugify(data.brand) })
  });

  if (Array.isArray(variants)) {
    for (const variant of variants) {
      const { sizes, ...restVariant } = variant;

      // 🔹 Normalizar imágenes ANTES de guardar
      let images = [];
      if (typeof restVariant.images === "string") {
        try {
          images = JSON.parse(restVariant.images);
        } catch {
          images = [restVariant.images];
        }
      } else if (Array.isArray(restVariant.images)) {
        images = restVariant.images;
      }

      const nuevaVariante = await Variant.create({
        ...restVariant,
        images,
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

  return this.GetRopaForID(product.id);
}

  static async UpdateRopa(data, id) {
    const ropa = await Product.findByPk(id);
    if (!ropa) return null;

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

    await ropa.update(normalizedData);
    return this.GetRopaForID(id);
  }

  static async ReplaceRopa(data, id) {
    const ropa = await Product.findByPk(id);
    if (!ropa) return null;

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

    await ropa.update(normalizedData);
    return this.GetRopaForID(id);
  }

  static async getAllImageUrls(id) {
    const product = await Product.findByPk(id, {
        include: [{ model: Variant, as: "variants" }]
    });

    if (!product) {
        return null;
    }

    const imageUrls = [];

    // Agregar la imagen de portada si existe
    if (product.coverImage) {
        imageUrls.push(product.coverImage);
    }

    // Agregar imágenes de todas las variantes
    if (Array.isArray(product.variants)) {
        product.variants.forEach(variant => {
            let variantImages = variant.images;

            // 💡 CONVERTIMOS LA CADENA JSON EN UN ARRAY
            if (typeof variantImages === 'string') {
                try {
                    variantImages = JSON.parse(variantImages);
                } catch (e) {
                    console.error("Error al parsear imágenes de variante:", e);
                    variantImages = [];
                }
            }

            // Asegurarse de que el resultado final sea un array antes de iterar
            if (Array.isArray(variantImages)) {
                variantImages.forEach(image => {
                    imageUrls.push(image);
                });
            }
        });
    }

    return imageUrls;
}
  
  static async DeleteRopa(id) {
    const ropa = await Product.findByPk(id);
    if (!ropa) return null;
    await Variant.destroy({ where: { productId: id } });
    await ropa.destroy();
    return true;
  }

  // VARIANTES
  static async AddVariantToProduct(productId, { color, colorCode, images = [], sizes = [] }) {
    const product = await Product.findByPk(productId, { include: [{ model: Variant, as: "variants" }] });
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
    return this.GetRopaForID(productId);
  }

  static async AddImagesToVariant(productId, color, imagesArr) {
    const cSlug = slugify(decodeURIComponent(color));
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) return null;
    const finalImgs = [...(variant.images || []), ...imagesArr];
    await variant.update({ images: finalImgs });
    return this.GetRopaForID(productId);
  }

  static async RemoveImageFromVariant(productId, color, image) {
    const cSlug = slugify(decodeURIComponent(color));
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) return null;
    const imgs = (variant.images || []).filter(img => img !== image);
    await variant.update({ images: imgs });
    return this.GetRopaForID(productId);
  }

  static async UpdateVariant(productId, color, data) {
    const cSlug = slugify(color);
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) return null;
    if (data.color && slugify(data.color) !== variant.colorSlug) {
      const exists = await Variant.findOne({ where: { productId, colorSlug: slugify(data.color) } });
      if (exists) throw new Error("Ya existe otra variante con ese color");
    }
    await variant.update({
      ...data,
      colorSlug: data.color ? slugify(data.color) : variant.colorSlug
    });
    if (data.sizes) {
      await Size.destroy({ where: { variantId: variant.id } });
      for (const sz of data.sizes) {
        await Size.create({ ...sz, variantId: variant.id });
      }
    }
    return this.GetRopaForID(productId);
  }

  static async DeleteVariant(productId, color) {
    const cSlug = slugify(color);
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) return null;
    await Size.destroy({ where: { variantId: variant.id } });
    await variant.destroy();
    return this.GetRopaForID(productId);
  }

  static async DecrementStock(productId, color, size, qty) {
    const cSlug = slugify(color);
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) throw Object.assign(new Error("Variante no encontrada"), { code: "NO_VARIANT" });
    const talle = await Size.findOne({ where: { variantId: variant.id, size: String(size) } });
    if (!talle) throw Object.assign(new Error("Talle no encontrado"), { code: "NO_SIZE" });
    if (talle.stock < qty) throw Object.assign(new Error("Stock insuficiente"), { code: "NO_STOCK" });
    await talle.update({ stock: talle.stock - qty });
    return this.GetRopaForID(productId);
  }

  static async IncrementStock(productId, color, size, qty) {
    const cSlug = slugify(color);
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) throw Object.assign(new Error("Variante no encontrada"), { code: "NO_VARIANT" });
    const talle = await Size.findOne({ where: { variantId: variant.id, size: String(size) } });
    if (!talle) throw Object.assign(new Error("Talle no encontrado"), { code: "NO_SIZE" });
    await talle.update({ stock: talle.stock + qty });
    return this.GetRopaForID(productId);
  }
}