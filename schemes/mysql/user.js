import { DataTypes } from "sequelize";
import { sequelize } from "../../config/mysql.js"; // Ajusta el path si es necesario

export const User = sequelize.define("User", {
  mail: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING }, // select: false en mongoose no existe aquí, pero lo podés manejar en queries
  googleId: { type: DataTypes.STRING },
  type: { type: DataTypes.ENUM("user", "admin"), defaultValue: "user" },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  verificationToken: { type: DataTypes.STRING },
  verificationExpires: { type: DataTypes.DATE },
}, {
  timestamps: true, // createdAt/updatedAt
  tableName: "users"
});