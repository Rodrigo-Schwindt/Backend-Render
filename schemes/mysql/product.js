import { DataTypes } from "sequelize";
import { sequelize } from "../../config/mysql.js";

export const Product = sequelize.define("Product", {
  title:       { type: DataTypes.STRING, allowNull: false },
  price:       { type: DataTypes.FLOAT, allowNull: false },
  promoPrice:  { type: DataTypes.FLOAT },
  sku:         { type: DataTypes.STRING },
  brand:       { type: DataTypes.STRING },
  brandSlug:   { type: DataTypes.STRING },
  types:       { type: DataTypes.JSON },    // Array de strings
  typeSlugs:   { type: DataTypes.JSON },    // Array de strings
  genero:      { type: DataTypes.JSON },    // Array de strings
  category:    { type: DataTypes.STRING, allowNull: false },
  coverImage:  { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },

  peso:        { type: DataTypes.FLOAT },   // en kg
  profundidad: { type: DataTypes.FLOAT },   // en cm
  ancho:       { type: DataTypes.FLOAT },
  alto:        { type: DataTypes.FLOAT }
}, {
  timestamps: true,
  tableName: "products"
});