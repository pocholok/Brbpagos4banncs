const https = require('https');

const token = '8594588884:AAF1ODTlOEYhDIKgILpadiPlcgfCm_aZEAA';

function makeRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
        const url = `https://api.telegram.org/bot${token}/${method}`;
        
        // Convert params to query string if GET (simple implementation)
        // For getUpdates we usually use POST or GET with params. Let's use POST for safety with body.
        
        const data = JSON.stringify(params);
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

async function check() {
    console.log("🔍 Verificando estado del bot...");

    // 1. Check Webhook
    try {
        const webhookInfo = await makeRequest('getWebhookInfo');
        if (webhookInfo.ok && webhookInfo.result.url) {
            console.log(`⚠️ IMPORTANTE: El bot tiene un Webhook activo en: ${webhookInfo.result.url}`);
            console.log("   Esto impide ver los mensajes manualmente.");
            console.log("   Intentando eliminar el webhook...");
            
            const deleteResult = await makeRequest('deleteWebhook');
            if (deleteResult.ok) {
                console.log("   ✅ Webhook eliminado correctamente. Ahora podrás recibir mensajes.");
            } else {
                console.error("   ❌ No se pudo eliminar el webhook.");
            }
        } else {
            console.log("✅ No hay Webhook activo (esto es bueno para lo que queremos hacer).");
        }
    } catch (e) {
        console.error("Error verificando webhook:", e.message);
    }

    // 2. Poll for updates
    console.log("\n📡 Escuchando nuevos mensajes... (Presiona Ctrl+C para salir)");
    console.log("👉 VE AHORA A TU GRUPO Y ESCRIBE: /id o menciona al bot (@TuBot hola)");
    
    setInterval(async () => {
        try {
            const updates = await makeRequest('getUpdates', { offset: -1 });
            if (updates.ok && updates.result.length > 0) {
                const lastMsg = updates.result[updates.result.length - 1];
                const chat = lastMsg.message ? lastMsg.message.chat : (lastMsg.my_chat_member ? lastMsg.my_chat_member.chat : null);
                
                if (chat) {
                    console.log("\n📬 ¡MENSAJE RECIBIDO!");
                    console.log(`   🏷️ Nombre del Grupo/Chat: ${chat.title || chat.first_name}`);
                    console.log(`   🆔 ID DEL CHAT (Copia esto): ${chat.id}`);
                    console.log(`   Tipo: ${chat.type}`);
                    
                    if (chat.type === 'supergroup' || chat.type === 'group') {
                        console.log("\n✨ ¡Listo! Copia el ID de arriba (incluyendo el signo menos si lo tiene).");
                    } else {
                        console.log("\n⚠️ Este parece ser un chat privado, no un grupo. Escribe en el GRUPO.");
                    }
                }
            }
        } catch (e) {
            // Ignorar errores de red momentáneos
        }
    }, 2000);
}

check();
