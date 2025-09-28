import { Product } from "./product.js";
import { Variant } from "./variant.js";
import { Size } from "./size.js";

// Un Product tiene muchas Variants
Product.hasMany(Variant, {
  foreignKey: "productId",
  as: "variants",
  onDelete: "CASCADE",
});

// Un Variant pertenece a un Product
Variant.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

// Un Variant tiene muchos Sizes
Variant.hasMany(Size, {
  foreignKey: "variantId",
  as: "sizes",
  onDelete: "CASCADE",
});

// Un Size pertenece a una Variant
Size.belongsTo(Variant, {
  foreignKey: "variantId",
  as: "variant",
});