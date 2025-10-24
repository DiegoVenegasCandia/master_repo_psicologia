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

    // target origin for postMessage (configurar en Netlify por seguridad, opcional)
    const targetOrigin = process.env.FRONTEND_RETURN_ORIGIN || '*';

    if (!token) {
      const html = `<!doctype html><html><body><h1>Resultado Webpay</h1><p>No se recibió token_ws.</p><pre>${JSON.stringify(qs,null,2)}</pre></body></html>`;
      return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
    }

    // Función helper para generar HTML que notifica al opener y se cierra
    const buildResultPage = (statusLabel, providerInfo = {}) => {
      const payload = {
        payment: statusLabel,
        token,
        meta,
        provider: providerInfo
      };
      const payloadJsonEscaped = JSON.stringify(payload).replace(/</g, '\\u003c');
      return `<!doctype html><html><head><meta charset="utf-8"><title>Resultado Pago</title></head><body style="font-family:Arial,Helvetica,sans-serif;padding:20px;">
        <h1>${statusLabel === 'success' ? 'Pago completado' : 'Resultado de pago'}</h1>
        <p>Token: <strong>${token}</strong></p>
        <p>Meta: <pre>${JSON.stringify(meta,null,2)}</pre></p>
        <p>Proveedor: <pre>${JSON.stringify(providerInfo,null,2)}</pre></p>
        <p>Si la ventana no se cierra automáticamente, <a id="back" href="/">volver al sitio</a></p>
        <script>
          (function(){
            try {
              var payload = ${payloadJsonEscaped};
              // enviar resultado al opener (frontend) sin navegar la ventana principal
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage(payload, ${JSON.stringify(targetOrigin)});
              }
            } catch(e){ console.warn('postMessage failed', e); }
            // intentamos cerrar la ventana popup después de 1s
            setTimeout(function(){ try{ window.close(); }catch(e){} }, 1000);
          })();
        </script>
      </body></html>`;
    };

    // MOCK: no llamadas externas, sólo mostrar/notify y cerrar
    if (isMock) {
      const html = buildResultPage('success', { mock: true });
      return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
    }

    // LIVE: verificar con proveedor y luego notificar al opener (sin redirigir ventana principal)
    const apiBase = (process.env.WEBPAY_API_URL || '').replace(/\/$/, '');
    const commerce = process.env.WEBPAY_COMMERCE_CODE;
    const apiKey = process.env.WEBPAY_API_KEY;

    if (!apiBase || !commerce || !apiKey) {
      const html = buildResultPage('error', { error: 'Faltan credenciales WEBPAY en el servidor' });
      return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
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

    const statusLabel = resp.ok ? 'success' : 'error';
    const html = buildResultPage(statusLabel, { status: resp.status, data });

    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };

  } catch (err) {
    console.error('webpay-return error', err);
    const html = `<!doctype html><html><body><h1>Error</h1><p>${String(err.message)}</p></body></html>`;
    return { statusCode: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
  }
};