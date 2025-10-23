require('dotenv').config();

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

exports.handler = async function (event) {
  try {
    console.log('webpay-return invoked', { qs: event.queryStringParameters });
    const qs = event.queryStringParameters || {};
    const token = qs.token_ws || qs.token || null;

    if (!token) {
      const html = `<!doctype html><html><body>
        <h1>Resultado Webpay (Servidor)</h1>
        <p>Missing token_ws in querystring. Query params recibidos:</p>
        <pre>${JSON.stringify(qs, null, 2)}</pre>
      </body></html>`;
      return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: html };
    }

    const apiBase = process.env.WEBPAY_API_URL;
    if (!apiBase || !process.env.WEBPAY_COMMERCE_CODE || !process.env.WEBPAY_API_KEY) {
      const html = `<!doctype html><html><body>
        <h1>Token recibido: ${token}</h1>
        <p>No hay credenciales configuradas para verificar con Transbank.</p>
      </body></html>`;
      return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: html };
    }

    // Verificación/commit: endpoint según API (transactions/{token})
    const verifyUrl = `${apiBase}/transactions/${encodeURIComponent(token)}`;

    const resp = await fetch(verifyUrl, {
      method: 'PUT', // confirma el método en la doc de Transbank; puede ser PUT o POST según la versión
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': process.env.WEBPAY_COMMERCE_CODE,
        'Tbk-Api-Key-Secret': process.env.WEBPAY_API_KEY
      }
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

    const html = `<!doctype html><html><body>
      <h1>Resultado Webpay (Servidor)</h1>
      <p>Token: ${token}</p>
      <pre>${JSON.stringify(data, null, 2)}</pre>
      <p>HTTP status: ${resp.status}</p>
    </body></html>`;

    return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: html };

  } catch (err) {
    console.error('webpay-return error', err);
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};