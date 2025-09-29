import { Sequelize } from "sequelize";
import dotenv from "dotenv"; // Asegúrate de que dotenv esté importado si no lo está globalmente

dotenv.config(); // Carga las variables de entorno

export const sequelize = new Sequelize(
  process.env.DB_DATABASE, // El nombre de la base DEBE venir de la variable de entorno
  process.env.DB_USER,     // El usuario DEBE venir de la variable de entorno
  process.env.DB_PASSWORD, // La contraseña DEBE venir de la variable de entorno
  {
    host: process.env.DB_HOST, // El host DEBE venir de la variable de entorno (srv804.hostinger.io)
    dialect: "mysql"
  }
);