// routes/mercadopago.js

import express from 'express';
// ✅ IMPORTANTE: Ahora importamos processPayment
import { validateCart } from '../controllers/cart.js'; 

const cartRoutes = express.Router();

cartRoutes.post('/cart/validate', validateCart); 

// Si usas un endpoint para crear órdenes/checkout
// router.post('/checkout', createOrder);

export default cartRoutes;