import { DataTypes } from "sequelize";
import { sequelize } from "../../config/mysql.js";


export const Variant = sequelize.define("Variant", {
  color:       { type: DataTypes.STRING, allowNull: false },
  colorSlug:   { type: DataTypes.STRING },
  colorCode:   { type: DataTypes.STRING },
  images: {
    type: DataTypes.JSON, // Use DataTypes.JSON for proper handling
    allowNull: false,
    defaultValue: [],
    // The `get` method ensures the data is returned as a JS array
    get() {
      const rawValue = this.getDataValue('images');
      return Array.isArray(rawValue) ? rawValue : (rawValue ? JSON.parse(rawValue) : []);
    },
    // The `set` method ensures it's stored as a JSON string
    set(value) {
      this.setDataValue('images', JSON.stringify(value));
    }
  },
  sku:         { type: DataTypes.STRING },
  promoPrice:  { type: DataTypes.FLOAT }
}, {
  tableName: "variants"
});

