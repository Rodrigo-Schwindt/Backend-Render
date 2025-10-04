import mercadopago from 'mercadopago';
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
        currency_id: "ARS" // O la moneda que uses
    }));

    try {
        const preference = {
            items: mp_items,
            
            // Opcional: información del comprador si la tienes
            payer: {
                email: customer.email,
                name: customer.name
            },
            
            // URLs a dónde redirigir al cliente después de la compra
            back_urls: {
                success: "https://clancestreetwear.in/checkout/success", // Tu Front-end, si fuera un redirect
                failure: "https://clancestreetwear.in/checkout/failure",
                pending: "https://clancestreetwear.in/checkout/pending"
            },
            // Una URL para que Mercado Pago notifique a tu Backend del estado del pago
            notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`, // Importante para actualizar el stock

            auto_return: "approved", // Opcional: regresa automáticamente si el pago es aprobado
            external_reference: order_id || 'random-id-para-seguimiento'
        };

        const response = await mercadopago.preferences.create(preference);
        
        // Enviamos el ID de la preferencia al Front-end. El Front-end lo usará para renderizar el Brick.
        res.status(200).json({ preferenceId: response.body.id });

    } catch (error) {
        console.error("Error al crear la preferencia de MP:", error);
        res.status(500).json({ error: "No se pudo crear la preferencia de pago." });
    }
    
};
export const receiveWebhook = async (req, res) => {
    // ⚠️ Mercado Pago espera recibir solo un status 200/204 para confirmar que recibiste la notificación.
    // El proceso de validación y actualización de la DB debe ser asíncrono.
    
    // Lo esencial: responder inmediatamente
    res.status(204).send(); 

    // Obtener la información de la notificación
    const topic = req.query.topic || req.query.type;
    const resourceId = req.query.id || req.query['data.id'];

    if (!topic || !resourceId) {
        // Ignoramos peticiones mal formadas
        return; 
    }

    try {
        let paymentData;

        // Si el topic es 'payment', obtenemos la información del pago
        if (topic === 'payment') {
            const response = await mercadopago.payment.get(resourceId);
            paymentData = response.body;

        } else if (topic === 'merchant_order') {
            // Este topic se usa a veces para pagos en efectivo/cuotas, si lo necesitas
            // const response = await mercadopago.merchant_orders.get(resourceId);
            // paymentData = response.body;
            return; // Por ahora, nos enfocaremos en 'payment'
        }

        if (paymentData) {
            const status = paymentData.status;
            const externalReference = paymentData.external_reference; 

            console.log(`Pago recibido. ID: ${paymentData.id}, Estado: ${status}, Ref: ${externalReference}`);

            // 🌟🌟🌟 LÓGICA CLAVE 🌟🌟🌟
            
            if (status === 'approved') {
                // Lógica: 
                // 1. Buscar el pedido/carrito en tu MySQL usando el externalReference.
                // 2. Actualizar el estado del pedido a 'pagado' en MySQL.
                // 3. Descontar el stock de tus productos.
                // 4. Enviar un correo de confirmación al cliente.
                console.log(`✅ Pago aprobado. Procediendo a actualizar DB y stock para el pedido: ${externalReference}`);
                // await updateOrderStatus(externalReference, 'Aprobado'); // Tu función de DB
                // await updateProductStock(externalReference); // Tu función de DB
                
            } else if (status === 'rejected' || status === 'cancelled') {
                // Lógica: 
                // 1. Marcar el pedido como 'fallido' en MySQL.
                console.log(`❌ Pago rechazado para el pedido: ${externalReference}`);

            } else if (status === 'in_process') {
                 // Lógica: 
                // 1. Marcar el pedido como 'pendiente' en MySQL (ej. pago en efectivo Rapipago/Pago Fácil).
                console.log(`⚠️ Pago en proceso para el pedido: ${externalReference}`);
            }
        }
    } catch (error) {
        console.error("Error al procesar webhook de MP:", error);
    }
};