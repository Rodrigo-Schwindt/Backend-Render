// src/controllers/mercadopago.js

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

let client; // Cliente configurado de Mercado Pago
let preferenceClient; // Cliente para manejar preferencias
let paymentClient; // Cliente para manejar pagos
let initializationPromise;

// Función para inicializar el SDK de Mercado Pago
function setupMercadoPago() {
    initializationPromise = (async () => {
        try {
            const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

            if (!MP_ACCESS_TOKEN) {
                console.error("❌ ERROR: MP_ACCESS_TOKEN no está definido.");
                throw new Error("MP_ACCESS_TOKEN no configurado");
            }

            // ✅ Configuración moderna del SDK (v2.0+)
            client = new MercadoPagoConfig({
                accessToken: MP_ACCESS_TOKEN,
                options: {
                    timeout: 5000,
                    // Eliminamos 'idempotencyKey' aquí ya que es mejor gestionarla por request si es necesario
                }
            });

            // Inicializar los clientes específicos
            preferenceClient = new Preference(client);
            paymentClient = new Payment(client);

            console.log("✅ SDK de Mercado Pago configurado exitosamente.");
            return true;
        } catch (error) {
            console.error("❌ Error al inicializar el SDK de Mercado Pago:", error);
            throw new Error("Fallo en la inicialización del SDK de MP.");
        }
    })();
}

// Llamada a la función de configuración
setupMercadoPago();

// Función de validación
const checkSDK = (res) => {
    if (!client || !preferenceClient || !paymentClient) {
        res.status(503).json({ error: "El servicio de pagos aún no está disponible." });
        return false;
    }
    return true;
};

// --- CONTROLADOR EXISTENTE: CREAR PREFERENCIA (PARA CHECKOUT PRO) ---
export const createPreference = async (req, res) => {
    // Esperar la inicialización
    if (initializationPromise) {
        try {
            await initializationPromise;
        } catch (e) {
            return res.status(503).json({ error: "El servicio de pagos falló al iniciar." });
        }
    }

    if (!checkSDK(res)) return;

    const { items, customer, shipping_cost, order_id } = req.body;

    // Mapear los ítems del carrito
    const mp_items = items.map(item => ({
        title: item.title,
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
        currency_id: "ARS"
    }));

    try {
        const preferenceBody = { // Renombrado a 'preferenceBody' para mayor claridad
            items: mp_items,
            payer: {
                email: customer.email,
                name: customer.name
            },
            back_urls: {
                success: "https://clancestreetwear.in/checkout/success",
                failure: "https://clancestreetwear.in/checkout/failure",
                pending: "https://clancestreetwear.in/checkout/pending"
            },
            notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
            auto_return: "approved",
            external_reference: order_id || `temp-ref-${Date.now()}`
        };

        // ✅ Usar el cliente de preferencias
        const response = await preferenceClient.create({ body: preferenceBody });

        res.status(200).json({ preferenceId: response.id });

    } catch (error) {
        console.error("❌ Error al crear la preferencia de MP:", error);
        res.status(500).json({ error: "No se pudo crear la preferencia de pago." });
    }
};

// --- CONTROLADOR NUEVO: PROCESAR PAGO (PARA PAYMENT BRICK) ---
export const processPayment = async (req, res) => {
    // 🌟 Esperar inicialización
    if (initializationPromise) {
        try {
            await initializationPromise;
        } catch (e) {
            return res.status(503).json({ error: "El servicio de pagos falló al iniciar." });
        }
    }

    if (!checkSDK(res)) return;

    try {
        // Los datos vienen directamente del frontend (Payment Brick)
        const { 
            paymentMethodId, 
            token, 
            issuerId, 
            transactionAmount, 
            installments, 
            payerEmail, 
            orderId // Este campo debe ser enviado por tu frontend
        } = req.body;

        const paymentBody = {
            transaction_amount: transactionAmount,
            token: token,
            description: 'Compra de Clave Streetwear', // Usa una descripción estática o dinámica
            installments: installments,
            payment_method_id: paymentMethodId,
            issuer_id: issuerId,
            payer: {
                email: payerEmail,
            },
            // Asegura que tienes la referencia para el Webhook
            external_reference: orderId || `brick-ref-${Date.now()}`,
            notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
        };

        // 🚨 Llamamos a paymentClient para crear el pago
        const response = await paymentClient.create({ body: paymentBody });

        // 🚀 Respuesta al frontend del Payment Brick
        res.status(201).json({
            id: response.id,
            status: response.status,
            detail: response.status_detail,
        });

    } catch (error) {
        console.error("❌ Error al procesar pago con Payment Brick:", error);

        // Manejo de errores detallado
        const status = error.status || 500;
        const message = error.message || "Error interno al procesar el pago.";
        
        res.status(status).json({ 
            error: message,
            // Proporciona detalles específicos si Mercado Pago los devuelve
            mp_error: error.cause && error.cause.length > 0 ? error.cause[0].description : 'Error desconocido de MP'
        });
    }
};


// --- CONTROLADOR EXISTENTE: WEBHOOK ---
export const receiveWebhook = async (req, res) => {
    // Esperar la inicialización
    if (initializationPromise) {
        try {
            await initializationPromise;
        } catch (e) {
            return res.status(503).json({ error: "El servicio de pagos falló al iniciar." });
        }
    }

    if (!checkSDK(res)) return;

    // Responder inmediatamente
    res.status(204).send();

    const topic = req.query.topic || req.query.type;
    const resourceId = req.query.id || req.query['data.id'];

    if (!topic || !resourceId) {
        return;
    }

    try {
        let paymentData;

        if (topic === 'payment') {
            // ✅ Usar el cliente de pagos
            const response = await paymentClient.get({ id: resourceId });
            paymentData = response;

        } else if (topic === 'merchant_order') {
            return;
        }

        if (paymentData) {
            const status = paymentData.status;
            const externalReference = paymentData.external_reference;

            console.log(`💳 Pago recibido. ID: ${paymentData.id}, Estado: ${status}, Ref: ${externalReference}`);

            if (status === 'approved') {
                console.log(`✅ Pago aprobado. Procediendo a actualizar DB y stock para el pedido: ${externalReference}`);
                // [TUS FUNCIONES DE BASE DE DATOS AQUÍ]

            } else if (status === 'rejected' || status === 'cancelled') {
                console.log(`❌ Pago rechazado/cancelado para el pedido: ${externalReference}`);

            } else if (status === 'in_process') {
                console.log(`⚠️ Pago en proceso (pendiente) para el pedido: ${externalReference}`);
            }
        }
    } catch (error) {
        console.error("❌ Error al procesar webhook de MP:", error);
    }
};