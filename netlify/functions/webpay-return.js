const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

exports.handler = async function (event) {
  try {
    // Transbank normalmente envía token_ws como query param en la redirección
    const qs = event.queryStringParameters || {};
    const token = qs.token_ws || qs.token || null;

    if (!token) {
      return {
        statusCode: 400,
        body: 'Missing token_ws in querystring'
      };
    }

    const transbankBase = process.env.WEBPAY_API_URL;
    if (!transbankBase) {
      console.error('Missing WEBPAY_API_URL');
      return { statusCode: 500, body: 'Server misconfiguration: WEBPAY_API_URL missing' };
    }
    const verifyUrl = `${transbankBase}/${encodeURIComponent(token)}`;

    // Intentamos commit/verify (PUT o GET según la API; aquí usamos PUT que es el flujo común para commit)
    const resp = await fetch(verifyUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': process.env.WEBPAY_COMMERCE_CODE,
        'Tbk-Api-Key-Secret': process.env.WEBPAY_API_KEY
      }
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

    // En producción: validar data.amount, data.buy_order, data.response_code, etc. y actualizar DB.
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Resultado Webpay</title></head><body>
      <h1>Resultado Webpay (Servidor)</h1>
      <p>Token recibido: ${token}</p>
      <pre>${JSON.stringify(data, null, 2)}</pre>
      <p>NOTA: Implementa validación completa en servidor y actualiza el estado de la orden sólo si la transacción fue aprobada.</p>
    </body></html>`;

    return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: html };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};