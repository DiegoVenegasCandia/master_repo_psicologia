require('dotenv').config();

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

exports.handler = async function (event) {
  try {
    console.log('create-webpay invoked', { method: event.httpMethod, envHasCreds: !!process.env.WEBPAY_COMMERCE_CODE });
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const amount = Number(body.amount) || 30000;
    const buy_order = `order-${Date.now()}`;
    const session_id = `sess-${Math.random().toString(36).slice(2, 10)}`;

    // Usar SOLO las env vars (no valores por defecto)
    const return_url = process.env.WEBPAY_RETURN_URL;
    const apiBase = process.env.WEBPAY_API_URL;
    const commerce = process.env.WEBPAY_COMMERCE_CODE;
    const apiKey = process.env.WEBPAY_API_KEY;

    if (!apiBase || !commerce || !apiKey || !return_url) {
      console.error('Missing WEBPAY env vars', { apiBase: !!apiBase, commerce: !!commerce, apiKey: !!apiKey, return_url: !!return_url });
      return { statusCode: 500, body: 'Server misconfiguration: missing WEBPAY env vars' };
    }

    const reqBody = { buy_order, session_id, amount, return_url };

    const resp = await fetch(`${apiBase}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': commerce,
        'Tbk-Api-Key-Secret': apiKey
      },
      body: JSON.stringify(reqBody)
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

    console.log('create-webpay response', { status: resp.status, data });

    return {
      statusCode: resp.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: resp.status, body: data })
    };

  } catch (err) {
    console.error('create-webpay error', err);
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};