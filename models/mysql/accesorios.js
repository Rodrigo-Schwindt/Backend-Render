import { Product } from "../../schemes/mysql/product.js";
import { Variant } from "../../schemes/mysql/variant.js";
import { Size } from "../../schemes/mysql/size.js";
import { Op, fn, col, where as sequelizeWhere } from "sequelize";
import { v2 as cloudinary } from 'cloudinary'; 

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

  if (filter.title) {
    where.title = { [Op.like]: `%${filter.title}%` };
  }

  if (filter.brand) {
    const brandSlugs = toArray(filter.brand).map(slugify);
    andConditions.push({ brandSlug: { [Op.in]: brandSlugs } });
  }

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

  if (andConditions.length) {
    where[Op.and] = andConditions;
  }

  return where;
}

async function deleteCloudinaryImages(urls = []) {
    if (!urls || urls.length === 0) return;

    const publicIds = urls.map(url => {
        if (!url || !url.includes('clavestreetwear/productos')) return null; 
        
        const parts = url.split('/upload/')[1];
        if (!parts) return null;
        
        const index = parts.indexOf('clavestreetwear');
        if (index === -1) return null;

        const publicIdWithExtension = parts.substring(index);
        const publicId = publicIdWithExtension.split('.').slice(0, -1).join('.');

        return publicId;
    }).filter(id => id);

    if (publicIds.length === 0) return;

    try {
        await cloudinary.api.delete_resources(publicIds);
    } catch (error) {
        console.error("❌ Error al eliminar imágenes de Cloudinary:", error);
    }
}
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

  static async GetAccesoriosForFilter(filter) {
    const where = buildQueryFromFilter(filter);
    const variantsWhere = {};
    if (filter.color) variantsWhere.colorSlug = { [Op.in]: toArray(filter.color).map(slugify) };
    const sizesWhere = {};
    if (filter.size) {
      sizesWhere.size = {
        [Op.in]: toArray(filter.size).map(String) 
      };
    }
    return Product.findAll({
      where: {
        category: "accesorios", 
        ...where, 
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

  static async GetAccesoriosForID(id) {
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
    where: { category: "accesorios" },
    include: [{
      model: Variant,
      as: "variants",
      include: [{ model: Size, as: "sizes" }]
    }],
    order: [["createdAt", "DESC"]]
  });


  return productos.map(p => {
    const productData = p.toJSON();
    if (Array.isArray(productData.variants)) {
      productData.variants = productData.variants.map(v => {
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


static async CreateAccesorios(data) {
  const types = normalizeToArray(data.types);
  const typeSlugs = types.map(type => slugify(type));
  const genero = normalizeToArray(data.genero);

  const { variants, ...base } = data;

  const product = await Product.create({
    ...base,
    category: "accesorios",
    types,
    typeSlugs,
    genero,
    ...(data.brand && { brandSlug: slugify(data.brand) })
  });

  if (Array.isArray(variants)) {
    for (const variant of variants) {
      const { sizes, ...restVariant } = variant;

   
      let images = Array.isArray(restVariant.images) ? restVariant.images : [];

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

  return this.GetAccesoriosForID(product.id);
}

  static async UpdateAccesorios(data, id) {
    const accesorio = await Product.findByPk(id);
    if (!accesorio) return null;

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
    const accesorio = await Product.findByPk(id, {
        include: [{ 
            model: Variant, 
            as: "variants" 
        }]
    });
    if (!accesorio) return null;

    const allUrls = [];
    
    if (accesorio.coverImage) {
        allUrls.push(accesorio.coverImage);
    }
    
    if (Array.isArray(accesorio.variants)) {
        accesorio.variants.forEach(variant => {
            const variantImages = Array.isArray(variant.images) ? variant.images : [];
            allUrls.push(...variantImages);
        });
    }

    await deleteCloudinaryImages(allUrls);

    await Variant.destroy({ where: { productId: id } });
    await accesorio.destroy();
    return true;
  }

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

  static async AddImagesToVariant(productId, color, imagesArr) {
    const cSlug = slugify(decodeURIComponent(color));
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) return null;
    const finalImgs = [...(variant.images || []), ...imagesArr];
    await variant.update({ images: finalImgs });
    return this.GetAccesoriosForID(productId);
  }

  static async RemoveImageFromVariant(productId, color, image) {
    const cSlug = slugify(decodeURIComponent(color));
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) return null;
    
    await deleteCloudinaryImages([image]); 
    
    const imgs = (variant.images || []).filter(img => img !== image);
    await variant.update({ images: imgs });
    
    return this.GetAccesoriosForID(productId);
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
    return this.GetAccesoriosForID(productId);
  }

  static async DeleteVariant(productId, color) {
    const cSlug = slugify(color);
    const variant = await Variant.findOne({ where: { productId, colorSlug: cSlug } });
    if (!variant) return null;

    const variantUrls = Array.isArray(variant.images) ? variant.images : [];

    await deleteCloudinaryImages(variantUrls);
    
    await Size.destroy({ where: { variantId: variant.id } });
    await variant.destroy();
    return this.GetAccesoriosForID(productId);
  }

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