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

  // Si ya es array → lo devuelvo
  if (Array.isArray(val)) return val;

  // Si viene como string JSON de array → intento parsear
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // si no es JSON, lo parto por coma
      return val.split(",").map(v => v.trim());
    }
  }

  return [val];
}

export class Productos {

  static async GetProductosForFilter(filter = {}) {
    // Construyo where dinámico + condiciones JSON usando JSON_CONTAINS (MySQL)
    const where = {};
    const andConditions = [];

    // category (si viene)
    if (filter.category) {
      where.category = { [Op.in]: toArray(filter.category).map(c => String(c).toLowerCase()) };
    }

    // brand
    if (filter.brand) {
      const brandSlugs = toArray(filter.brand).map(slugify);
      andConditions.push({ brandSlug: { [Op.in]: brandSlugs } });
    }

    // types / tipo -> usar JSON_CONTAINS sobre typeSlugs
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

    // genero -> JSON_CONTAINS sobre genero
    if (filter.genero) {
      toArray(filter.genero).forEach(g => {
        const val = String(g); // normaliza
        andConditions.push(
          sequelizeWhere(
            fn("JSON_CONTAINS", col("Product.genero"), JSON.stringify(val)),
            1
          )
        );
      });
    }

    // si hay condiciones acumuladas las meto en where
    if (andConditions.length) where[Op.and] = andConditions;

    // filtros sobre variantes (colores)
    const variantsWhere = {};
    if (filter.color) {
      variantsWhere.colorSlug = { [Op.in]: toArray(filter.color).map(slugify) };
    }

    // Traigo productos + variants + sizes (sin where en sizes)
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
          required: false // traigo talles para filtrar en memoria
        }]
      }],
      order: [["createdAt", "DESC"]]
    });

    // Filtrado en memoria por talles (size)
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

