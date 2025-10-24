require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

exports.handler = async function (event) {
  try {
    const qs = event.queryStringParameters || {};
    const token = qs.token_ws || qs.token || null;
    const isMock = qs.mock === '1' || (token && token.startsWith('mock-'));
    const metaRaw = qs.meta || null;
    let meta = null;
    try { meta = metaRaw ? JSON.parse(decodeURIComponent(metaRaw)) : null; } catch (e) { meta = null; }

    console.log('webpay-return invoked', { token, isMock, meta });

    // configurar FRONTEND_RETURN_URL en Netlify: https://tu-sitio.netlify.app
    const frontend = (process.env.FRONTEND_RETURN_URL || '').replace(/\/$/, '');

    // Sin token: mostrar info
    if (!token) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: `<!doctype html><html><body><h1>Resultado Webpay</h1><p>No se recibió token_ws.</p><pre>${JSON.stringify(qs,null,2)}</pre></body></html>`
      };
    }

    // Modo MOCK: no llamar a proveedor; redirigir al frontend con meta si está definido
    if (isMock) {
      if (frontend) {
        const params = new URLSearchParams();
        params.set('payment','success');
        params.set('token', token);
        if (metaRaw) params.set('meta', metaRaw);
        const redirectTo = `${frontend}/?${params.toString()}`;
        console.log('MOCK: redirecting to frontend', redirectTo);
        return { statusCode: 302, headers: { Location: redirectTo }, body: '' };
      }

      // si no hay frontend configurado, mostrar resultado simulado
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;padding:20px;">
          <h1>Pago simulado completado</h1>
          <p>Token (mock): <strong>${token}</strong></p>
          <p>Meta: <pre>${JSON.stringify(meta,null,2)}</pre></p>
          <p><a href="/">Volver al sitio</a></p>
        </body></html>`
      };
    }

    // Modo LIVE: verificar con proveedor y luego redirigir al frontend (si existe)
    const apiBase = (process.env.WEBPAY_API_URL || '').replace(/\/$/, '');
    const commerce = process.env.WEBPAY_COMMERCE_CODE;
    const apiKey = process.env.WEBPAY_API_KEY;

    if (!apiBase || !commerce || !apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: `<!doctype html><html><body><h1>Error de configuración</h1><p>Faltan credenciales WEBPAY en el servidor.</p></body></html>`
      };
    }

    const verifyUrl = `${apiBase}/transactions/${encodeURIComponent(token)}`;
    console.log('Verifying with provider', verifyUrl);

    const resp = await fetch(verifyUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': commerce,
        'Tbk-Api-Key-Secret': apiKey
      }
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

    console.log('Provider verification result', { status: resp.status, ok: resp.ok });

    if (frontend) {
      const params = new URLSearchParams();
      params.set('payment', resp.ok ? 'success' : 'error');
      params.set('token', token);
      if (metaRaw) params.set('meta', metaRaw);
      // opcional: incluir info corta del proveedor
      params.set('provider_status', String(resp.status));
      const redirectTo = `${frontend}/?${params.toString()}`;
      return { statusCode: 302, headers: { Location: redirectTo }, body: '' };
    }

    // Si no hay frontend, mostrar resultado detallado
    const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;padding:20px;">
      <h1>Resultado Webpay (Servidor)</h1>
      <p>Token: <strong>${token}</strong></p>
      <p>HTTP status: ${resp.status}</p>
      <pre>${JSON.stringify(data,null,2)}</pre>
      <p><a href="/">Volver al sitio</a></p>
    </body></html>`;

    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };

  } catch (err) {
    console.error('webpay-return error', err);
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};