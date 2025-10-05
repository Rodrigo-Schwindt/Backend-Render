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
    if (initializationPromise) {
        try {
            await initializationPromise;
        } catch (e) {
            return res.status(503).json({ error: "El servicio de pagos falló al iniciar." });
        }
    }

    if (!checkSDK(res)) return;

    try {
        const paymentData = req.body;

        // Crear el pago con los datos del brick
        const payment = await paymentClient.create({
            body: {
                transaction_amount: paymentData.transaction_amount,
                token: paymentData.token, // Token de la tarjeta generado por el Brick
                description: paymentData.description || 'Compra en Clave Streetwear',
                installments: paymentData.installments,
                payment_method_id: paymentData.payment_method_id,
                issuer_id: paymentData.issuer_id,
                payer: {
                    email: paymentData.payer.email,
                    identification: paymentData.payer.identification
                },
                // Datos adicionales opcionales
                external_reference: paymentData.external_reference || `order-${Date.now()}`,
                notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
                metadata: {
                    order_id: paymentData.order_id
                }
            }
        });

        console.log('💳 Pago procesado:', payment);

        // Responder al frontend con el resultado
        res.status(200).json({
            status: payment.status,
            status_detail: payment.status_detail,
            id: payment.id,
            external_reference: payment.external_reference
        });

        // Si el pago fue aprobado, actualizar la base de datos
        if (payment.status === 'approved') {
            console.log(`✅ Pago aprobado. ID: ${payment.id}`);
            // [ACTUALIZAR BASE DE DATOS Y STOCK AQUÍ]
        }

    } catch (error) {
        console.error("❌ Error al procesar el pago:", error);
        res.status(500).json({ 
            error: "Error al procesar el pago",
            details: error.message 
        });
    }
};

// Webhook (mantenerlo para notificaciones asíncronas)
export const receiveWebhook = async (req, res) => {
    if (initializationPromise) {
        try {
            await initializationPromise;
        } catch (e) {
            return res.status(503).json({ error: "El servicio de pagos falló al iniciar." });
        }
    }

    if (!checkSDK(res)) return;

    res.status(204).send();

    const topic = req.query.topic || req.query.type;
    const resourceId = req.query.id || req.query['data.id'];

    if (!topic || !resourceId) {
        return;
    }

    try {
        let paymentData;

        if (topic === 'payment') {
            const response = await paymentClient.get({ id: resourceId });
            paymentData = response;
        } else {
            return;
        }

        if (paymentData) {
            const status = paymentData.status;
            const externalReference = paymentData.external_reference;

            console.log(`💳 Webhook - Pago ${paymentData.id}, Estado: ${status}`);

            if (status === 'approved') {
                console.log(`✅ Pago aprobado vía webhook: ${externalReference}`);
                // [ACTUALIZAR BASE DE DATOS SI NO SE HIZO ANTES]
            }
        }
    } catch (error) {
        console.error("❌ Error al procesar webhook de MP:", error);
    }
};