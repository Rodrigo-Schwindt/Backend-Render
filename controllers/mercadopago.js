// src/controllers/mercadopago.js

let mpInstance; // 🌟 Usamos esta variable para la instancia configurada
let initializationPromise; 

// Función para inicializar el SDK de Mercado Pago de forma segura
function setupMercadoPago() {
    // 🌟 1. Creamos y almacenamos la promesa
    initializationPromise = (async () => {
        try {
            // Importación dinámica del módulo
            const mercadopagoModule = await import('mercadopago');
            
            // 🚨 CAMBIO CLAVE: Obtener el constructor/clase.
            // La librería de MP exporta la clase principal para ser instanciada.
            const MercadoPago = mercadopagoModule.default || mercadopagoModule;
            
            const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN; 

            if (!MP_ACCESS_TOKEN) {
                console.error("❌ ERROR: MP_ACCESS_TOKEN no está definido.");
            } else {
                // 🚨 CORRECCIÓN: Instanciamos la clase de Mercado Pago
                // La configuración del token se pasa directamente al constructor.
                mpInstance = new MercadoPago({
                    access_token: MP_ACCESS_TOKEN 
                });
                
                console.log("✅ SDK de Mercado Pago configurado exitosamente.");
            }
            // Si el token no existe, mpInstance será 'undefined', que es correcto.
            return mpInstance; 
        } catch (error) {
            console.error("Error al inicializar el SDK de Mercado Pago:", error);
            // Esto asegura que la promesa no se quede pendiente si falla
            throw new Error("Fallo en la inicialización del SDK de MP."); 
        }
    })(); // La ejecutamos inmediatamente
}

// 2. Llamada a la función de configuración (se ejecuta al iniciar el servidor)
setupMercadoPago();

// Función de validación (ahora chequea mpInstance)
const checkSDK = (res) => {
    if (!mpInstance) { // 🌟 Usamos mpInstance
        // En un caso ideal, si llegamos aquí es que falló la inicialización
        res.status(503).json({ error: "El servicio de pagos aún no está disponible." });
        return false;
    }
    return true;
};

// 3. Controlador para crear la preferencia
export const createPreference = async (req, res) => {
    // 🌟 ESPERAMOS la inicialización antes de continuar
    if (initializationPromise) {
        try {
            await initializationPromise;
        } catch (e) {
            // Si la promesa falló (ej. error de importación), enviamos 503
            return res.status(503).json({ error: "El servicio de pagos falló al iniciar." });
        }
    }
    
    if (!checkSDK(res)) return; // 🌟 Validación del SDK de respaldo

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

        // 🚨 CORRECCIÓN: Usamos mpInstance
        const response = await mpInstance.preferences.create(preference);
        
        res.status(200).json({ preferenceId: response.body.id });

    } catch (error) {
        console.error("Error al crear la preferencia de MP:", error);
        res.status(500).json({ error: "No se pudo crear la preferencia de pago." });
    }
};

export const receiveWebhook = async (req, res) => {
    // 🌟 ESPERAMOS la inicialización antes de continuar
    if (initializationPromise) {
        try {
            await initializationPromise;
        } catch (e) {
            return res.status(503).json({ error: "El servicio de pagos falló al iniciar." });
        }
    }
    
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
            // 🚨 CORRECCIÓN: Usamos mpInstance
            const response = await mpInstance.payment.get(resourceId);
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