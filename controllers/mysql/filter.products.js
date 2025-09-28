// controllers/productos.controller.js
import { Productos as ProductosModel } from "../../models/mysql/filter.products.js";

export class Productos {
  static async GetProductosForFilter(filter) {
    return await ProductosModel.GetProductosForFilter(filter);
  }
}
