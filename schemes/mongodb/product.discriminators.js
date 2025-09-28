import { Schema } from "mongoose";
import { ProductBaseModel } from "./product.base.js";

// Si no necesitas campos específicos, esquemas vacíos
const RopaSchema = new Schema({}, { _id: false });
const CalzadosSchema = new Schema({}, { _id: false });
const AccesoriosSchema = new Schema({}, { _id: false });

export const ropaModel = ProductBaseModel.discriminator("ropa", RopaSchema);
export const calzadosModel = ProductBaseModel.discriminator("calzados", CalzadosSchema);
export const accesoriosModel = ProductBaseModel.discriminator("accesorios", AccesoriosSchema);