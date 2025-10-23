const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

exports.handler = async function (event) {
  try {
    console.log('create-webpay invoked', { method: event.httpMethod, envHasCreds: !!process.env.WEBPAY_COMMERCE_CODE });
    console.log('body:', event.body);

    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const body = JSON.parse(event.body || '{}');
    const amount = Number(body.amount) || 30000;
    const buy_order = `order-${Date.now()}`;
    const session_id = `sess-${Math.random().toString(36).slice(2, 10)}`;
    const return_url = process.env.WEBPAY_RETURN_URL || 'https://tu-dominio.netlify.app/webpay-return.html';

    const hasCreds = Boolean(process.env.WEBPAY_COMMERCE_CODE && process.env.WEBPAY_API_KEY);
    const forceSandbox = (process.env.WEBPAY_FORCE_SANDBOX === 'true')
      || String(process.env.WEBPAY_COMMERCE_CODE || '').startsWith('TEST')
      || String(process.env.WEBPAY_API_KEY || '').startsWith('TEST');

    if (!hasCreds || forceSandbox) {
      const sep = return_url.includes('?') ? '&' : '?';
      const mockUrl = `${return_url}${sep}order=${encodeURIComponent(buy_order)}&amount=${amount}&sandbox=1`;
      return {
        statusCode: 200,
        body: JSON.stringify({ url: mockUrl, sandbox: true, buy_order, session_id, amount })
      };
    }

    // Endpoint REST de Webpay (init transaction)
    const transbankApiUrl = process.env.WEBPAY_API_URL;
    if (!transbankApiUrl) {
      console.error('Missing WEBPAY_API_URL');
      return { statusCode: 500, body: 'Server misconfiguration: WEBPAY_API_URL missing' };
    }
    const reqBody = { buy_order, session_id, amount, return_url };

    const resp = await fetch(transbankApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': process.env.WEBPAY_COMMERCE_CODE,
        'Tbk-Api-Key-Secret': process.env.WEBPAY_API_KEY
      },
      body: JSON.stringify(reqBody)
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = null; }

    if (!resp.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Transbank init error', status: resp.status, detail: data || text }) };
    }

    // Respuesta esperada: { token, url } o similar. Adaptar si tu cuenta devuelve token u otra estructura.
    const checkoutUrl = (data && (data.url || (data.token && `https://webpay3gint.transbank.cl/webpayserver/initTransaction?token=${data.token}`))) || null;
    if (!checkoutUrl) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No checkout URL returned', raw: data }) };
    }

    return { statusCode: 200, body: JSON.stringify({ url: checkoutUrl, sandbox: false, raw: data }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};