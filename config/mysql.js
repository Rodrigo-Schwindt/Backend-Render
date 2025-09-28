import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  "ecommerce", // nombre de la base
  "root",      // usuario (cambia si no es root)
  "",          // contraseña (casi siempre vacía en XAMPP)
  { host: "localhost", dialect: "mysql" }
);