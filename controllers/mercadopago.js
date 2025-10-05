// src/controllers/mercadopago.js

// 🚨 IMPORTACIÓN DINÁMICA: Este es el CAMBIO CLAVE para entornos ES Module/Node.js modernos
let mp; 

// Función para inicializar el SDK de Mercado Pago de forma segura
async function setupMercadoPago() {
    try {
        // Importación dinámica y obtención del módulo principal
        const mercadopagoModule = await import('mercadopago');
        mp = mercadopagoModule.default || mercadopagoModule; 
        
        const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN; 

        if (!MP_ACCESS_TOKEN) {
            console.error("❌ ERROR: MP_ACCESS_TOKEN no está definido.");
        } else {
            // Inicializar el SDK usando la variable 'mp'
            mp.configure({
                access_token: MP_ACCESS_TOKEN 
            });
            console.log("✅ SDK de Mercado Pago configurado exitosamente.");
        }
    } catch (error) {
        console.error("Error al inicializar el SDK de Mercado Pago:", error);
    }
}

// 1. Llamada a la función de configuración (se ejecuta al iniciar el servidor)
setupMercadoPago();

// Función de validación para usar antes de las llamadas a la API de MP
const checkSDK = (res) => {
    if (!mp) {
        res.status(503).json({ error: "El servicio de pagos no está disponible (SDK no inicializado)." });
        return false;
    }
    return true;
};

// 2. Controlador para crear la preferencia
export const createPreference = async (req, res) => {
    if (!checkSDK(res)) return; // 🌟 Validación del SDK

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
            notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`, 

            auto_return: "approved", 
            external_reference: order_id || `temp-ref-${Date.now()}`
        };

        // 🚨 CAMBIO: Usamos 'mp' en lugar de 'mercadopago'
        const response = await mp.preferences.create(preference);
        
        res.status(200).json({ preferenceId: response.body.id });

    } catch (error) {
        console.error("Error al crear la preferencia de MP:", error);
        res.status(500).json({ error: "No se pudo crear la preferencia de pago." });
    }
};

export const receiveWebhook = async (req, res) => {
    if (!checkSDK(res)) return; // 🌟 Validación del SDK

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
            // 🚨 CAMBIO: Usamos 'mp' en lugar de 'mercadopago'
            const response = await mp.payment.get(resourceId);
            paymentData = response.body;

        } else if (topic === 'merchant_order') {
             return;
        }

        if (paymentData) {
            const status = paymentData.status;
            const externalReference = paymentData.external_reference; 

            console.log(`Pago recibido. ID: ${paymentData.id}, Estado: ${status}, Ref: ${externalReference}`);
            
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
        console.error("Error al procesar webhook de MP:", error);
    }
};