// utils/auth-clients.js - VERSIÓN CON REGISTRO AUTOMÁTICO + SISTEMA DE SOLICITUDES
// AHORA: Los clientes nuevos envían solicitud que debe ser aprobada por admin

console.log('🚀 auth-clients.js CARGADO - MODO SOLICITUDES CON APROBACIÓN');

// Helper para obtener negocio_id
function getNegocioId() {
    if (typeof window.getNegocioIdFromConfig !== 'undefined') {
        return window.getNegocioIdFromConfig();
    }
    return localStorage.getItem('negocioId');
}

// ============================================
// FUNCIONES EXISTENTES (NO MODIFICADAS)
// ============================================

/**
 * Verifica si un cliente existe en la base de datos (AUTORIZADOS)
 * @param {string} whatsapp - Número completo con 53 al inicio
 * @returns {Promise<object|null>} - Datos del cliente o null
 */
window.verificarAccesoCliente = async function(whatsapp) {
    try {
        const negocioId = getNegocioId();
        console.log('🔍 Verificando acceso para:', whatsapp, 'negocio:', negocioId);
        
        // Buscar si ya existe como cliente autorizado
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}&select=*`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            console.error('Error response:', await response.text());
            return null;
        }
        
        const data = await response.json();
        
        // Si existe, devolverlo
        if (data && data.length > 0) {
            console.log('✅ Cliente encontrado:', data[0]);
            return data[0];
        }
        
        console.log('📝 Cliente no encontrado en autorizados');
        return null;
        
    } catch (error) {
        console.error('Error en verificarAccesoCliente:', error);
        return null;
    }
};

/**
 * Crea un nuevo cliente en la base de datos (SOLO PARA ADMIN/APROBACIÓN)
 * @param {string} nombre - Nombre completo del cliente
 * @param {string} whatsapp - Número completo con 53 al inicio
 * @returns {Promise<object|null>} - Datos del cliente creado
 */
window.crearCliente = async function(nombre, whatsapp) {
    try {
        const negocioId = getNegocioId();
        console.log('➕ Creando nuevo cliente:', { nombre, whatsapp, negocio: negocioId });
        
        // PRIMERO: Verificar si ya existe en ESTE negocio
        const checkUrl = `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}&select=*`;
        console.log('🔍 Verificando existencia:', checkUrl);
        
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
            }
        });
        
        if (checkResponse.ok) {
            const existing = await checkResponse.json();
            if (existing && existing.length > 0) {
                console.log('✅ Cliente ya existe en este negocio:', existing[0]);
                return existing[0];
            }
        }
        
        // SEGUNDO: Si no existe, CREARLO
        console.log('📝 Cliente no existe en este negocio, creando...');
        
        const createResponse = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados`,
            {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    negocio_id: negocioId,
                    nombre: nombre,
                    whatsapp: whatsapp,
                    fecha_registro: new Date().toISOString()
                })
            }
        );
        
        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('❌ Error al crear cliente:', {
                status: createResponse.status,
                statusText: createResponse.statusText,
                error: errorText
            });
            
            // Si es 409, puede ser un falso positivo, intentar obtener el cliente de nuevo
            if (createResponse.status === 409) {
                console.log('⚠️ Conflicto 409, intentando recuperar cliente existente...');
                
                const retryResponse = await fetch(checkUrl, {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                });
                
                if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    if (retryData && retryData.length > 0) {
                        console.log('✅ Cliente recuperado después del conflicto:', retryData[0]);
                        return retryData[0];
                    }
                }
            }
            
            return null;
        }
        
        const nuevoCliente = await createResponse.json();
        console.log('✅ Cliente creado exitosamente:', nuevoCliente);
        
        return Array.isArray(nuevoCliente) ? nuevoCliente[0] : nuevoCliente;
        
    } catch (error) {
        console.error('❌ Error en crearCliente:', error);
        return null;
    }
};

/**
 * Actualiza el nombre de un cliente existente
 * @param {string} whatsapp - Número completo con 53 al inicio
 * @param {string} nuevoNombre - Nuevo nombre del cliente
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 */
window.actualizarNombreCliente = async function(whatsapp, nuevoNombre) {
    try {
        const negocioId = getNegocioId();
        console.log('✏️ Actualizando nombre de cliente:', { whatsapp, nuevoNombre, negocio: negocioId });
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ nombre: nuevoNombre })
            }
        );
        
        if (!response.ok) {
            console.error('Error actualizando nombre:', await response.text());
            return false;
        }
        
        console.log('✅ Nombre actualizado correctamente');
        return true;
        
    } catch (error) {
        console.error('Error en actualizarNombreCliente:', error);
        return false;
    }
};

/**
 * Verifica si un número está autorizado (alias para compatibilidad)
 */
window.isClienteAutorizado = async function(whatsapp) {
    const cliente = await window.verificarAccesoCliente(whatsapp);
    return !!cliente;
};

// ============================================
// FUNCIONES PARA EL PANEL DE ADMIN
// ============================================

/**
 * Obtiene todos los clientes registrados (AUTORIZADOS)
 */
window.getClientesRegistrados = async function() {
    try {
        const negocioId = getNegocioId();
        console.log('📋 Obteniendo clientes registrados para negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&order=fecha_registro.desc`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            console.error('Error response:', await response.text());
            return [];
        }
        
        const data = await response.json();
        console.log('✅ Clientes obtenidos:', data.length);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        return [];
    }
};

// Alias para compatibilidad con código existente
window.getClientesAutorizados = window.getClientesRegistrados;

/**
 * Elimina un cliente de la base de datos
 */
window.eliminarCliente = async function(whatsapp) {
    console.log('🗑️ Eliminando cliente:', whatsapp);
    
    try {
        const negocioId = getNegocioId();
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            console.error('Error eliminando:', await response.text());
            return false;
        }
        
        console.log('✅ Cliente eliminado');
        return true;
    } catch (error) {
        console.error('Error eliminando cliente:', error);
        return false;
    }
};

// Alias para compatibilidad
window.eliminarClienteAutorizado = window.eliminarCliente;

// ============================================
// 🆕 NUEVAS FUNCIONES PARA SISTEMA DE SOLICITUDES
// ============================================

/**
 * Verifica si un cliente tiene solicitud pendiente
 * @param {string} whatsapp - Número completo con 53 al inicio
 * @returns {Promise<boolean>}
 */
window.tieneSolicitudPendiente = async function(whatsapp) {
    try {
        const negocioId = getNegocioId();
        console.log('🔍 Verificando solicitud pendiente para:', whatsapp);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/cliente_solicitudes?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}&estado=eq.pendiente&select=id`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!response.ok) return false;
        const data = await response.json();
        return data && data.length > 0;
    } catch (error) {
        console.error('Error verificando solicitud:', error);
        return false;
    }
};

/**
 * Obtiene el estado de la última solicitud de un cliente
 * @param {string} whatsapp - Número completo con 53 al inicio
 * @returns {Promise<string|null>} - 'pendiente', 'aprobado', 'rechazado' o null
 */
window.obtenerEstadoSolicitud = async function(whatsapp) {
    try {
        const negocioId = getNegocioId();
        const numeroCompleto = whatsapp.startsWith('53') ? whatsapp : `53${whatsapp}`;
        
        console.log('🔍 Obteniendo estado de solicitud para:', numeroCompleto);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/cliente_solicitudes?negocio_id=eq.${negocioId}&whatsapp=eq.${numeroCompleto}&order=fecha_solicitud.desc&limit=1&select=estado`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!response.ok) return null;
        const data = await response.json();
        
        if (data && data.length > 0) {
            return data[0].estado;
        }
        return null;
        
    } catch (error) {
        console.error('Error obteniendo estado:', error);
        return null;
    }
};

/**
 * Envía solicitud de registro (borra TODAS las anteriores automáticamente)
 * @param {string} nombre - Nombre del cliente
 * @param {string} whatsapp - Número SIN +53 (ej: 55002272)
 * @returns {Promise<object>} - Resultado de la operación
 */
window.solicitarRegistroCliente = async function(nombre, whatsapp) {
    try {
        const negocioId = getNegocioId();
        const numeroLimpio = whatsapp.replace(/\D/g, '');
        const numeroCompleto = `53${numeroLimpio}`;
        
        console.log('📝 Procesando solicitud para:', nombre, numeroCompleto);
        
        // PASO 1: Verificar si ya es cliente autorizado
        const clienteExistente = await window.verificarAccesoCliente(numeroCompleto);
        if (clienteExistente) {
            console.log('✅ Ya es cliente autorizado, acceso directo');
            return { success: true, yaAutorizado: true, cliente: clienteExistente };
        }
        
        // PASO 2: Buscar y ELIMINAR TODAS las solicitudes anteriores (de cualquier estado)
        const buscarResponse = await fetch(
            `${window.SUPABASE_URL}/rest/v1/cliente_solicitudes?negocio_id=eq.${negocioId}&whatsapp=eq.${numeroCompleto}&select=id`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        
        const existentes = await buscarResponse.json();
        
        if (existentes && existentes.length > 0) {
            console.log(`🗑️ Eliminando ${existentes.length} solicitud(es) anterior(es)`);
            for (const solicitud of existentes) {
                await fetch(
                    `${window.SUPABASE_URL}/rest/v1/cliente_solicitudes?negocio_id=eq.${negocioId}&id=eq.${solicitud.id}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'apikey': window.SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                        }
                    }
                );
            }
        }
        
        // PASO 3: Crear nueva solicitud pendiente
        const nuevaSolicitud = {
            negocio_id: negocioId,
            nombre: nombre,
            whatsapp: numeroCompleto,
            estado: 'pendiente',
            fecha_solicitud: new Date().toISOString(),
            dispositivo_info: navigator.userAgent || 'desconocido'
        };
        
        console.log('📤 Creando nueva solicitud:', nuevaSolicitud);
        
        const crearResponse = await fetch(
            `${window.SUPABASE_URL}/rest/v1/cliente_solicitudes`,
            {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(nuevaSolicitud)
            }
        );
        
        if (!crearResponse.ok) {
            const errorText = await crearResponse.text();
            console.error('❌ Error al crear solicitud:', errorText);
            throw new Error('Error al crear solicitud');
        }
        
        const solicitudCreada = await crearResponse.json();
        console.log('✅ Solicitud creada:', solicitudCreada);
        
        // PASO 4: NOTIFICAR AL ADMIN (WhatsApp + Push)
        const configNegocio = await window.cargarConfiguracionNegocio();
        const telefonoAdmin = configNegocio?.telefono || '00000000';
        
        const fechaFormateada = new Date().toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const mensajeWhatsApp = 
`🆕 *NUEVA SOLICITUD DE REGISTRO*

👤 *Nombre:* ${nombre}
📱 *WhatsApp:* +${numeroCompleto}
🏢 *Negocio:* ${configNegocio?.nombre || 'Mi Negocio'}
📅 *Fecha:* ${fechaFormateada}

✅ Ingresá al panel para aprobar o rechazar
🔗 ${window.location.origin}/acrika-nails/admin.html`;

        // Enviar WhatsApp al admin
        if (window.enviarWhatsApp) {
            window.enviarWhatsApp(telefonoAdmin, mensajeWhatsApp);
        } else {
            console.warn('⚠️ window.enviarWhatsApp no disponible');
        }
        
        // Enviar push notification
        if (window.enviarNotificacionPush) {
            await window.enviarNotificacionPush(
                `🆕 Nueva solicitud - ${nombre}`,
                `👤 Cliente: ${nombre}\n📱 WhatsApp: +${numeroCompleto}\n🏢 ${configNegocio?.nombre || 'Mi Negocio'}`,
                '👤',
                'high'
            );
        }
        
        console.log('✅ Solicitud enviada y admin notificado');
        return { success: true, yaAutorizado: false, solicitud: solicitudCreada[0] };
        
    } catch (error) {
        console.error('❌ Error en solicitarRegistroCliente:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Obtiene todas las solicitudes pendientes (para admin)
 * @returns {Promise<array>}
 */
window.getSolicitudesPendientes = async function() {
    try {
        const negocioId = getNegocioId();
        console.log('📋 Obteniendo solicitudes pendientes para negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/cliente_solicitudes?negocio_id=eq.${negocioId}&estado=eq.pendiente&order=fecha_solicitud.desc`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error obteniendo solicitudes:', error);
        return [];
    }
};

/**
 * Aprueba una solicitud de cliente (crea el cliente y actualiza estado)
 * @param {object} solicitud - Objeto de la solicitud
 * @returns {Promise<boolean>}
 */
window.aprobarSolicitudCliente = async function(solicitud) {
    try {
        const negocioId = getNegocioId();
        console.log(`✅ Aprobando solicitud de ${solicitud.nombre}`);
        
        // 1. Insertar en clientes_autorizados
        const nuevoCliente = {
            negocio_id: negocioId,
            nombre: solicitud.nombre,
            whatsapp: solicitud.whatsapp,
            fecha_aprobacion: new Date().toISOString(),
            fecha_registro: new Date().toISOString()
        };
        
        const insertResponse = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados`,
            {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(nuevoCliente)
            }
        );
        
        if (!insertResponse.ok) {
            const error = await insertResponse.text();
            console.error('Error al insertar cliente:', error);
            return false;
        }
        
        // 2. Actualizar estado de la solicitud a 'aprobado'
        const updateResponse = await fetch(
            `${window.SUPABASE_URL}/rest/v1/cliente_solicitudes?negocio_id=eq.${negocioId}&id=eq.${solicitud.id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: 'aprobado' })
            }
        );
        
        if (!updateResponse.ok) {
            console.error('Error actualizando estado:', await updateResponse.text());
        }
        
        // 3. Enviar WhatsApp de confirmación al cliente
        const configNegocio = await window.cargarConfiguracionNegocio();
        const nombreNegocio = configNegocio?.nombre || 'nuestro salón';
        
        const mensajeCliente = 
`✅ *¡FELICITACIONES!* Tu solicitud fue APROBADA.

Ya podés reservar turnos en *${nombreNegocio}*.

📱 Ingresá con tu número: ${solicitud.whatsapp}

¡Te esperamos! 💖`;

        if (window.enviarWhatsApp) {
            window.enviarWhatsApp(solicitud.whatsapp, mensajeCliente);
        }
        
        console.log('✅ Solicitud aprobada');
        return true;
        
    } catch (error) {
        console.error('Error aprobando solicitud:', error);
        return false;
    }
};

/**
 * Rechaza una solicitud de cliente (NO envía notificación)
 * @param {object} solicitud - Objeto de la solicitud
 * @returns {Promise<boolean>}
 */
window.rechazarSolicitudCliente = async function(solicitud) {
    try {
        const negocioId = getNegocioId();
        console.log(`❌ Rechazando solicitud de ${solicitud.nombre}`);
        
        // SOLO actualizar estado a 'rechazado' - NO enviar WhatsApp
        const updateResponse = await fetch(
            `${window.SUPABASE_URL}/rest/v1/cliente_solicitudes?negocio_id=eq.${negocioId}&id=eq.${solicitud.id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: 'rechazado' })
            }
        );
        
        if (!updateResponse.ok) {
            console.error('Error actualizando estado:', await updateResponse.text());
            return false;
        }
        
        console.log('✅ Solicitud rechazada (sin notificar)');
        return true;
        
    } catch (error) {
        console.error('Error rechazando solicitud:', error);
        return false;
    }
};

console.log('✅ auth-clients.js inicializado - MODO SOLICITUDES CON APROBACIÓN');