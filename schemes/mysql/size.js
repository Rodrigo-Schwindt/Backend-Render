import { DataTypes } from "sequelize";
import { sequelize } from "../../config/mysql.js";

export const Size = sequelize.define("Size", {
  size:  { type: DataTypes.STRING },
  stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  sku:   { type: DataTypes.STRING }
}, {
  tableName: "sizes"
});

