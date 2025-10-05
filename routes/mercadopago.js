// routes/mercadopago.js

import express from 'express';
// ✅ IMPORTANTE: Ahora importamos processPayment
import { createPreference, processPayment, receiveWebhook } from '../controllers/mercadopago.js'; 

const mpRoutes = express.Router();

// 1. Ruta para crear la preferencia (Checkout Pro/Redirect)
mpRoutes.post('/create-preference', createPreference);

// 2. ✅ NUEVA RUTA: Ruta para procesar el pago (Usada por el Payment Brick en el Frontend)
// El Payment Brick enviará aquí los datos tokenizados de la tarjeta.
mpRoutes.post('/process', processPayment);

// 3. Ruta para recibir notificaciones (Webhook de Mercado Pago)
mpRoutes.post('/webhook', receiveWebhook);

export default mpRoutes;