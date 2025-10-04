// routes/mercadopago.js

import express from 'express';
// Importa ambos controladores
import { createPreference, receiveWebhook } from '../controllers/mercadopago.js'; 

const mpRoutes = express.Router();

// Ruta para crear la preferencia (llamada por el Front-end)
mpRoutes.post('/create-preference', createPreference);

// 🚨 NUEVA RUTA: Ruta para recibir notificaciones (llamada por Mercado Pago)
mpRoutes.post('/webhook', receiveWebhook);

export default mpRoutes;