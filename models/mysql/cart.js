// src/services/cartService.js
// Este archivo contiene la lógica de negocio segura para validar el carrito.

import { Product } from "../schemes/mysql/product.js";
import { Variant } from "../schemes/mysql/variant.js";
import { Size } from "../schemes/mysql/size.js";

/**
 * Función centralizada para validar el carrito, verificar precios/stock y calcular el total.
 * * @param {Array} items - Items del carrito (solo productId, quantity, size, color) enviados por el frontend.
 * @returns {object} - { isValid, items: validatedItems, totalPrice, errors }
 */
export const validateCartItems = async (items) => {
    const validatedItems = [];
    let totalPrice = 0;
    const errors = [];
    let isValid = true;

    if (!items || !Array.isArray(items)) {
        return { isValid: false, items: [], totalPrice: 0, errors: ["Carrito no válido o vacío."] };
    }

    for (const item of items) {
        const { productId, quantity, size, color } = item;
        
        // --- 1. VALIDACIÓN BÁSICA ---
        if (!productId || typeof quantity !== 'number' || quantity <= 0) {
            errors.push(`Formato inválido para un producto.`);
            isValid = false;
            continue;
        }
        
        // --- 2. CONSULTA SEGURA A LA DB ---
        // Buscamos el producto y la variante/talle en una sola consulta eficiente.
        const product = await Product.findByPk(productId, {
            attributes: ['id', 'title', 'price', 'active'], // Solo campos necesarios y seguros
            include: [{
                model: Variant,
                as: "variants",
                required: false, // No requiere que haya variantes
                include: [{
                    model: Size,
                    as: "sizes",
                    required: false // No requiere que haya talles
                }]
            }]
        });

        // --- 3. VALIDACIÓN DE EXISTENCIA Y ESTADO ---
        if (!product || !product.active) {
            errors.push(`Producto ID ${productId} no encontrado o inactivo.`);
            isValid = false;
            continue;
        }

        // --- 4. VALIDACIÓN DE VARIANTE/TALLE/STOCK ---
        
        // Buscar la variante específica (asumiendo que tu Variant tiene el campo 'color')
        const targetVariant = product.variants?.find(v => v.color === color);
        
        if (!targetVariant) {
            errors.push(`Variante de color ${color} no encontrada para ${product.title}.`);
            isValid = false;
            continue;
        }
        
        // Buscar el talle/stock específico dentro de la variante
        const targetSize = targetVariant.sizes?.find(s => String(s.size) === String(size));
        
        if (!targetSize) {
            errors.push(`Talle ${size} no encontrado para ${product.title}.`);
            isValid = false;
            continue;
        }
        
        if (targetSize.stock < quantity) {
            errors.push(`Stock insuficiente para ${product.title} (${color}/${size}). Stock disponible: ${targetSize.stock}.`);
            isValid = false;
            continue;
        }

        // --- 5. CÁLCULO SEGURO ---
        // Usamos el precio del producto de la DB, que es el único verdadero
        const itemTotal = product.price * quantity;
        totalPrice += itemTotal;

        // --- 6. AGREGAR A ITEMS VALIDADOS ---
        validatedItems.push({
            productId: product.id,
            title: product.title,
            price: product.price, // Precio REAL de la DB
            quantity: quantity,
            size: size,
            color: color,
            subtotal: itemTotal,
        });
    }

    return { isValid, items: validatedItems, totalPrice, errors };
};