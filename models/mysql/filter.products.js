// models/productos.model.js
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

  if (Array.isArray(val)) return val;

  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(",").map(v => v.trim());
    }
  }

  return [val];
}

export class Productos {

  static async GetProductosForFilter(filter = {}) {
    const where = {};
    const andConditions = [];

    if (filter.category) {
      where.category = { [Op.in]: toArray(filter.category).map(c => String(c).toLowerCase()) };
    }

    if (filter.brand) {
      const brandSlugs = toArray(filter.brand).map(slugify);
      andConditions.push({ brandSlug: { [Op.in]: brandSlugs } });
    }

    const rawTypes = [...toArray(filter.types), ...toArray(filter.tipo)];
    if (rawTypes.length) {
      rawTypes.forEach(t => {
        const slug = slugify(t);
        andConditions.push(
          sequelizeWhere(
            fn("JSON_CONTAINS", col("Product.typeSlugs"), JSON.stringify(slug)),
            1
          )
        );
      });
    }

    if (filter.genero) {
      toArray(filter.genero).forEach(g => {
        const val = String(g);
        andConditions.push(
          sequelizeWhere(
            fn("JSON_CONTAINS", col("Product.genero"), JSON.stringify(val)),
            1
          )
        );
      });
    }

    if (andConditions.length) where[Op.and] = andConditions;

    const variantsWhere = {};
    if (filter.color) {
      variantsWhere.colorSlug = { [Op.in]: toArray(filter.color).map(slugify) };
    }

    const productos = await Product.findAll({
      where,
      include: [{
        model: Variant,
        as: "variants",
        where: Object.keys(variantsWhere).length ? variantsWhere : undefined,
        required: !!Object.keys(variantsWhere).length,
        include: [{
          model: Size,
          as: "sizes",
          required: false
        }]
      }],
      order: [["createdAt", "DESC"]]
    });

    let resultado = productos;
    if (filter.size) {
      const sizesFiltro = toArray(filter.size).map(s => String(s).toLowerCase());
      resultado = productos.filter(p =>
        (p.variants || []).some(v =>
          (v.sizes || []).some(sz => sizesFiltro.includes(String(sz.size).toLowerCase()))
        )
      );
    }

    return resultado;
  }
}

