require('dotenv').config();

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

exports.handler = async function (event) {
  try {
    console.log('create-webpay invoked', { method: event.httpMethod });

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const amount = Number(body.amount) || 30000;
    const buy_order = `order-${Date.now()}`;
    const session_id = `sess-${Math.random().toString(36).slice(2, 10)}`;

    const apiBase = (process.env.WEBPAY_API_URL || '').trim();
    const commerce = process.env.WEBPAY_COMMERCE_CODE;
    const apiKey = process.env.WEBPAY_API_KEY;
    const return_url = process.env.WEBPAY_RETURN_URL;

    console.log('env check', { apiBase: !!apiBase, commerce: !!commerce, apiKey: !!apiKey, return_url: !!return_url });

    // Safety: default MOCK mode unless WEBPAY_LIVE exactly "true"
    const isLive = String(process.env.WEBPAY_LIVE || '').toLowerCase() === 'true';

    if (!isLive) {
      // Mock response to avoid external calls while testing / debugging
      const mockToken = `mock-${Date.now()}`;
      const mockCheckoutUrl = `${return_url}?token_ws=${mockToken}&mock=1`;
      console.log('MOCK MODE: returning fake checkout URL to avoid external call', { mockToken, mockCheckoutUrl });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 200,
          ok: true,
          data: { mock: true, buy_order, session_id, amount, return_url },
          checkoutUrl: mockCheckoutUrl,
          token: mockToken
        })
      };
    }

    // LIVE mode: require credentials
    if (!apiBase || !commerce || !apiKey || !return_url) {
      console.error('Missing WEBPAY env vars for LIVE mode', { apiBase: !!apiBase, commerce: !!commerce, apiKey: !!apiKey, return_url: !!return_url });
      return { statusCode: 500, body: 'Server misconfiguration: missing WEBPAY env vars for LIVE mode' };
    }

    // build endpoint safely (avoid double slashes)
    const endpoint = apiBase.replace(/\/$/, '') + '/transactions';
    console.log('calling Transbank endpoint', endpoint, { buy_order, session_id, amount, return_url });

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

    console.log('create-webpay response', { status: resp.status, ok: resp.ok, data });

    const checkoutUrl = data?.url || data?.redirectUrl || data?.initPoint || (data?.body && (data.body.url || data.body.token)) || null;
    const token = data?.token || data?.token_ws || (data?.body && (data.body.token || data.body.token_ws)) || null;

    const result = { status: resp.status, ok: resp.ok, data, checkoutUrl, token };

    if (!resp.ok) {
      // return detailed info so you can debug without extra calls
      return { statusCode: 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Bad gateway to payment provider', result }) };
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) };

  } catch (err) {
    console.error('create-webpay error', err);
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};