// src/controllers/cart.js

// 💡 IMPORTANTE: Asegúrate que esta ruta sea correcta a tu servicio.
import { validateCartItems } from '../models/mysql/cart.js'; 

/**
 * @route POST /api/cart/validate
 * @description Permite al frontend validar el carrito y obtener el precio total seguro del servidor.
 */
export const validateCart = async (req, res) => {
    try {
        const { items } = req.body; // { productId, quantity, size, color }
        
        const validationResult = await validateCartItems(items);

        // Si hay errores graves (stock insuficiente, producto inactivo), bloqueamos el checkout
        if (!validationResult.isValid && validationResult.errors.length > 0) {
            return res.status(400).json({ 
                error: "El carrito contiene errores o stock insuficiente.",
                errors: validationResult.errors 
            });
        }
        
        // Devolvemos el carrito validado y el precio final seguro al frontend
        // El frontend usará validationResult.totalPrice como 'validatedAmount'
        res.json({
            items: validationResult.items,
            totalPrice: validationResult.totalPrice,
            errors: validationResult.errors.length > 0 ? validationResult.errors : null
        });

    } catch (error) {
        console.error("❌ Error al validar el carrito:", error);
        res.status(500).json({ error: "Error interno al validar el carrito." });
    }
};