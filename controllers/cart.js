import { validateCartItems } from '../models/mysql/cart.js'; 

export const validateCart = async (req, res) => {
    try {
        const { items } = req.body; 
        
        const validationResult = await validateCartItems(items);


        if (!validationResult.isValid && validationResult.errors.length > 0) {
            return res.status(400).json({ 
                error: "El carrito contiene errores o stock insuficiente.",
                errors: validationResult.errors 
            });
        }
        

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