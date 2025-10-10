import { DataTypes } from "sequelize";
import { sequelize } from "../../config/mysql.js";

export const Product = sequelize.define("Product", {
  title:       { type: DataTypes.STRING, allowNull: false },
  price:       { type: DataTypes.FLOAT, allowNull: false },
  promoPrice:  { type: DataTypes.FLOAT },
  sku:         { type: DataTypes.STRING },
  brand:       { type: DataTypes.STRING },
  brandSlug:   { type: DataTypes.STRING },
  types:       { type: DataTypes.JSON },   
  typeSlugs:   { type: DataTypes.JSON },   
  genero:      { type: DataTypes.JSON },   
  category:    { type: DataTypes.STRING, allowNull: false },
  coverImage:  { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },

  peso:        { type: DataTypes.FLOAT },   
  profundidad: { type: DataTypes.FLOAT },   
  ancho:       { type: DataTypes.FLOAT },
  alto:        { type: DataTypes.FLOAT }
}, {
  timestamps: true,
  tableName: "products"
});