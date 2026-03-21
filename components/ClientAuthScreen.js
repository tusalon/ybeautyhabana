// components/ClientAuthScreen.js - VERSIÓN CON SISTEMA DE SOLICITUDES
// Los clientes nuevos deben enviar solicitud y esperar aprobación

function ClientAuthScreen({ onAccessGranted, onGoBack }) {
    const [config, setConfig] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);
    const [imagenCargada, setImagenCargada] = React.useState(false);
    const [nombre, setNombre] = React.useState('');
    const [whatsapp, setWhatsapp] = React.useState('');
    const [error, setError] = React.useState('');
    const [clienteAutorizado, setClienteAutorizado] = React.useState(null);
    const [verificando, setVerificando] = React.useState(false);
    const [esProfesional, setEsProfesional] = React.useState(false);
    const [profesionalInfo, setProfesionalInfo] = React.useState(null);
    const [esAdmin, setEsAdmin] = React.useState(false);
    const [estadoSolicitud, setEstadoSolicitud] = React.useState(null);
    const [solicitudEnviada, setSolicitudEnviada] = React.useState(false);

    // Cargar configuración del negocio y la imagen
    React.useEffect(() => {
        const cargarDatos = async () => {
            const configData = await window.cargarConfiguracionNegocio();
            setConfig(configData);
            setCargando(false);
        };
        cargarDatos();

        // Precargar la imagen de fondo
        const img = new Image();
        img.src = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=2071&auto=format&fit=crop';
        img.onload = () => setImagenCargada(true);
        img.onerror = () => setImagenCargada(true);
    }, []);

    // ============================================
    // FUNCIÓN PARA VERIFICAR NÚMERO (CORREGIDA DEFINITIVA)
    // ============================================
    const verificarNumero = async (numero) => {
        if (numero.length < 8) {
            setClienteAutorizado(null);
            setEsProfesional(false);
            setProfesionalInfo(null);
            setEsAdmin(false);
            setEstadoSolicitud(null);
            setSolicitudEnviada(false);
            setError('');
            return;
        }
        
        setVerificando(true);
        
        const numeroLimpio = numero.replace(/\D/g, '');
        const numeroCompleto = `53${numeroLimpio}`;
        
        try {
            // 🔥 VERIFICAR SI ES ADMIN (DUEÑO) - VERSIÓN CORREGIDA DEFINITIVA
            if (numeroLimpio === config?.telefono?.replace(/\D/g, '')) {
                console.log('👑 Número de administradora detectado');
                
                // 🔥 OBTENER EL NEGOCIO_ID CORRECTO
                const negocioId = window.NEGOCIO_ID_POR_DEFECTO || 
                                  (typeof window.getNegocioId === 'function' ? 
                                   window.getNegocioId() : 
                                   '47666c9b-afa1-4286-a727-0e30f86611af');
                
                // 🔥 LIMPIAR CUALQUIER ID ANTERIOR
                localStorage.removeItem('negocioId');
                localStorage.removeItem('negocioNombre');
                
                // 🔥 GUARDAR EL ID CORRECTO
                localStorage.setItem('negocioId', negocioId);
                localStorage.setItem('negocioNombre', config?.nombre || 'Negocio de Prueba');
                
                console.log('✅ negocioId guardado en localStorage:', negocioId);
                console.log('✅ negocioNombre guardado:', config?.nombre);
                
                // Verificar si ya tiene sesión activa
                const loginTime = localStorage.getItem('adminLoginTime');
                const tieneSesion = loginTime && (Date.now() - parseInt(loginTime)) < 8 * 60 * 60 * 1000;
                
                if (tieneSesion) {
                    console.log('➡️ Redirigiendo a admin.html');
                    window.location.href = 'admin.html';
                } else {
                    console.log('➡️ Redirigiendo a admin-login.html');
                    window.location.href = 'admin-login.html';
                }
                return;
            }
            
            // Verificar si es PROFESIONAL
            if (window.verificarProfesionalPorTelefono) {
                const profesional = await window.verificarProfesionalPorTelefono(numeroLimpio);
                if (profesional) {
                    setEsProfesional(true);
                    setProfesionalInfo(profesional);
                    setEsAdmin(false);
                    setClienteAutorizado(null);
                    setEstadoSolicitud(null);
                    setSolicitudEnviada(false);
                    setVerificando(false);
                    return;
                }
            }
            
            // Verificar si es CLIENTE AUTORIZADO
            const existe = await window.verificarAccesoCliente(numeroCompleto);
            
            if (existe) {
                setClienteAutorizado(existe);
                setEsProfesional(false);
                setEsAdmin(false);
                setEstadoSolicitud(null);
                setSolicitudEnviada(false);
                setError('');
                setVerificando(false);
                return;
            }
            
            // Si no es cliente autorizado, verificar si tiene solicitud pendiente
            if (window.obtenerEstadoSolicitud) {
                const estado = await window.obtenerEstadoSolicitud(numeroLimpio);
                setEstadoSolicitud(estado);
                
                if (estado === 'pendiente') {
                    setSolicitudEnviada(true);
                } else if (estado === 'rechazado') {
                    // Si fue rechazado, se puede volver a solicitar
                    setSolicitudEnviada(false);
                    setEstadoSolicitud(null);
                } else {
                    setSolicitudEnviada(false);
                }
            }
            
            setClienteAutorizado(null);
            setEsProfesional(false);
            setEsAdmin(false);
            setError('');
            
        } catch (err) {
            console.error('Error verificando:', err);
        } finally {
            setVerificando(false);
        }
    };

    // ============================================
    // HANDLE SUBMIT CORREGIDO - CON SISTEMA DE SOLICITUDES
    // ============================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!nombre.trim() || !whatsapp.trim()) {
            setError('Completá todos los campos');
            return;
        }
        
        // Si es admin o profesional, no hacer nada (ya tienen su flujo)
        if (esAdmin || esProfesional) {
            return;
        }
        
        setVerificando(true);
        setError('');
        
        const numeroLimpio = whatsapp.replace(/\D/g, '');
        const numeroCompleto = `53${numeroLimpio}`;
        
        try {
            // 🔥 PASO 1: Verificar si ya es cliente autorizado
            console.log('🔍 Verificando si es cliente autorizado...');
            const autorizado = await window.verificarAccesoCliente(numeroCompleto);
            
            if (autorizado) {
                console.log('✅ Cliente autorizado, acceso directo');
                // Guardar negocioId en localStorage
                const negocioId = window.NEGOCIO_ID_POR_DEFECTO || 
                                  (typeof window.getNegocioId === 'function' ? 
                                   window.getNegocioId() : null);
                if (negocioId) {
                    localStorage.setItem('negocioId', negocioId);
                }
                onAccessGranted(autorizado.nombre, numeroCompleto);
                setVerificando(false);
                return;
            }
            
            // 🔥 PASO 2: Verificar si tiene solicitud pendiente
            console.log('🔍 Verificando estado de solicitud...');
            const estado = await window.obtenerEstadoSolicitud(numeroLimpio);
            
            if (estado === 'pendiente') {
                setError('⚠️ Ya enviaste una solicitud. Estamos procesándola, en breve recibirás respuesta.');
                setVerificando(false);
                return;
            }
            
            // 🔥 PASO 3: Enviar nueva solicitud (borra automáticamente anteriores)
            console.log('📝 Enviando nueva solicitud...');
            const resultado = await window.solicitarRegistroCliente(nombre, numeroLimpio);
            
            if (resultado.success && resultado.yaAutorizado) {
                // Caso raro: ya era autorizado (doble check)
                console.log('✅ Cliente ya autorizado (doble check)');
                onAccessGranted(resultado.cliente.nombre, numeroCompleto);
            } else if (resultado.success) {
                setSolicitudEnviada(true);
                setError('✅ Solicitud enviada correctamente. Recibirás confirmación cuando sea aprobada.');
                setNombre('');
                setWhatsapp('');
                // No redirigir, solo mostrar mensaje de éxito
            } else {
                setError('❌ Error al enviar la solicitud. Intentá más tarde.');
            }
            
        } catch (err) {
            console.error('❌ Error en submit:', err);
            setError('Error en el sistema. Intentá más tarde.');
        } finally {
            setVerificando(false);
        }
    };

    // ============================================
    // ACCESO DIRECTO PARA CLIENTE AUTORIZADO
    // ============================================
    const handleAccesoDirecto = () => {
        if (clienteAutorizado) {
            const numeroLimpio = whatsapp.replace(/\D/g, '');
            const numeroCompleto = `53${numeroLimpio}`;
            
            // 🔥 OBTENER EL ID DESDE CONFIG-NEGOCIO.JS
            const negocioId = window.NEGOCIO_ID_POR_DEFECTO || 
                              (typeof window.getNegocioId === 'function' ? 
                               window.getNegocioId() : 
                               '47666c9b-afa1-4286-a727-0e30f86611af');
            
            localStorage.setItem('negocioId', negocioId);
            
            // También guardar nombre para el header
            if (config) {
                localStorage.setItem('negocioNombre', config.nombre);
            }
            
            console.log('✅ negocioId guardado en localStorage:', negocioId);
            
            onAccessGranted(clienteAutorizado.nombre, numeroCompleto);
        }
    };

    if (cargando || !imagenCargada) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-pink-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    const colorPrimario = config?.color_primario || '#ec4899';
    const nombreNegocio = config?.nombre || 'Mi Salón';
    const sticker = config?.especialidad?.toLowerCase().includes('uñas') ? '💅' : 
                    config?.especialidad?.toLowerCase().includes('pelo') ? '💇‍♀️' : 
                    config?.especialidad?.toLowerCase().includes('belleza') ? '🌸' : '💖';
    const logoUrl = config?.logo_url;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Imagen de fondo */}
            <div className="absolute inset-0 z-0">
                <img 
                    src="https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=2071&auto=format&fit=crop" 
                    alt="Fondo de salón" 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40"></div>
            </div>

            {/* Botón volver */}
            {onGoBack && (
                <button
                    onClick={onGoBack}
                    className="absolute top-4 left-4 z-20 w-10 h-10 bg-pink-500/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors border border-pink-300"
                    title="Volver"
                >
                    <i className="icon-arrow-left text-white text-xl"></i>
                </button>
            )}

            <div className="relative z-10 max-w-md w-full mx-auto">
                <div className="bg-white/20 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-pink-300/50">
                    {/* Logo o sticker */}
                    <div className="text-center mb-6">
                        {logoUrl ? (
                            <img 
                                src={logoUrl} 
                                alt={nombreNegocio} 
                                className="w-20 h-20 object-contain mx-auto rounded-xl ring-4 ring-pink-300/50"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-xl mx-auto flex items-center justify-center bg-pink-500 ring-4 ring-pink-300/50">
                                <span className="text-3xl">{sticker}</span>
                            </div>
                        )}
                        <h1 className="text-3xl font-bold text-white mt-4">{nombreNegocio}</h1>
                        <p className="text-pink-300 mt-1">🌸 Espacio de belleza y cuidado 🌸</p>
                    </div>

                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-center gap-2 bg-pink-500/30 p-3 rounded-lg">
                        <span>💖</span>
                        Ingresá con tu número
                        <span>💖</span>
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Campo de nombre */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-1">
                                Tu nombre completo
                            </label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                className={`w-full px-4 py-3 rounded-lg border border-pink-300/30 bg-white/10 text-white placeholder-pink-200/70 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition ${
                                    esAdmin || esProfesional || solicitudEnviada ? 'opacity-60 cursor-not-allowed' : ''
                                }`}
                                placeholder="Ej: María Pérez"
                                disabled={esAdmin || esProfesional || solicitudEnviada}
                            />
                        </div>

                        {/* Campo de WhatsApp */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-1">
                                Tu WhatsApp
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-pink-300/30 bg-white/10 text-pink-300 text-sm">
                                    +53
                                </span>
                                <input
                                    type="tel"
                                    value={whatsapp}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setWhatsapp(value);
                                        verificarNumero(value);
                                    }}
                                    className={`w-full px-4 py-3 rounded-r-lg border border-pink-300/30 bg-white/10 text-white placeholder-pink-200/70 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition ${
                                        esAdmin || esProfesional || solicitudEnviada ? 'opacity-60 cursor-not-allowed' : ''
                                    }`}
                                    placeholder="51234567"
                                    required
                                    disabled={esAdmin || esProfesional || solicitudEnviada}
                                />
                            </div>
                            <p className="text-xs text-pink-300/70 mt-1">
                                Ingresá tu número de WhatsApp (8 dígitos después del +53)
                            </p>
                        </div>

                        {/* Indicador de verificación */}
                        {verificando && (
                            <div className="text-pink-300 text-sm bg-pink-500/20 p-2 rounded-lg flex items-center gap-2 border border-pink-300/30">
                                <div className="animate-spin h-4 w-4 border-2 border-pink-300 border-t-transparent rounded-full"></div>
                                Verificando...
                            </div>
                        )}

                        {/* Mensajes según el rol detectado */}
                        {esAdmin && !verificando && (
                            <div className="bg-pink-500/30 border border-pink-300/50 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                        A
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-bold text-xl">
                                            ¡Bienvenida Administradora!
                                        </p>
                                        <p className="text-pink-200 text-sm">
                                            Hacé clic en el botón de abajo para acceder al panel.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {esProfesional && profesionalInfo && !verificando && (
                            <div className="bg-pink-500/30 border border-pink-300/50 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                        P
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-bold text-xl">
                                            ¡Hola {profesionalInfo.nombre}!
                                        </p>
                                        <p className="text-pink-200 text-sm">
                                            Hacé clic en el botón de abajo para acceder a tu panel.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Mensaje de solicitud pendiente */}
                        {solicitudEnviada && !verificando && !esAdmin && !esProfesional && (
                            <div className="bg-yellow-500/30 border border-yellow-500/50 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                        ⏳
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-bold text-lg">
                                            ¡Solicitud Enviada!
                                        </p>
                                        <p className="text-yellow-200 text-sm">
                                            Tu solicitud está siendo procesada. En breve recibirás confirmación cuando sea aprobada.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Mensaje de cliente autorizado */}
                        {clienteAutorizado && !verificando && !esAdmin && !esProfesional && (
                            <div className="bg-green-500/30 border border-green-500/30 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                        C
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-green-400 font-bold text-xl">
                                            ¡Hola {clienteAutorizado.nombre}!
                                        </p>
                                        <p className="text-green-400/80 text-sm">
                                            Ya tenés acceso para reservar turnos.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Mensajes de error */}
                        {error && !esAdmin && !esProfesional && !solicitudEnviada && (
                            <div className="text-sm p-3 rounded-lg flex items-start gap-2 bg-red-500/20 text-red-300 border border-red-500/30">
                                <i className="icon-triangle-alert mt-0.5"></i>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="space-y-3 pt-2">
                            {esAdmin && !verificando && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        localStorage.setItem('adminAuth', 'true');
                                        localStorage.setItem('adminUser', 'Administradora');
                                        localStorage.setItem('adminLoginTime', Date.now());
                                        window.location.href = 'admin.html';
                                    }}
                                    className="w-full bg-white text-pink-600 py-4 rounded-xl font-bold hover:bg-pink-50 transition transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg text-lg border-2 border-pink-300"
                                >
                                    <span className="text-xl">⚡</span>
                                    Ingresar como Administradora
                                </button>
                            )}

                            {esProfesional && profesionalInfo && !verificando && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        localStorage.setItem('profesionalAuth', JSON.stringify({
                                            id: profesionalInfo.id,
                                            nombre: profesionalInfo.nombre,
                                            telefono: profesionalInfo.telefono,
                                            nivel: profesionalInfo.nivel || 1
                                        }));
                                        window.location.href = 'admin.html';
                                    }}
                                    className="w-full bg-white text-pink-600 py-4 rounded-xl font-bold hover:bg-pink-50 transition transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg text-lg border-2 border-pink-300"
                                >
                                    <span className="text-xl">✂️</span>
                                    Ingresar como Profesional
                                </button>
                            )}

                            {clienteAutorizado && !verificando && !esAdmin && !esProfesional && (
                                <button
                                    type="button"
                                    onClick={handleAccesoDirecto}
                                    className="w-full bg-white text-pink-600 py-4 rounded-xl font-bold hover:bg-pink-50 transition transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg text-lg border-2 border-pink-300"
                                >
                                    <span className="text-xl">📱</span>
                                    Ingresar como Cliente
                                </button>
                            )}

                            {!clienteAutorizado && !esAdmin && !esProfesional && !solicitudEnviada && !verificando && (
                                <button
                                    type="submit"
                                    disabled={verificando}
                                    className="w-full bg-pink-500 text-white py-4 rounded-xl font-bold hover:bg-pink-600 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-lg border-2 border-pink-300"
                                >
                                    <span className="text-xl">💅</span>
                                    {verificando ? 'Verificando...' : 'Enviar Solicitud de Registro'}
                                    <span className="text-xl">✨</span>
                                </button>
                            )}

                            {solicitudEnviada && !verificando && !esAdmin && !esProfesional && (
                                <div className="text-center text-white/80 text-sm bg-pink-500/20 p-3 rounded-lg">
                                    <p>✅ Solicitud enviada</p>
                                    <p className="text-xs mt-1">Te avisaremos cuando sea aprobada</p>
                                </div>
                            )}
                        </div>
                    </form>

                    {/* Stickers decorativos flotantes */}
                    <div className="absolute -bottom-6 -right-6 text-7xl opacity-20 rotate-12 select-none">💇‍♀️</div>
                    <div className="absolute -top-6 -left-6 text-7xl opacity-20 -rotate-12 select-none">💅</div>
                    <div className="absolute top-1/2 -translate-y-1/2 -right-8 text-5xl opacity-10 select-none">🌸</div>
                </div>
            </div>
        </div>
    );
}