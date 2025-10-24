require('dotenv').config();

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    const payload = JSON.parse(event.body || '{}');
    const amount = Number(payload.amount) || 30000;
    const metadata = payload.metadata || {}; // { nombre, email, fecha, hora }

    const buy_order = `order-${Date.now()}`;
    const session_id = `sess-${Math.random().toString(36).slice(2, 10)}`;

    const apiBase = (process.env.WEBPAY_API_URL || '').trim();
    const commerce = process.env.WEBPAY_COMMERCE_CODE;
    const apiKey = process.env.WEBPAY_API_KEY;
    const baseReturn = process.env.WEBPAY_RETURN_URL;

    // construir return_url incluyendo metadata (URL-encode JSON)
    const metaParam = encodeURIComponent(JSON.stringify(metadata || {}));
    const return_url = (baseReturn || '/.netlify/functions/webpay-return') + (baseReturn && baseReturn.includes('?') ? '&' : '?') + 'meta=' + metaParam;

    const isLive = String(process.env.WEBPAY_LIVE || '').toLowerCase() === 'true';

    if (!isLive) {
      const mockToken = `mock-${Date.now()}`;
      const mockCheckoutUrl = `${return_url}&token_ws=${mockToken}&mock=1`;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 200,
          ok: true,
          data: { mock: true, buy_order, session_id, amount, metadata },
          checkoutUrl: mockCheckoutUrl,
          token: mockToken
        })
      };
    }

    // LIVE: llamar al proveedor con return_url que ya contiene meta
    if (!apiBase || !commerce || !apiKey || !baseReturn) {
      return { statusCode: 500, body: 'Server misconfiguration: missing WEBPAY env vars for LIVE mode' };
    }

    const endpoint = apiBase.replace(/\/$/, '') + '/transactions';
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': commerce,
        'Tbk-Api-Key-Secret': apiKey
      },
      body: JSON.stringify({ buy_order, session_id, amount, return_url })
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

    if (!resp.ok) {
      return { statusCode: 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Bad gateway to payment provider', data }) };
    }

    // Normaliza respuesta para frontend
    const checkoutUrl = data?.url || data?.redirectUrl || data?.initPoint || (data?.body && (data.body.url || data.body.token)) || null;
    const token = data?.token || data?.token_ws || (data?.body && (data.body.token || data.body.token_ws)) || null;

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: resp.status, ok: resp.ok, data, checkoutUrl, token }) };

  } catch (err) {
    console.error('create-webpay error', err);
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};