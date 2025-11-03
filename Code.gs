// Apps Script (Code.gs)

function isExpiredPending(ev, nowIso) {
  const priv = ev.extendedProperties && ev.extendedProperties.private || {};
  return priv.pending === '1' && priv.pendingUntil && priv.pendingUntil < nowIso;
}

function listEventsRaw(calId, timeMinIso, timeMaxIso) {
  // Requires Advanced Calendar service enabled (Calendar)
  return Calendar.Events.list(calId, {
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    singleEvents: true,
    showDeleted: false,
    maxResults: 2500
  }).items || [];
}

function htmlMsg(s){ return HtmlService.createHtmlOutput('<div style="font:16px/1.4 system-ui;padding:24px">'+s+'</div>'); }

/**
 * safeRemoveEvent: intenta eliminar un evento usando Advanced API (remove) y
 * si falla usa CalendarApp fallback.
 */
function safeRemoveEvent(calId, eventId, optSendUpdates) {
  try {
    if (typeof Calendar !== 'undefined' && Calendar.Events && typeof Calendar.Events.remove === 'function') {
      Calendar.Events.remove(calId, eventId, (optSendUpdates ? { sendUpdates: optSendUpdates } : {}));
      return true;
    }
  } catch (e) {
    console.warn('safeRemoveEvent: Advanced API remove failed', String(e));
  }
  try {
    if (typeof CalendarApp !== 'undefined' && CalendarApp.getCalendarById) {
      const cal = CalendarApp.getCalendarById(calId);
      if (cal) {
        const ev = cal.getEventById(eventId);
        if (ev && typeof ev.deleteEvent === 'function') {
          ev.deleteEvent();
          return true;
        }
      }
    }
  } catch (e2) {
    console.warn('safeRemoveEvent: CalendarApp fallback failed', String(e2));
  }
  throw new Error('Could not remove event with id=' + eventId);
}

function doPost(e) {
  const out = (o) => ContentService
    .createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
  try {
    const props  = PropertiesService.getScriptProperties();
    const CAL_ID = props.getProperty('CALENDAR_ID') || 'primary';
    const SECRET = props.getProperty('SECRET') || '';
    const WEBAPP_URL = props.getProperty('WEBAPP_URL') || '';
    const TTL_HOURS  = Number(props.getProperty('PENDING_TTL_HOURS') || 48);
    const MARGIN_MIN = Number(props.getProperty('PENDING_MARGIN_MIN') || 5);

    const p = e?.parameter || {};
    if (p.secret !== SECRET) return out({ ok:false, error:'forbidden' });

    const tz = Session.getScriptTimeZone();
    const start = new Date(+new Date(+p.y, p.mo-1, p.d, p.hh, p.mm, 0, 0));
    const end   = new Date(start.getTime() + (Number(p.duration||45) * 60000));

    // limpieza perezosa: eliminar holds vencidos usando helper seguro
    const nowIso = new Date().toISOString();
    const overl = listEventsRaw(CAL_ID, start.toISOString(), end.toISOString());
    for (const ev of overl) {
      if (isExpiredPending(ev, nowIso)) {
        try {
          safeRemoveEvent(CAL_ID, ev.id, 'all');
        } catch (err) {
          // mantener comportamiento previo (silenciar errores), pero loguear para debugging
          console.warn('doPost: safeRemoveEvent failed for expired pending event', ev.id, String(err));
        }
      }
    }

    // conflictos reales
    const conflicts = listEventsRaw(CAL_ID, start.toISOString(), end.toISOString()).filter(ev => !isExpiredPending(ev, nowIso));
    if (conflicts.length) return out({ ok:false, conflict:true, conflictCount:conflicts.length });

    // --- NUEVO: verificar máximo diario ---
    const MAX_DAILY = Number(props.getProperty('MAX_DAILY_BOOKINGS') || 5);
    const dayStartIso = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0,0,0,0).toISOString();
    const dayEndIso   = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23,59,59,999).toISOString();
    const dayEvents = listEventsRaw(CAL_ID, dayStartIso, dayEndIso).filter(ev => !isExpiredPending(ev, nowIso));
    if (dayEvents.length >= MAX_DAILY) {
      return out({ ok:false, error:'max_daily_exceeded', limit: MAX_DAILY });
    }

    // crear pendiente + token
    const pendingUntil = new Date(Math.min(Date.now() + TTL_HOURS*3600000, start.getTime() - MARGIN_MIN*60000)).toISOString();
    const motivo = (p.motivo || p.mot || '').toString().trim();
    const edad   = (p.edad || p.ed || '').toString().trim();
    const apellido = (p.apellido || p.ape || '').toString().trim();
    const telefono = (p.telefono || p.tel || '').toString().trim();
    const desc = (p.description || '') + (p.email ? '\nEmail (contacto): ' + p.email : '');
    const invitee = (p.email || '').toString().trim();
    const token = Utilities.getUuid();

    const attendees = invitee ? [{ email: invitee, responseStatus: 'needsAction' }] : [];
    const evBody = {
      summary: p.title || 'Sesión Psicológica',
      description: desc,
      start: { dateTime: start.toISOString(), timeZone: tz },
      end:   { dateTime: end.toISOString(),   timeZone: tz },
      attendees,
      transparency: 'opaque',
      extendedProperties: { private: {
        pending: '1',
        pendingUntil,
        motivo, edad, telefono, apellido,
        invitee,
        token
      }},
      conferenceData: { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } }
    };

    const created = Calendar.Events.insert(evBody, CAL_ID, { sendUpdates: attendees.length ? 'all' : 'none', conferenceDataVersion: 1 });

    const confirmUrl = WEBAPP_URL ? `${WEBAPP_URL}?action=confirm&calId=${encodeURIComponent(CAL_ID)}&id=${encodeURIComponent(created.id)}&token=${encodeURIComponent(token)}` : '';
    const cancelUrl  = WEBAPP_URL ? `${WEBAPP_URL}?action=cancel&calId=${encodeURIComponent(CAL_ID)}&id=${encodeURIComponent(created.id)}&token=${encodeURIComponent(token)}`  : '';

    return out({
      ok:true,
      id: created.id,
      startISO: created.start?.dateTime,
      endISO: created.end?.dateTime,
      openUrl: created.htmlLink || '',
      editUrl: `https://calendar.google.com/calendar/r/eventedit/${created.id}?cid=${encodeURIComponent(CAL_ID)}`,
      confirmUrl, cancelUrl
    });
  } catch (err) {
    return out({ ok:false, error: String(err) });
  }
}

/* HOTFIX: mapear Calendar.Events.delete -> Calendar.Events.remove si existe remove */
try {
  if (typeof Calendar !== 'undefined' && Calendar.Events) {
    if (typeof Calendar.Events.delete !== 'function' && typeof Calendar.Events.remove === 'function') {
      Calendar.Events.delete = function(calId, eventId, opts) {
        return Calendar.Events.remove(calId, eventId, opts);
      };
    }
  }
} catch (e) {
  // silencioso
}

// Listado del día: soporta endpoints antiguos (y,mo,d) y nuevo (?fecha=YYYY-MM-DD), y cancel action
function doGet(e){
  function out(obj) {
    return ContentService
      .createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);
  }
  try {
    const p = e?.parameter || {};
    const props  = PropertiesService.getScriptProperties();
    const CAL_ID = p.calId || props.getProperty('CALENDAR_ID') || 'primary';
    const WEBAPP_URL = props.getProperty('WEBAPP_URL') || '';
    // URL pública del sitio (página index) — configúrala en Project Properties como SITE_URL
    const SITE_URL = props.getProperty('SITE_URL') || ''; 

    // HANDLE CONFIRM ACTION
    if (p.action === 'confirm') {
      const id = p.id || '';
      const token = p.token || '';
      if (!id || !token) {
        if (p.format === 'json') return out({ ok:false, error: 'missing_params' });
        return htmlMsg('<h1>Error</h1><p>Faltan parámetros para confirmar la reserva.</p>');
      }
      try {
        const ev = Calendar.Events.get(CAL_ID, id);
        const priv = (ev && ev.extendedProperties && ev.extendedProperties.private) ? ev.extendedProperties.private : {};
        if (priv.token !== token) {
          if (p.format === 'json') return out({ ok:false, error:'invalid_token' });
          return htmlMsg('<h1>Token inválido</h1><p>No se pudo validar el token para confirmar la reserva.</p>');
        }

        // Intentar marcar como confirmada: poner pending = '0' (o eliminar la marca)
        try {
          const newPriv = Object.assign({}, priv, { pending: '0' });
          const patchBody = { extendedProperties: { private: newPriv } };
          // usar Advanced API patch
          const patched = Calendar.Events.patch(patchBody, CAL_ID, id);
          if (p.format === 'json' || p.callback) return out({ ok:true, patched: !!patched });
          // Confirm result: mostrar HTML estático SIN redirección automática
          const html = `
            <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:28px;max-width:680px;margin:40px auto;text-align:center">
              <h1 style="color:#1aa6b7;margin-bottom:8px">Reserva confirmada</h1>
              <p style="color:#333;margin-bottom:18px">La cita ha sido confirmada correctamente.</p>
              ${SITE_URL ? `<p><a id="back-link" href="${SITE_URL}" style="color:#1aa6b7;text-decoration:none;font-weight:600" rel="noopener">Volver al sitio</a></p>` : (WEBAPP_URL ? `<p><a id="back-link" href="${WEBAPP_URL}" style="color:#1aa6b7;text-decoration:none;font-weight:600" rel="noopener">Volver al sitio</a></p>` : '')}
            </div>`;
          return HtmlService.createHtmlOutput(html).setTitle('Reserva confirmada');
        } catch (remErr) {
          if (p.format === 'json' || p.callback) return out({ ok:false, error: 'confirm_failed: ' + String(remErr) });
          return htmlMsg('<h1>Error</h1><p>No se pudo confirmar la reserva: ' + String(remErr) + '</p>');
        }
      } catch (err) {
        if (p.format === 'json' || p.callback) return out({ ok:false, error: 'Calendar.Events.get failed. ' + String(err) });
        return htmlMsg('<h1>Error</h1><p>No se pudo recuperar la reserva. Asegura que la Calendar API avanzada esté habilitada.</p>');
      }
    }

    // HANDLE CANCEL ACTION (called from email cancel_url ?action=cancel&id=...&token=...)
    if (p.action === 'cancel') {
      const id = p.id || '';
      const token = p.token || '';
      if (!id || !token) {
        if (p.format === 'json') return out({ ok:false, error: 'missing_params' });
        return htmlMsg('<h1>Error</h1><p>Faltan parámetros.</p>');
      }
      try {
        const ev = Calendar.Events.get(CAL_ID, id);
        const priv = (ev && ev.extendedProperties && ev.extendedProperties.private) ? ev.extendedProperties.private : {};
        if (priv.token !== token) {
          if (p.format === 'json') return out({ ok:false, error:'invalid_token' });
          return htmlMsg('<h1>Token inválido</h1><p>No se pudo validar el token para cancelar la reserva.</p>');
        }

        try {
          safeRemoveEvent(CAL_ID, id, 'all');
          if (p.format === 'json' || p.callback) return out({ ok:true });
          // Cancel result: mostrar HTML estático SIN redirección automática
          const html = `
            <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:28px;max-width:680px;margin:40px auto;text-align:center">
              <h1 style="color:#1aa6b7;margin-bottom:8px">Reserva cancelada</h1>
              <p style="color:#333;margin-bottom:18px">La cita ha sido eliminada correctamente del calendario.</p>
              ${SITE_URL ? `<p><a id="back-link" href="${SITE_URL}" style="color:#1aa6b7;text-decoration:none;font-weight:600" rel="noopener">Volver al sitio</a></p>` : (WEBAPP_URL ? `<p><a id="back-link" href="${WEBAPP_URL}" style="color:#1aa6b7;text-decoration:none;font-weight:600" rel="noopener">Volver al sitio</a></p>` : '')}
            </div>`;
          return HtmlService.createHtmlOutput(html).setTitle('Reserva cancelada');
        } catch (remErr) {
          if (p.format === 'json' || p.callback) return out({ ok:false, error: 'remove_failed: ' + String(remErr) });
          return htmlMsg('<h1>Error al cancelar</h1><p>No se pudo eliminar la reserva: ' + String(remErr) + '</p>');
        }
      } catch (err) {
        if (p.format === 'json' || p.callback) return out({ ok:false, error: 'Calendar.Events.get failed. ' + String(err) });
        return htmlMsg('<h1>Error</h1><p>No se pudo recuperar la reserva. Asegura que la Calendar API avanzada esté habilitada.</p>');
      }
    }

    // Old list endpoint: ?list=1&y=...&mo=...&d=...
    if (p.list === '1' && p.y && p.mo && p.d) {
      const y = Number(p.y), m = Number(p.mo), d = Number(p.d);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end   = new Date(y, m - 1, d, 23, 59, 59, 999);
      const nowIso = new Date().toISOString();
      const items = listEventsRaw(CAL_ID, start.toISOString(), end.toISOString())
        .filter(ev => !isExpiredPending(ev, nowIso))
        .map(ev => ({
          id: ev.id,
          start: ev.start?.dateTime || ev.start?.date,
          end:   ev.end?.dateTime   || ev.end?.date
        }));
      return out(items);
    }

    // New fecha endpoint: ?fecha=YYYY-MM-DD (supports JSONP via callback)
    if (p.fecha) {
      const [y, m, d] = p.fecha.split('-').map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end   = new Date(y, m - 1, d, 23, 59, 59, 999);
      const nowIso = new Date().toISOString();

      const items = listEventsRaw(CAL_ID, start.toISOString(), end.toISOString())
        .filter(ev => !isExpiredPending(ev, nowIso))
        .map(ev => ({
          id: ev.id,
          start: ev.start?.dateTime || ev.start?.date,
          end:   ev.end?.dateTime   || ev.end?.date
        }));

      if (p.callback && typeof p.callback === 'string') {
        const body = `${p.callback}(${JSON.stringify(items)});`;
        return ContentService
          .createTextOutput(body)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return out(items);
    }

    return out({ ok:false, error:'forbidden' });
  } catch (err) {
    return out({ ok:false, error:String(err) });
  }
}

// Manejar preflight CORS (OPTIONS)
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}