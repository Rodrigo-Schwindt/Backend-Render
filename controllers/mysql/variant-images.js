import { Variant } from "../models/mysql/variant.js";

// Agregar imágenes a la variante por color
export function makeAppendVariantImages() {
  return async function appendVariantImages(req, res) {
    try {
      const { id, color } = req.params;
      const urls = req.fileUrls || [];
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ message: "No se recibieron imágenes" });
      }

      // 1. Encontrar la variante específica por el ID del producto y el color
      const variant = await Variant.findVariant(id, color);
      if (!variant) {
        return res.status(404).json({ message: "Producto/variante no encontrado" });
      }

      // 2. Obtener las imágenes existentes y agregar las nuevas
      // NO uses JSON.parse - Sequelize ya devuelve un array
      let existingImages = variant.images || [];
      
      // Asegurar que existingImages es un array
      if (!Array.isArray(existingImages)) {
        existingImages = [];
      }
      
      const updatedImages = [...existingImages, ...urls];

      // 3. Actualizar la variante en la base de datos
      // NO uses JSON.stringify - Sequelize lo maneja automáticamente
      const [rowsUpdated] = await Variant.update(
        { images: updatedImages }, // Pasa el array directamente
        { where: { id: variant.id } }
      );

      if (rowsUpdated === 0) {
        return res.status(404).json({ message: "Producto/variante no encontrado o sin cambios" });
      }

      return res.status(200).json({ message: "Imágenes adjuntadas correctamente", images: updatedImages });
    } catch (e) {
      console.error("Error makeAppendVariantImages:", e);
      return res.status(500).json({ message: "Error al adjuntar imágenes", error: e.message });
    }
  };
}

// Remover una imagen específica de la variante
export function makeRemoveVariantImage() {
  return async function removeVariantImage(req, res) {
    try {
      const { id, color } = req.params;
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ message: "Falta 'image' en el cuerpo de la petición" });
      }
      
      // 1. Encontrar la variante
      const variant = await Variant.findVariant(id, color);
      if (!variant) {
        return res.status(404).json({ message: "Producto/variante no encontrado" });
      }

      // 2. Filtrar el array de imágenes para eliminar la imagen
      // NO uses JSON.parse - Sequelize ya devuelve un array
      let existingImages = variant.images || [];
      
      // Asegurar que existingImages es un array
      if (!Array.isArray(existingImages)) {
        existingImages = [];
      }
      
      const updatedImages = existingImages.filter(img => img !== image);

      // 3. Actualizar la variante en la base de datos
      // NO uses JSON.stringify - Sequelize lo maneja automáticamente
      const [rowsUpdated] = await Variant.update(
        { images: updatedImages }, // Pasa el array directamente
        { where: { id: variant.id } }
      );

      if (rowsUpdated === 0) {
        return res.status(404).json({ message: "Producto/variante no encontrado o sin cambios" });
      }
      
      return res.status(200).json({ message: "Imagen removida correctamente", images: updatedImages });
    } catch (e) {
      console.error("Error makeRemoveVariantImage:", e);
      return res.status(500).json({ message: "Error al quitar imagen", error: e.message });
    }
  };
}