import { Product } from "../../schemes/mysql/product.js";
import { Variant } from "../../schemes/mysql/variant.js";
import { Size } from "../../schemes/mysql/size.js";
import "../../schemes/mysql/associations.js"; 

export const validateCartItems = async (items) => {
    const validatedItems = [];
    let totalPrice = 0;
    const errors = [];
    let isValid = true;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return { isValid: false, items: [], totalPrice: 0, errors: ["Carrito vacío."] };
    }

    for (const item of items) {
        const { productId, quantity, size, color } = item;
        
        if (!productId || typeof quantity !== 'number' || quantity <= 0) {
            errors.push(`Producto con formato inválido.`);
            isValid = false;
            continue;
        }

        const product = await Product.findByPk(productId, {
            attributes: ['id', 'title', 'price'],
            include: [{
                model: Variant,
                as: "variants",
                required: false,
                include: [{
                    model: Size,
                    as: "sizes",
                    required: false
                }]
            }]
        });

        if (!product) {
            errors.push(`Producto ID ${productId} no encontrado.`);
            isValid = false;
            continue;
        }

        if (!product.price || product.price <= 0) {
            errors.push(`El producto "${product.title}" no tiene precio válido.`);
            isValid = false;
            continue;
        }

        if (!product.variants || product.variants.length === 0) {
            errors.push(`El producto "${product.title}" no tiene variantes.`);
            isValid = false;
            continue;
        }

        const targetVariant = product.variants.find(v => v.color === color);
        if (!targetVariant) {
            errors.push(`Color "${color}" no disponible para "${product.title}".`);
            isValid = false;
            continue;
        }

        if (!targetVariant.sizes || targetVariant.sizes.length === 0) {
            errors.push(`La variante ${color} de "${product.title}" no tiene talles.`);
            isValid = false;
            continue;
        }

        const targetSize = targetVariant.sizes.find(s => String(s.size) === String(size));
        if (!targetSize) {
            errors.push(`Talle "${size}" no disponible para "${product.title}" (${color}).`);
            isValid = false;
            continue;
        }

        if (targetSize.stock < quantity) {
            errors.push(`Stock insuficiente para "${product.title}" (${color}/${size}). Disponible: ${targetSize.stock}.`);
            isValid = false;
            continue;
        }

        const itemTotal = product.price * quantity;
        totalPrice += itemTotal;

        validatedItems.push({
            productId: product.id,
            title: product.title,
            price: product.price,
            quantity: quantity,
            size: size,
            color: color,
            subtotal: itemTotal,
        });
    }

    return { isValid, items: validatedItems, totalPrice, errors };
};