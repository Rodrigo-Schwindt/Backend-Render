import mongoose, { Schema } from "mongoose";

function slugify(str = "") {
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Talle/Stock/SKU por variante
const SizeSchema = new Schema(
  {
    size: { type: String, required: false, trim: true },
    stock: { type: Number, default: 0, min: 0 },
    sku:   { type: String, trim: true }
  },
  { _id: false }
);

// Variante (color)
const VariantSchema = new Schema(
  {
    color:      { type: String, required: true, trim: true },
    colorSlug:  { type: String, index: true },
    colorCode:  { type: String, trim: true },
    images:     { type: [String], default: [] },
    sizes:      { type: [SizeSchema], default: [] },
    sku:        { type: String, trim: true },
    promoPrice: { type: Number, min: 0 }
  },
  { _id: false }
);

// Producto base
const ProductBaseSchema = new Schema(
  {
    title:       { type: String, required: true },
    price:       { type: Number, required: true, min: 0 },
    promoPrice:  { type: Number, min: 0 },
    sku:         { type: String, trim: true },
    brand:       { type: String },
    brandSlug:   { type: String, index: true },
    types:       { type: [String], default: [] },
    typeSlugs:   { type: [String], default: [], index: true },
    genero:      { type: [String], default: [] },
    category:    { type: String, required: true, index: true },
    coverImage:  { type: String },
    variants:    { type: [VariantSchema], default: [] },
    description: { type: String },
    peso:        { type: Number, min: 0 },
    profundidad: { type: Number, min: 0 },
    ancho:       { type: Number, min: 0 },
    alto:        { type: Number, min: 0 }
  },
  {
    timestamps: true,
    discriminatorKey: "category",
    collection: "products",
  }
);

// Normalización y slugs
ProductBaseSchema.pre("validate", function (next) {
  try {
    if (this.brand) this.brandSlug = slugify(this.brand);
    if (Array.isArray(this.types)) this.typeSlugs = this.types.map(slugify);

    if (!Array.isArray(this.variants)) this.variants = [];

    this.variants = this.variants.map((v) => {
      const color = typeof v?.color === "string" ? v.color.trim() : "";
      const colorSlug = color ? slugify(color) : "";
      const images = Array.isArray(v?.images) ? v.images : [];
      const sizes = Array.isArray(v?.sizes)
        ? v.sizes.map((s) => ({
            size: String(s.size),
            stock: Number.isFinite(Number(s.stock)) ? Number(s.stock) : 0,
            ...(s.sku ? { sku: String(s.sku) } : {}),
          }))
        : [];
      return {
        ...v,
        color,
        colorSlug,
        images,
        sizes,
        promoPrice: v.promoPrice ?? undefined,
        sku: v.sku ?? undefined,
      };
    });

    if (this.variants.length === 0) {
      this.invalidate("variants", "Debe incluir al menos una variante (color).");
    }

    const idxNoColor = this.variants.findIndex((v) => !v.colorSlug);
    if (idxNoColor !== -1) {
      this.invalidate(`variants.${idxNoColor}.color`, "El color es requerido.");
    }

    const slugs = this.variants.map((v) => v.colorSlug).filter(Boolean);
    const dup = slugs.find((s, i) => slugs.indexOf(s) !== i);
    if (dup) {
      this.invalidate("variants", "Hay variantes con el mismo color.");
    }

    next();
  } catch (e) {
    this.invalidate("variants", e.message || "Error validando variantes");
    next();
  }
});

// Solo mapea _id a id (sin afectar subdocs)
function mapId(doc, ret) {
  ret.id = ret._id?.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

ProductBaseSchema.set("toJSON", { transform: mapId });
ProductBaseSchema.set("toObject", { transform: mapId });

ProductBaseSchema.statics.decrementVariantSizeStock = async function (
  productId,
  colorSlugOrColor,
  size,
  quantity
) {
  const cSlug = slugify(colorSlugOrColor);
  const qty = Number(quantity);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const err = new Error("ID inválido");
    err.code = "BAD_ID";
    throw err;
  }
  if (!cSlug || !size || !Number.isInteger(qty) || qty <= 0) {
    const err = new Error("Parámetros inválidos");
    err.code = "BAD_PARAMS";
    throw err;
  }

  const res = await this.updateOne(
    {
      _id: productId,
      $or: [{ "variants.colorSlug": cSlug }, { "variants.color": new RegExp(`^${cSlug}$`, "i") }],
      "variants.sizes.size": String(size),
      "variants.sizes.stock": { $gte: qty },
    },
    {
      $inc: { "variants.$[v].sizes.$[s].stock": -qty },
    },
    {
      arrayFilters: [{ "v.colorSlug": cSlug }, { "s.size": String(size) }],
    }
  );

  if (res.modifiedCount === 0) {
    const err = new Error("Stock insuficiente o variante/talle inexistente");
    err.code = "NO_STOCK";
    throw err;
  }
  return res;
};

export const ProductBaseModel = mongoose.model("Product", ProductBaseSchema);