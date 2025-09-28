import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";

export const VariantSizeSchema = new mongoose.Schema({
  size:  { type: String, required: false, trim: true },
  stock: { type: Number, required: true, min: 0, default: 0 },
  sku:   { type: String, trim: true }
}, { _id: false });

export const VariantSchema = new mongoose.Schema({
  color:     { type: String, required: true, trim: true },
  colorSlug: { type: String, index: true },
  colorCode: { type: String, trim: true }, // opcional (#FFFFFF)
  images:    { type: [String], default: [] },
  sizes:     { type: [VariantSizeSchema], default: [] }
}, { _id: false });

// Normalizar colorSlug y validar duplicados de sizes dentro de la variante
VariantSchema.pre("validate", function(next) {
  if (this.color) {
    this.color = this.color.trim();
    this.colorSlug = slugify(this.color);
  }
  const seenSizes = new Set();
  for (const s of this.sizes) {
    if (!s.size) return next(new Error("Talle sin valor en una variante"));
    const key = s.size.trim();
    if (seenSizes.has(key)) {
      return next(new Error(`Talle duplicado (${key}) dentro de la variante color ${this.color}`));
    }
    seenSizes.add(key);
  }
  next();
});