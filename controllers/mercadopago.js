// src/controllers/mercadopago.js

// 🚨 MODIFICACIÓN: Usamos require() para asegurar que la importación funcione.
const mercadopago = require('mercadopago');

// Asume que obtienes el token de Render/tu .env
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN; 

// 1. Inicializar el SDK con el Access Token
mercadopago.configure({
    access_token: MP_ACCESS_TOKEN 
});

// 2. Controlador para crear la preferencia
export const createPreference = async (req, res) => {
    // Aquí deberías recibir los datos del carrito/pedido del Front-end (req.body)
    const { items, customer, shipping_cost, order_id } = req.body; 

    // Mapear los ítems del carrito al formato que espera Mercado Pago
    const mp_items = items.map(item => ({
        title: item.title,
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
        currency_id: "ARS" 
    }));

    try {
        const preference = {
            items: mp_items,
            
            // Información del comprador
            payer: {
                email: customer.email,
                name: customer.name
            },
            
            // URLs a dónde redirigir al cliente después de la compra
            back_urls: {
                success: "https://clancestreetwear.in/checkout/success", 
                failure: "https://clancestreetwear.in/checkout/failure",
                pending: "https://clancestreetwear.in/checkout/pending"
            },
            // URL para que Mercado Pago notifique a tu Backend del estado del pago
            // Asegúrate que process.env.BACKEND_URL es la URL de tu servicio Render.
            notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`, 

            auto_return: "approved", 
            external_reference: order_id || `temp-ref-${Date.now()}` // Fallback para external_reference
        };

        const response = await mercadopago.preferences.create(preference);
        
        // Enviamos el ID de la preferencia al Front-end.
        res.status(200).json({ preferenceId: response.body.id });

    } catch (error) {
        console.error("Error al crear la preferencia de MP:", error);
        res.status(500).json({ error: "No se pudo crear la preferencia de pago." });
    }
};

export const receiveWebhook = async (req, res) => {
    // ⚠️ Responder inmediatamente para confirmar recepción
    res.status(204).send(); 

    // Obtener la información de la notificación
    const topic = req.query.topic || req.query.type;
    const resourceId = req.query.id || req.query['data.id'];

    if (!topic || !resourceId) {
        return; 
    }

    try {
        let paymentData;

        // Si el topic es 'payment', obtenemos la información del pago
        if (topic === 'payment') {
            const response = await mercadopago.payment.get(resourceId);
            paymentData = response.body;

        } else if (topic === 'merchant_order') {
             // Puedes dejar esto comentado o manejarlo si necesitas órdenes compuestas
             return;
        }

        if (paymentData) {
            const status = paymentData.status;
            const externalReference = paymentData.external_reference; 

            console.log(`Pago recibido. ID: ${paymentData.id}, Estado: ${status}, Ref: ${externalReference}`);

            // 🌟🌟🌟 LÓGICA CLAVE (A CONECTAR CON MYSQL) 🌟🌟🌟
            
            if (status === 'approved') {
                // Lógica: 1. Buscar el pedido/carrito en tu MySQL usando externalReference. 2. Actualizar estado a 'pagado'. 3. Descontar stock. 4. Email.
                console.log(`✅ Pago aprobado. Procediendo a actualizar DB y stock para el pedido: ${externalReference}`);
                // [TUS FUNCIONES DE BASE DE DATOS AQUÍ]
                
            } else if (status === 'rejected' || status === 'cancelled') {
                console.log(`❌ Pago rechazado/cancelado para el pedido: ${externalReference}`);

            } else if (status === 'in_process') {
                console.log(`⚠️ Pago en proceso (pendiente) para el pedido: ${externalReference}`);
            }
        }
    } catch (error) {
        console.error("Error al procesar webhook de MP:", error);
    }
};