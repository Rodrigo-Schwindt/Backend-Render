// src/controllers/cart.js
import { validateCartItems } from '../models/mysql/cart.js';

// 🚨 NUEVO ENDPOINT: Llamado por el frontend para validar y mostrar el total ANTES de pagar
export const validateCart = async (req, res) => {
    try {
        const { items } = req.body; // Esto debe contener: [{ productId, quantity, size, color }]
        
        const validationResult = await validateCartItems(items);

        if (!validationResult.isValid && validationResult.errors.length > 0) {
            // Devolvemos 400 (Bad Request) si hay errores graves que impiden el checkout
            return res.status(400).json({ 
                error: "El carrito contiene errores o stock insuficiente.",
                errors: validationResult.errors 
            });
        }
        
        // Devolvemos el carrito validado y el precio final al frontend
        res.json({
            items: validationResult.items,
            totalPrice: validationResult.totalPrice,
            errors: validationResult.errors.length > 0 ? validationResult.errors : null
        });

    } catch (error) {
        console.error("❌ Error al validar el carrito:", error);
        res.status(500).json({ error: "Error al validar el carrito en el servidor." });
    }
};