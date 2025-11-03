document.addEventListener('DOMContentLoaded', function () {
  // ===== FORM + AGENDA (Google Apps Script) =====
  try {
    const form = document.getElementById('form-cita');
    if (!form) {
      // nothing to do
      return;
    }

    // form elements
    const nombre = document.getElementById('nombre');
    const email = document.getElementById('email');
    const fecha = document.getElementById('fecha');
    const hora = document.getElementById('hora');
    const reservar = document.getElementById('btn-reservar');
    const spinner = document.getElementById('btn-spinner');
    const confirmEl = document.getElementById('confirmacion');
    const edad = document.getElementById('edad');
    const motivo = document.getElementById('motivo');

    // CSS específico para que la fecha solo muestre borde rojo (sin insertar icono extra)
    (function injectDateErrorStyle(){
      if (document.getElementById('agendar-date-error-style')) return;
      const st = document.createElement('style');
      st.id = 'agendar-date-error-style';
      st.textContent = `
/* aplicar borde rojo solo al altInput de flatpickr */
.flatpickr-input.altInput.is-invalid,
.flatpickr-input[altinput].is-invalid {
  border-color: #d9534f !important;
  box-shadow: none !important;
  padding-right: 48px !important; /* dejar espacio al calendario */
}

/* mensaje de error (texto) estándar */
.input-error { color: #d9534f; margin-top:6px; font-size:0.92rem; }
`;
      document.head.appendChild(st);
    })();

    // Live validation: limpiar errores al ingresar datos
    // Real-time validation (debounced for heavy ops)
    const debounce = (fn, ms = 200) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };
    if (nombre) {
      nombre.addEventListener('input', () => { validarNombre(); updateButton(); });
      // validar también al salir sin contenido
      nombre.addEventListener('blur', () => { validarNombre(); updateButton(); });
    }
    if (email) {
      email.addEventListener('input', () => { validarEmail(); updateButton(); });
      email.addEventListener('blur', () => { validarEmail(); updateButton(); });
    }
    if (fecha) fecha.addEventListener('change', debounce(async () => { validarFecha(); try { await refreshHorasDisponibles(); } catch (_) { } updateButton(); }, 250));
    if (hora) hora.addEventListener('input', () => { validarHora(); updateButton(); });
    if (edad) edad.addEventListener('input', () => { validarEdad(); updateButton(); });
    if (motivo) motivo.addEventListener('change', () => { validarMotivo(); updateButton(); });

    // === CONFIG (generado desde parámetros de Google Calendar) ===
    // Asegúrate de que GAS_URL y GAS_SECRET estén definidos correctamente
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbwUp1hrxkQcTu-7e7c6Ay3zG8nHUdNSyc9tR6ErT_qujXlRdRJWIPuwSvxjPwISYwzr/exec';
    const GAS_SECRET = 'b4e3a8d1-5f5a-4e3c-93f7-9f3a2f1b8d6a';

    // Parametros provenientes de la configuración de Google Calendar (rellena/ajusta abajo)
    const GOOGLE_CALENDAR_PARAMS = {
      timezone: 'America/Santiago',
      durationMin: 45,
      intervalMin: 90, // <-- prueba 90 en vez de 45
      leadTimeMin: 60,
      maxAdvanceDays: 14,
      availability: {
        0: [], // domingo
        1: [{ start: '09:00', end: '21:00' }], // lunes
        2: [{ start: '09:00', end: '21:00' }],
        3: [{ start: '09:00', end: '21:00' }],
        4: [{ start: '09:00', end: '21:00' }],
        5: [{ start: '09:00', end: '21:00' }],
        6: [{ start: '12:00', end: '21:00' }] // sábado
      },
      usarFreeBusy: true
    };

    // mapear a constantes usadas por el resto del script
    const SLOT_DURATION_MIN = Number(GOOGLE_CALENDAR_PARAMS.durationMin) || 45;
    const SLOT_INTERVAL_MIN = Number(GOOGLE_CALENDAR_PARAMS.intervalMin) || SLOT_DURATION_MIN;
    const MIN_LEAD_MIN = Number(GOOGLE_CALENDAR_PARAMS.leadTimeMin) || 60;
    const MIN_LEAD_MS = MIN_LEAD_MIN * 60 * 1000;
    const MAX_ADVANCE_DAYS = Number(GOOGLE_CALENDAR_PARAMS.maxAdvanceDays) || 14;

    // construir WORKING_HOURS desde availability (asegura formato correcto)
    const WORKING_HOURS = (function buildWorkingHours(src) {
      const out = {};
      for (let i = 0; i < 7; i++) {
        const v = src?.[String(i)] ?? src?.[i] ?? [];
        out[i] = Array.isArray(v) ? v.map(r => ({ start: r.start, end: r.end })) : [];
      }
      return out;
    })(GOOGLE_CALENDAR_PARAMS.availability || {});

    // DEBUG flags (definidas dentro del scope DOMContentLoaded)
    // Úsalas solo para pruebas locales; dejar en false en producción.
    const DEBUG_SKIP_BUSY_FILTER_FOR_SAT = false; // si true, ignora busy filter en sábados (para comparar)
    const DEBUG_BYPASS_LEADTIME_FOR_TODAY = false; // si true, permite slots hoy saltándose lead time

    // util tiempo
    function hhmmToMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
    function minutesToHHMM(min) { const h = Math.floor(min / 60); const m = min % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }

    // Genera los posibles inicios de cita para una fecha, respetando horario de trabajo y spacing
    function generateDaySlots(dateObj) {
      if (!dateObj) return [];
      const dow = dateObj.getDay();
      const ranges = WORKING_HOURS[dow] || [];
      const slots = [];
      for (const r of ranges) {
        const startMin = hhmmToMinutes(r.start);
        const endMin = hhmmToMinutes(r.end);
        // último inicio permitido = endMin - SLOT_DURATION_MIN (para que la cita quepa)
        const lastStart = endMin - SLOT_DURATION_MIN;
        // anclar al inicio del rango usando Math.ceil para evitar offsets
        let first = Math.ceil(startMin / SLOT_INTERVAL_MIN) * SLOT_INTERVAL_MIN;
        for (let t = first; t <= lastStart; t += SLOT_INTERVAL_MIN) {
          slots.push(minutesToHHMM(t));
        }
      }
      // debug: mostrar qué slots generamos para la fecha (útil para comparar con Google)
      try {
        console.debug('generateDaySlots', {
          date: dateObj.toDateString(),
          dow,
          ranges,
          SLOT_DURATION_MIN,
          SLOT_INTERVAL_MIN,
          slotsSample: slots.slice(0, 20),
          total: slots.length
        });
      } catch (e) { }
      return slots;
    }

    // cache/dedupe
    const EVENTS_TTL_MS = 120000;
    const eventsCache = new Map();
    const inflightByKey = new Map();
    let refreshSeq = 0;
    const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // util: fetch con timeout
    function fetchWithTimeout(url, opts = {}, timeoutMs = 6000) {
      const controller = new AbortController();
      const signal = controller.signal;
      const finalOpts = Object.assign({}, opts, { signal });
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      return fetch(url, finalOpts).finally(() => clearTimeout(timer));
    }

    // listar eventos del día (compatible con implementación previa)
    async function listarEventosDelDia(dateInput) {
      if (!dateInput) return [];
      // normalizar entrada a Date
      let dateObj = dateInput;
      if (typeof dateObj === 'string') {
        const s = dateObj.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) dateObj = new Date(s + 'T00:00:00');
        else dateObj = new Date(s);
      }
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return [];

      const y = dateObj.getFullYear();
      const mo = dateObj.getMonth() + 1;
      const d = dateObj.getDate();
      const key = dateKey(dateObj);

      if (inflightByKey.has(key)) return inflightByKey.get(key);

      const urlOld = `${GAS_URL}?list=1&secret=${encodeURIComponent(GAS_SECRET)}&y=${y}&mo=${mo}&d=${d}`;
      const fechaStr = `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const urlFecha = `${GAS_URL}${GAS_URL.includes('?') ? '&' : '?'}fecha=${encodeURIComponent(fechaStr)}&secret=${encodeURIComponent(GAS_SECRET)}`;

      // JSONP fallback helper (only used for fecha endpoint)
      function jsonpFetch(u, timeoutMs = 7000) {
        return new Promise((resolve, reject) => {
          const cb = 'jsonp_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
          const sep = u.includes('?') ? '&' : '?';
          const src = `${u}${sep}callback=${cb}`;
          let timer = setTimeout(() => cleanup() || reject(new Error('JSONP timeout')), timeoutMs);
          function cleanup() {
            clearTimeout(timer);
            try { delete window[cb]; } catch (e) {}
            const s = document.getElementById(cb);
            if (s && s.parentNode) s.parentNode.removeChild(s);
          }
          window[cb] = function(data) { cleanup(); resolve(Array.isArray(data) ? data : (data?.items || data?.events || [])); };
          const script = document.createElement('script');
          script.id = cb;
          script.src = src;
          script.onerror = () => { cleanup(); reject(new Error('JSONP load error')); };
          document.head.appendChild(script);
        });
      }

      const p = fetchWithTimeout(urlOld, { method: 'GET', mode: 'cors' }, 6000)
        .then(async res => {
          const txt = await (res ? res.text().catch(()=>'') : '');
          if (!res || !res.ok || !txt) {
            // fallback to fecha endpoint (try CORS then JSONP)
            try {
              const r2 = await fetchWithTimeout(urlFecha, { method: 'GET', mode: 'cors' }, 6000);
              const t2 = await (r2 ? r2.text().catch(()=>'') : '');
              if (r2 && r2.ok && t2) {
                try { return JSON.parse(t2); } catch (e) { return Array.isArray(t2) ? t2 : []; }
              }
            } catch (_) {
              try { return await jsonpFetch(urlFecha); } catch (_) { return []; }
            }
            return [];
          }
          try {
            const parsed = JSON.parse(txt);
            return parsed?.events || parsed?.items || parsed || [];
          } catch (parseErr) {
            console.warn('listarEventosDelDia -> parse error old endpoint', { key, parseErr, txt });
            return [];
          }
        })
        .then(events => {
          const arr = Array.isArray(events) ? events : (events?.items || events?.events || []);
          try { eventsCache.set(key, { ts: Date.now(), events: arr }); } catch (e) {}
          return arr;
        })
        .catch(err => {
          console.warn('listarEventosDelDia -> fetch error', { key, err });
          try { eventsCache.set(key, { ts: Date.now(), events: [] }); } catch (e) {}
          return [];
        })
        .finally(() => { if (inflightByKey.get(key) === p) inflightByKey.delete(key); });

      inflightByKey.set(key, p);
      return p;
    }

    // normalize events to {s: Date, e: Date}
    function parseISOAssumeSantiagoIfNoTZ(s) {
      if (!s || typeof s !== 'string') return null;
      // if contains timezone offset or Z, let Date parse it
      if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) {
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      }
      // if looks like "YYYY-MM-DDTHH:MM:SS" without offset, append -03:00 (America/Santiago)
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) {
        const suffixed = s + '-03:00';
        const d = new Date(suffixed);
        return isNaN(d.getTime()) ? null : d;
      }
      // fallback to Date constructor (may parse local)
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    function normalizeEvents(events) {
      const list = Array.isArray(events) ? events : [];
      const out = [];
      for (const ev of list) {
        // distintos shapes: {start:{dateTime:...}, end:{dateTime:...}} or {start: '2025-10-31T12:00:00'} etc
        let sRaw = ev?.start?.dateTime ?? ev?.startISO ?? ev?.start ?? ev?.startDate ?? ev?.startDateTime ?? ev?.start_time ?? ev?.startTime;
        let eRaw = ev?.end?.dateTime ?? ev?.endISO ?? ev?.end ?? ev?.endDate ?? ev?.endDateTime ?? ev?.end_time ?? ev?.endTime;
        // if backend returned Google-style allDay events they may use {date: 'YYYY-MM-DD'} -> treat as full-day
        if (!sRaw && ev?.start?.date) sRaw = ev.start.date + 'T00:00:00';
        if (!eRaw && ev?.end?.date) eRaw = ev.end.date + 'T00:00:00';

        const s = parseISOAssumeSantiagoIfNoTZ(sRaw);
        const e = parseISOAssumeSantiagoIfNoTZ(eRaw);
        if (s && e) out.push({ raw: ev, s, e });
      }
      // debug small sample to detect TZ/parsing issues
      try {
        if (out.length) {
          console.debug('normalizeEvents -> parsed sample', out.slice(0, 5).map(x => ({ s: x.s.toISOString(), e: x.e.toISOString() })));
        }
      } catch (e) { }
      return out;
    }

    // --- REPLACE computeSlots: usar generateDaySlots en vez de ALLOWED_STARTS ---
    function computeSlots(dateObj, events) {
      if (!dateObj) return [];
      const now = new Date();
      const isToday = dateObj.toDateString() === now.toDateString();
      const evs = normalizeEvents(events);
      const busyRanges = evs.map(x => ({ s: x.s.getTime(), e: x.e.getTime(), raw: x.raw }));
      busyRanges.sort((a, b) => a.s - b.s);

      // si la fecha está fuera del rango máximo de reserva, devolver vacío
      const maxAllowedDate = new Date(now.getTime() + (MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000));
      if (dateObj.getTime() > maxAllowedDate.getTime()) return [];

      // Generar starts del día según WORKING_HOURS / SLOT_INTERVAL_MIN
      const candidates = generateDaySlots(dateObj);

      const libres = [];
      const minAllowed = now.getTime() + MIN_LEAD_MS;

      // debug: mostrar busyRanges brevemente
      try {
        console.debug('computeSlots debug', {
          date: dateObj.toDateString(),
          candidatesCount: candidates.length,
          busyCount: busyRanges.length,
          busySample: busyRanges.slice(0, 5).map(b => ({ s: new Date(b.s).toISOString(), e: new Date(b.e).toISOString() }))
        });
      } catch (e) { }

      for (const hhmm of candidates) {
        const [h, m] = hhmm.split(':').map(Number);
        const s = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), h, m, 0, 0).getTime();
        const e = s + SLOT_DURATION_MIN * 60000;
        // aplicar lead time (si aplica para hoy)
        if (isToday && !DEBUG_BYPASS_LEADTIME_FOR_TODAY && s < minAllowed) {
          console.debug('computeSlots: reject (leadTime)', { slot: hhmm, slotISO: new Date(s).toISOString(), minAllowedISO: new Date(minAllowed).toISOString() });
          continue;
        }
        let overlap = false;
        for (const b of busyRanges) {
          if (b.s < e && b.e > s) {
            overlap = true;
            console.debug('computeSlots: reject (busy)', { slot: hhmm, slotISO: new Date(s).toISOString(), busy: { s: new Date(b.s).toISOString(), e: new Date(b.e).toISOString() }, raw: b.raw });
            break;
          }
        }
        if (!overlap) {
          libres.push(hhmm);
        }
      }
      console.debug('computeSlots -> libres', { date: dateObj.toDateString(), libres });
      return libres;
    }

    // --- REPLACE computeOptimisticSlots: usar generateDaySlots ---
    function computeOptimisticSlots(dateObj) {
      if (!dateObj) return [];
      const now = new Date();
      const isToday = dateObj.toDateString() === now.toDateString();
      // si la fecha está fuera del rango máximo de reserva, no ofrecer nada
      const maxAllowedDate = new Date(now.getTime() + (MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000));
      if (dateObj.getTime() > maxAllowedDate.getTime()) return [];

      // generar según horario de trabajo, luego aplicar lead time si es hoy
      const candidates = generateDaySlots(dateObj);
      if (!isToday) return candidates;
      const minAllowed = now.getTime() + MIN_LEAD_MS;
      return candidates.filter(hhmm => {
        const [h, m] = hhmm.split(':').map(Number);
        const s = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), h, m, 0, 0).getTime();
        return s >= minAllowed;
      });
    }

    // UI helpers para el elemento hora
    function renderHorasDisponibles(slots) {
      const horaEl = document.getElementById('hora');
      if (!horaEl) return;
      const arraysEqual = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
      if (horaEl.tagName === 'SELECT') {
        const current = Array.from(horaEl.options).map(o => o.value || o.textContent).filter(Boolean);
        if (arraysEqual(current, slots)) return;
        while (horaEl.firstChild) horaEl.removeChild(horaEl.firstChild);
        const ph = document.createElement('option'); ph.value = ''; ph.textContent = slots.length ? 'Selecciona una hora' : 'Sin horas disponibles'; ph.disabled = true; ph.selected = true;
        horaEl.appendChild(ph);
        slots.forEach(h => { const opt = document.createElement('option'); opt.value = h; opt.textContent = h; horaEl.appendChild(opt); });
        return;
      }
      // input + datalist
      let listId = horaEl.getAttribute('list') || 'horas-disponibles';
      horaEl.setAttribute('list', listId);
      let dl = document.getElementById(listId);
      if (!dl) { dl = document.createElement('datalist'); dl.id = listId; horaEl.parentElement?.appendChild(dl); }
      const current = Array.from(dl.children).map(o => o.value);
      if (arraysEqual(current, slots)) return;
      while (dl.firstChild) dl.removeChild(dl.firstChild);
      slots.forEach(h => { const opt = document.createElement('option'); opt.value = h; dl.appendChild(opt); });
    }

    function clearHoraOptionsWithPlaceholder(text) {
      const horaEl = document.getElementById('hora'); if (!horaEl) return;
      const label = text || 'Selecciona una fecha';
      if (horaEl.tagName === 'SELECT') {
        while (horaEl.firstChild) horaEl.removeChild(horaEl.firstChild);
        const ph = document.createElement('option'); ph.value = ''; ph.textContent = label; ph.disabled = true; ph.selected = true;
        horaEl.appendChild(ph);
      } else {
        const listId = horaEl.getAttribute('list'); if (listId) { const dl = document.getElementById(listId); if (dl) while (dl.firstChild) dl.removeChild(dl.firstChild); }
        horaEl.value = ''; horaEl.placeholder = label;
      }
    }

    function setHoraBusy(isBusy, msg) {
      const el = document.getElementById('hora'); if (!el) return;
      if (isBusy) { el.setAttribute('aria-busy', 'true'); el.setAttribute('aria-disabled', 'true'); try { el.disabled = true; } catch { } if (msg) el.title = msg; el.classList.add('is-loading'); }
      else { el.removeAttribute('aria-busy'); el.removeAttribute('aria-disabled'); try { el.disabled = false; } catch { } el.title = ''; el.classList.remove('is-loading'); }
    }
    function disableHoraUntilDate() {
      clearHoraOptionsWithPlaceholder('Selecciona una fecha');
      // No dejar el control "bloqueado" en loading; solo mostrar placeholder/deshabilitado visualmente si quieres
      setHoraBusy(false);
    }

    // refreshHorasDisponibles con optimista + cache + dedupe
    async function refreshHorasDisponibles() {
      console.debug('refreshHorasDisponibles start');
      const fechaEl = document.getElementById('fecha');
      if (!fechaEl) { console.debug('refreshHorasDisponibles: no fechaEl'); return; }

      // intentar obtener Date desde flatpickr.selectedDates, si no disponible intentar parsear alt/value
      let dateObj = null;
      try {
        if (fechaEl._flatpickr && Array.isArray(fechaEl._flatpickr.selectedDates) && fechaEl._flatpickr.selectedDates.length) {
          dateObj = fechaEl._flatpickr.selectedDates[0];
        } else {
          const alt = document.querySelector('.flatpickr-input[altinput], .flatpickr-input.altInput, .flatpickr-input');
          const val = (alt && alt.value && alt.value.trim()) ? alt.value.trim() : (fechaEl.value && fechaEl.value.trim() ? fechaEl.value.trim() : '');
          if (val) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
              dateObj = new Date(val + 'T00:00:00');
            } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
              const parts = val.split('/');
              dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            } else {
              const tmp = new Date(val);
              if (!isNaN(tmp.getTime())) dateObj = tmp;
            }
          }
        }
      } catch (e) { console.warn('parse fecha error', e); }

      if (!dateObj) {
        console.debug('refreshHorasDisponibles: no dateObj -> disable placeholder and return');
        disableHoraUntilDate();
        return;
      }

      setHoraBusy(true, 'Actualizando horas disponibles...');
      const mySeq = ++refreshSeq;
      const key = dateKey(dateObj);

      // optimista: si hay cache reciente, usar computeSlots sobre la cache
      const cached = eventsCache.get(key);
      if (cached && (Date.now() - cached.ts) < EVENTS_TTL_MS) {
        try { renderHorasDisponibles(computeSlots(dateObj, cached.events)); } catch (e) { renderHorasDisponibles(computeOptimisticSlots(dateObj)); }
      } else {
        renderHorasDisponibles(computeOptimisticSlots(dateObj));
      }

      // fetch deduped + final render
      try {
        const events = await listarEventosDelDia(dateObj);
        if (mySeq !== refreshSeq) {
          console.debug('refreshHorasDisponibles: obsolete seq, aborting', { key, mySeq, refreshSeq });
          setHoraBusy(false);
          return;
        }
        // log completo para depuración
        console.debug('refreshHorasDisponibles: events from backend', { key, count: Array.isArray(events) ? events.length : typeof events, eventsSample: (Array.isArray(events) ? events.slice(0, 6) : events) });

        // Si estamos en modo debug para sábado, mostrar optimistic slots para comparar
        if (DEBUG_SKIP_BUSY_FILTER_FOR_SAT && dateObj.getDay() === 6) {
          console.debug('DEBUG: skipping busy filter for SATURDAY, rendering optimistic slots for comparison');
          renderHorasDisponibles(computeOptimisticSlots(dateObj));
        } else {
          const slots = computeSlots(dateObj, events);
          renderHorasDisponibles(slots);
        }
      } catch (err) {
        console.warn('refreshHorasDisponibles error', err);
        try { renderHorasDisponibles(computeOptimisticSlots(dateObj)); } catch (e) { }
      } finally {
        setHoraBusy(false);
      }
    }

    // combinar fecha + hh:mm
    function combinarFechaHora(fechaDate, hhmm) {
      const [h, m] = String(hhmm || '').split(':').map(n => parseInt(n, 10));
      return new Date(fechaDate.getFullYear(), fechaDate.getMonth(), fechaDate.getDate(), isNaN(h) ? 9 : h, isNaN(m) ? 0 : m, 0, 0);
    }

    // reservarEnGoogleCalendar
    async function reservarEnGoogleCalendar({ startLocal, durationMin, nombre, correo, titulo, descripcion, edad, motivo }) {
      if (!GAS_URL) return { ok: false, skip: true };
      const params = new URLSearchParams();
      params.append('secret', GAS_SECRET);
      params.append('y', String(startLocal.getFullYear()));
      params.append('mo', String(startLocal.getMonth() + 1));
      params.append('d', String(startLocal.getDate()));
      params.append('hh', String(startLocal.getHours()));
      params.append('mm', String(startLocal.getMinutes()));
      params.append('duration', String(durationMin || SLOT_DURATION_MIN));
      params.append('calendar', 'ps.camilahernandez.gu@gmail.com');
      if (nombre) params.append('name', nombre);
      if (correo) params.append('email', correo);
      if (titulo) params.append('title', titulo);
      if (descripcion) params.append('description', descripcion);
      if (edad) params.append('edad', String(edad));
      if (motivo) params.append('motivo', String(motivo));
      params.append('invite', '1');
      params.append('meet', '1');

      try {
        const res = await fetch(GAS_URL, { method: 'POST', body: params, mode: 'cors', redirect: 'follow' });
        const txt = await res.text().catch(() => '');
        console.debug('reservarEnGoogleCalendar -> response text:', txt);
        try { return JSON.parse(txt); } catch { return res.ok ? { ok: true, raw: txt } : { ok: false, raw: txt }; }
      } catch (err) {
        try { await fetch(GAS_URL, { method: 'POST', body: params, mode: 'no-cors' }); return { ok: true, opaque: true }; } catch (e2) { return { ok: false, error: String(e2) }; }
      }
    }

    // Validación helpers
    function esEmailValido(emailValue) {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(String(emailValue).trim());
    }
    function clearError(field) {
      if (!field) return;
      // quitar clase de invalid del field o, en caso de fecha, del altInput si existe
      try {
        if (field === fecha) {
          // usar altInput de flatpickr si está disponible (más fiable que querySelector)
          const alt = (fecha && fecha._flatpickr && fecha._flatpickr.altInput) || document.querySelector('.flatpickr-input.altInput, .flatpickr-input[altinput], .flatpickr-input');
          if (alt) {
            // remover estilos inline aplicados para marcar error (no tocar clases globales)
            alt.style.removeProperty('border-color');
            alt.style.removeProperty('box-shadow');
            alt.style.removeProperty('padding-right');
            alt.style.removeProperty('background-image');
            alt.style.removeProperty('background-position');
          }
          // también el elemento original por si se usa sin flatpickr
          try { field.classList.remove('is-invalid'); } catch (e) { }
          // remover mensajes de error
          const parent = (alt && alt.parentElement) || field.parentElement || field;
          const s = parent.querySelector('.input-error');
          if (s) s.remove();
          return;
        }
      } catch (e) { /* ignore */ }
      field.classList.remove('is-invalid');
      const s = (field.parentElement || field).querySelector('.input-error');
      if (s) s.remove();
    }
    function showError(field, msg) {
      if (!field) return;
      clearError(field);
      // marcar visualmente como inválido
      try {
        if (field === fecha) {
          // Preferir altInput provisto por flatpickr para marcar el borde visible
          const alt = (fecha && fecha._flatpickr && fecha._flatpickr.altInput) || document.querySelector('.flatpickr-input.altInput, .flatpickr-input[altinput], .flatpickr-input');
          if (alt) {
            // aplicar estilos inline en lugar de la clase global para evitar que el icono (i) del theme aparezca
            alt.style.setProperty('border-color', '#d9534f', 'important');
            alt.style.setProperty('box-shadow', 'none', 'important');
            alt.style.setProperty('padding-right', '48px', 'important'); // dejar espacio al calendario
            // intentar ocultar cualquier background-icon usado por el tema
            alt.style.setProperty('background-image', 'none', 'important');
            alt.style.setProperty('background-position', 'right 12px center', 'important');
          } else {
            field.classList.add('is-invalid');
          }

          const parent = (alt && alt.parentElement) || field.parentElement || field;

          // insertar mensaje DEBAJO del control visible (no dentro del input) para evitar solapamientos
          const d = document.createElement('div');
          d.className = 'input-error';
          d.setAttribute('role', 'alert');
          d.textContent = msg;
          try {
            if (alt && alt.nextSibling) parent.insertBefore(d, alt.nextSibling);
            else parent.appendChild(d);
          } catch (e) {
            try { parent.appendChild(d); } catch (e) {}
          }
          return;
        }
      } catch (e) { /* ignore */ }

      field.classList.add('is-invalid');
      const d = document.createElement('div');
      d.className = 'input-error';
      d.setAttribute('role', 'alert');
      d.textContent = msg;
      (field.parentElement || field).appendChild(d);
    }

    // field validators
    function readFecha() {
      try {
        if (fecha && fecha._flatpickr && Array.isArray(fecha._flatpickr.selectedDates) && fecha._flatpickr.selectedDates.length) {
          return fecha._flatpickr.selectedDates[0];
        }
      } catch (e) { }
      const alt = document.querySelector('.flatpickr-input[altinput], .flatpickr-input.altInput, .flatpickr-input');
      if (alt && alt.value && alt.value.trim()) return alt.value.trim();
      if (fecha && fecha.value && fecha.value.trim()) return fecha.value.trim();
      return '';
    }

    function validarNombre() { clearError(nombre); if (!nombre || !nombre.value || !nombre.value.trim()) { showError(nombre, 'Ingresa tu nombre.'); return false; } return true; }
    function validarEmail() { clearError(email); if (!email || !email.value || !email.value.trim()) { showError(email, 'Ingresa un correo electrónico.'); return false; } if (!esEmailValido(email.value)) { showError(email, 'Ingresa un correo válido (ej: usuario@dominio.cl).'); return false; } return true; }
    function validarFecha() {
      // si estamos silenciando validaciones (reset/post-submit) no marcar error
      if (suppressFechaValidation) {
        try { clearError(fecha); } catch (e) {}
        return true;
      }
      clearError(fecha);
      if (!readFecha()) { showError(fecha, 'Selecciona una fecha.'); return false; }
      return true;
    }
    function validarHora() { clearError(hora); if (!hora || !hora.value || !hora.value.trim()) { showError(hora, 'Selecciona una hora.'); return false; } return true; }
    function validarEdad() { clearError(edad); if (!edad || !edad.value) { showError(edad, 'Ingresa tu edad.'); return false; } const n = Number(edad.value); if (!Number.isFinite(n) || n < 12 || n > 99) { showError(edad, 'Ingresa una edad válida (12 a 99).'); return false; } return true; }
    function validarMotivo() { clearError(motivo); if (!motivo || !motivo.value) { showError(motivo, 'Selecciona el motivo de tu consulta.'); return false; } return true; }

    // Nuevos validadores: apellido y teléfono
    const apellido = document.getElementById('apellido');
    const telefono = document.getElementById('telefono');

    // Mostrar +56 fijo dentro del input (no editable) y helpers de normalización
    (function ensurePhonePrefixUI() {
      if (!telefono) return;
      const PREFIX = '+56';
      const PREFIX_LEN = PREFIX.length;
      try {
        // inicializar valor si está vacío
        if (!telefono.value || !telefono.value.trim() || telefono.value.trim() === '+' ) {
          telefono.value = PREFIX;
        } else {
          const raw = String(telefono.value || '').trim();
          if (!raw.startsWith('+')) {
            const digits = raw.replace(/\D/g, '');
            if (digits) {
              telefono.value = PREFIX + (digits.startsWith('56') ? digits.slice(2) : digits);
            } else {
              telefono.value = PREFIX;
            }
          } else if (!raw.startsWith(PREFIX)) {
            const digits = raw.replace(/\D/g, '');
            telefono.value = PREFIX + (digits.startsWith('56') ? digits.slice(2) : digits);
          }
        }

        function setCaretAfterPrefix(el) {
          try { el.setSelectionRange(PREFIX_LEN, PREFIX_LEN); } catch(e){}
        }

        // mover el caret al final del valor (útil para doble click)
        function setCaretToEnd(el) {
          try {
            const len = String(el.value || '').length;
            el.setSelectionRange(len, len);
          } catch (e) {}
        }

        // al hacer doble click, colocar el cursor al final del contenido (no justo después del prefijo)
        telefono.addEventListener('dblclick', function (ev) {
          // ejecutar después del comportamiento nativo para anular la selección y ubicar el caret al final
          setTimeout(() => { setCaretToEnd(this); }, 0);
        });

        telefono.addEventListener('focus', function (ev) {
          try {
            const s = this.selectionStart ?? 0;
            if (s < PREFIX_LEN) setCaretAfterPrefix(this);
          } catch(e){}
        }, { passive: true });

        telefono.addEventListener('mousedown', function (ev) {
          setTimeout(() => {
            try {
              if ((this.selectionStart ?? 0) < PREFIX_LEN) setCaretAfterPrefix(this);
            } catch(e){}
          }, 0);
        });

        telefono.addEventListener('keydown', function (ev) {
          const start = this.selectionStart ?? 0;
          const end = this.selectionEnd ?? 0;
          if ((ev.key === 'Backspace' && start <= PREFIX_LEN) ||
              (ev.key === 'Delete' && start < PREFIX_LEN) ) {
            ev.preventDefault();
            setCaretAfterPrefix(this);
            return;
          }
          if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'x' || ev.key === 'X')) {
            if (start < PREFIX_LEN || end <= PREFIX_LEN) { ev.preventDefault(); setCaretAfterPrefix(this); return; }
          }
        });

        telefono.addEventListener('input', function (ev) {
          try {
            let val = String(this.value || '');
            let digits = val.replace(/\D/g, '');
            if (digits.startsWith('56')) digits = digits.slice(2);
            const MAX_NATIONAL = 9;
            if (digits.length > MAX_NATIONAL) digits = digits.slice(0, MAX_NATIONAL);
            const newVal = PREFIX + digits;
            this.value = newVal;
            // permitir hasta "+56" + 9 dígitos = 12 caracteres en total
            try { this.maxLength = PREFIX_LEN + MAX_NATIONAL; } catch(e){}
            const desired = Math.max(PREFIX_LEN, Math.min(newVal.length, (this.value.length)));
            setTimeout(() => { try { this.setSelectionRange(desired, desired); } catch(e){} }, 0);
          } catch (e) {}
        });

        telefono.addEventListener('blur', function () {
          try {
            const digits = (this.value || '').replace(/\D/g, '');
            if (!digits || digits.length === 0) {
              this.value = PREFIX;
            }
          } catch (e) {}
        });

        // REMOVED extra padding-left (dejamos el input con su padding por defecto)
        try {
          telefono.style.paddingLeft = telefono.style.paddingLeft || '';
        } catch(e){}

      } catch (e) { /* noop */ }
    })();

    // normaliza cualquier entrada y devuelve versión con +56 (sin mutar el input)
    function normalizePhoneToPlus56(raw) {
      const s = String(raw || '').trim();
      const digits = s.replace(/\D/g, '');
      if (!digits) return '';
      // si el usuario incluyó 56 como prefijo, no duplicarlo
      if (digits.startsWith('56')) return '+' + digits;
      // quitar ceros a la izquierda del número nacional
      const nd = digits.replace(/^0+/, '');
      return '+56' + nd;
    }

    function validarApellido() { clearError(apellido); if (!apellido || !apellido.value || !apellido.value.trim()) { showError(apellido, 'Ingresa tu apellido.'); return false; } return true; }
    function validarTelefono() {
      clearError(telefono);
      if (!telefono || !telefono.value || !telefono.value.trim()) { showError(telefono, 'Ingresa un teléfono.'); return false; }
      try {
        const raw = String(telefono.value || '').trim();
        const digits = raw.replace(/\D/g, '');
        if (!digits) { showError(telefono, 'Ingresa un teléfono válido.'); return false; }
        // comprobación mínima: al menos 8 dígitos nacionales (ej. 9+8 o 2+7)
        if (digits.length < 7) { showError(telefono, 'Ingresa un teléfono válido.'); return false; }
        // NO mutamos telefono.value aquí: el input muestra solo los dígitos y el prefijo visual +56
        return true;
      } catch (e) {
        showError(telefono, 'Ingresa un teléfono válido.');
        return false;
      }
    }

    // Attach live listeners for apellido (faltaba) y mejorar comportamiento del teléfono
    if (apellido) {
      apellido.addEventListener('input', () => { validarApellido(); if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = ''; updateButton(); });
      apellido.addEventListener('change', () => { validarApellido(); updateButton(); });
      apellido.addEventListener('blur', () => { validarApellido(); });
    }

    if (telefono) {
        telefono.addEventListener('input', () => {
            try {
              const raw = String(telefono.value || '').trim();
              let digits = raw.replace(/\D/g, '');
              if (digits.startsWith('56')) digits = digits.slice(2);
              // maxlength total fijo: +56 + hasta 9 dígitos = 12
              telefono.maxLength = 12;
            } catch(e){}
            validarTelefono();
            if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = '';
            updateButton();
        });
        telefono.addEventListener('change', () => { validarTelefono(); updateButton(); });
        telefono.addEventListener('blur', () => {
            validarTelefono();
            updateButton();
        });
    }

    function validarTodo() {
      // ejecutar todos los validadores y devolver si todo ok
      const a = validarNombre();
      const b = validarApellido();
      const c = validarEmail();
      const d = validarTelefono();
      const e = validarFecha();
      const f = validarHora();
      const g = validarEdad();
      const h = validarMotivo();
      return a && b && c && d && e && f && g && h;
    }

    // setDisabled ahora respeta el estado pedido
    // Mantener el botón siempre habilitado: solo actualiza atributos ARIA/visual, no lo bloquea.
    function setDisabled(_state) {
      if (!reservar) return;
      // no deshabilitar nunca; reflejar estado solo en aria para accesibilidad
      try {
        reservar.setAttribute('aria-disabled', String(!!_state));
        reservar.classList.toggle('aria-disabled', !!_state);
        // nunca aplicar disabled ni pointerEvents:none
        reservar.removeAttribute('disabled');
        reservar.style.pointerEvents = 'auto';
      } catch (e) { }
    }

    // Loader UI helpers (mantener compat con markup que usa "d-none")
    function showLoader() {
      try {
        if (spinner) spinner.classList.remove('d-none');
        if (reservar) reservar.classList.add('is-loading');
        console.debug('showLoader');
      } catch (e) { }
    }
    function hideLoader() {
      try {
        if (spinner) spinner.classList.add('d-none');
        if (reservar) reservar.classList.remove('is-loading');
        console.debug('hideLoader');
      } catch (e) { }
    }

    // Flag para evitar que los listeners limpien el mensaje inmediatamente después del envío/reset
    let suppressConfirmClear = false;
    // Flag temporal para silenciar la validación de fecha durante reset/post-submit
    let suppressFechaValidation = false;

    // evitar envíos dobles
    let submitting = false;

    // enfoca el primer campo con error (si existe)
    function focusFirstInvalid() {
      // buscamos el elemento .input-error generado por showError
      const err = form.querySelector('.input-error');
      if (!err) return;
      const candidate = err.previousElementSibling || err.parentElement.querySelector('input,select,textarea,button,[tabindex]:not([tabindex="-1"])');
      if (candidate && typeof candidate.focus === 'function') {
        try { candidate.focus(); } catch (e) { }
      }
    }

    // keep reservar enabled in UI (initial)
    function updateButton() {
      try {
        const nombreOk = nombre && nombre.value && nombre.value.trim().length > 0;
        const emailOk = email && esEmailValido(email.value || '');
        const fechaOk = !!readFecha();
        const horaOk = hora && hora.value && hora.value.trim().length > 0;
        const edadOk = edad && Number.isFinite(Number(edad.value)) && Number(edad.value) >= 12 && Number(edad.value) <= 99;
        const motivoOk = motivo && !!motivo.value;
        const apellidoOk = apellido && apellido.value && apellido.value.trim().length > 0;
        // teléfono: validarTelefono puede formatear el valor, así que llamar pero no mostrar errores innecesarios
        let telefonoOk = false;
        try {
          telefonoOk = telefono && telefono.value && telefono.value.trim().length > 0 && (function(){ const saved = validarTelefono(); return saved; })();
        } catch (e) { telefonoOk = false; }
        const allOk = nombreOk && apellidoOk && emailOk && fechaOk && horaOk && edadOk && motivoOk && telefonoOk;
        if (reservar) {
          // indicar visualmente si el formulario está completo, pero NO deshabilitar el botón
          reservar.classList.toggle('form-valid', allOk);
          reservar.removeAttribute('disabled');
          reservar.setAttribute('aria-disabled', 'false');
        }
      } catch (e) { console.warn('updateButton error', e); }
    }

    // flatpickr init (non-blocking)
    (function initFlat(attempt = 0) {
      if (!fecha) return;
      if (window.flatpickr) {
        try {
          try { fecha.type = 'text'; } catch (e) { }
          const maxDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          flatpickr(fecha, {
            altInput: true,
            altFormat: 'd/m/Y',
            dateFormat: 'Y-m-d',
            locale: 'es',
            minDate: 'today',
            maxDate: maxDate,
            disableMobile: true,
            // dejar sábados disponibles según WORKING_HOURS (solo deshabilitar domingos si lo deseas)
            disable: [(date) => date.getDay() === 0],
            onReady: function (selectedDates) {
              // una vez inicializado, intentar refrescar horas (si hay fecha seleccionada o valor en el input)
              try { refreshHorasDisponibles(); } catch (e) { }
            },
            onChange: async (selectedDates) => {
              try { clearError(fecha); } catch (e) { }
              if (!selectedDates || !selectedDates.length) { disableHoraUntilDate(); updateButton(); return; }
              try { await refreshHorasDisponibles(); } catch (e) { }
              try { updateButton(); } catch (e) { }
            }
          });
        } catch (e) {
          console.error('flatpickr init error', e);
        }
      } else {
        // esperar a que flatpickr esté disponible (timeout 10s max)
        const timeoutMs = 10000;
        const intervalMs = 250;
        let elapsed = 0;
        const checkFlatpickr = (attempt) => {
          if (window.flatpickr) {
            console.debug('flatpickr detected, re-initializing');
            try { fecha.type = 'text'; } catch (e) { }
            flatpickr(fecha, {
              altInput: true,
              altFormat: 'd/m/Y',
              dateFormat: 'Y-m-d',
              locale: 'es',
              minDate: 'today',
              maxDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              disableMobile: true,
              // dejar sábados disponibles según WORKING_HOURS (solo deshabilitar domingos si lo deseas)
              disable: [(date) => date.getDay() === 0],
              onReady: function (selectedDates) {
                // una vez inicializado, intentar refrescar horas (si hay fecha seleccionada o valor en el input)
                try { refreshHorasDisponibles(); } catch (e) { }
              },
              onChange: async (selectedDates) => {
                try { clearError(fecha); } catch (e) { }
                if (!selectedDates || !selectedDates.length) { disableHoraUntilDate(); updateButton(); return; }
                try { await refreshHorasDisponibles(); } catch (e) { }
                try { updateButton(); } catch (e) { }
              }
            });
            return;
          }
          elapsed += intervalMs;
          if (elapsed < timeoutMs) {
            setTimeout(() => checkFlatpickr(attempt + 1), intervalMs);
          } else {
            console.warn('flatpickr not detected after 10s, giving up');
          }
        };
        checkFlatpickr();
      }
    })();

    if (telefono) {
        telefono.addEventListener('input', () => {
            try {
              const raw = String(telefono.value || '').trim();
              let digits = raw.replace(/\D/g, '');
              if (digits.startsWith('56')) digits = digits.slice(2);
              // maxlength total fijo: +56 + hasta 9 dígitos = 12
              telefono.maxLength = 12;
            } catch(e){}
            validarTelefono();
            if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = '';
            updateButton();
        });
        telefono.addEventListener('change', () => { validarTelefono(); updateButton(); });
        telefono.addEventListener('blur', () => {
            validarTelefono();
            updateButton();
        });
    }

    if (fecha) {
        const onFechaChange = debounce(async () => {
            validarFecha();
            if (!readFecha()) disableHoraUntilDate();
            try { await refreshHorasDisponibles(); } catch (_) { }

            if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = '';
            updateButton();
        }, 200);
        fecha.addEventListener('input', onFechaChange);
        fecha.addEventListener('change', onFechaChange);
        fecha.addEventListener('blur', () => { validarFecha(); });
        const altInput = document.querySelector('.flatpickr-input[altinput], .flatpickr-input.altInput, .flatpickr-input');
        if (altInput) altInput.addEventListener('blur', () => { validarFecha(); updateButton(); });
    }
    if (hora) {
        hora.addEventListener('input', () => { validarHora(); if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = ''; updateButton(); });
        hora.addEventListener('change', () => { validarHora(); updateButton(); });
        hora.addEventListener('blur', () => { validarHora(); });
    }
    if (edad) {
        edad.addEventListener('input', () => { validarEdad(); updateButton(); });
        edad.addEventListener('change', () => { validarEdad(); updateButton(); });
        edad.addEventListener('blur', () => { validarEdad(); });
    }
    if (motivo) {
        motivo.addEventListener('input', () => { validarMotivo(); updateButton(); });
        motivo.addEventListener('change', () => { validarMotivo(); updateButton(); });
        motivo.addEventListener('blur', () => { validarMotivo(); });
    }

    // submit handler (REEMPLAZAR la implementación actual por esta para usar EmailJS)
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // limpiar mensajes de confirmación y todos los errores visibles al iniciar submit
        try {
          if (confirmEl) confirmEl.innerHTML = '';
          // eliminar todos los mensajes .input-error y clases is-invalid dentro del formulario
          const errs = form.querySelectorAll('.input-error');
          errs.forEach(n => n.remove());
          const invalids = form.querySelectorAll('.is-invalid');
          invalids.forEach(n => n.classList.remove('is-invalid'));
          // limpiar también estilos inline aplicados al altInput de flatpickr (borde rojo visible)
          try {
            const alt = (fecha && fecha._flatpickr && fecha._flatpickr.altInput) || document.querySelector('.flatpickr-input.altInput, .flatpickr-input[altinput], .flatpickr-input');
            if (alt) {
              alt.style.removeProperty('border-color');
              alt.style.removeProperty('box-shadow');
              alt.style.removeProperty('padding-right');
              alt.style.removeProperty('background-image');
              alt.style.removeProperty('background-position');
              alt.classList.remove('is-invalid');
            }
          } catch (e) {}
          // asegurarse de limpiar estados concretos por campo
          try { clearError(fecha); } catch(e) {}
          try { clearError(nombre); } catch(e) {}
          try { clearError(email); } catch(e) {}
          try { clearError(apellido); } catch(e) {}
          try { clearError(telefono); } catch(e) {}
          try { clearError(hora); } catch(e) {}
          try { clearError(edad); } catch(e) {}
          try { clearError(motivo); } catch(e) {}
        } catch (err) { console.warn('clear errors on submit', err); }

        // asegurar que teléfono tenga código +56 antes de validar
        // not mutating the input here; normalization to +56 is applied when building templateParams

        if (!validarTodo()) {
            if (confirmEl) confirmEl.innerHTML = '<p class="confirm-error">Debes completar todos los campos correctamente para agendar.</p>';
            focusFirstInvalid();
            return;
        }

        const fechaDate = (fecha && fecha._flatpickr && fecha._flatpickr.selectedDates.length)
            ? fecha._flatpickr.selectedDates[0]
            : null;

        if (!fechaDate) { showError(fecha, 'Selecciona una fecha.'); focusFirstInvalid(); return; }
        if (!hora?.value || !/^\d{2}:\d{2}$/.test(hora.value)) { showError(hora, 'Selecciona una hora.'); focusFirstInvalid(); return; }

        // Mostrar overlay desde la verificación de disponibilidad
        showOverlay('Comprobando disponibilidad...');

        // validar contra horas libres justo antes de reservar
        try {
            const evs = await listarEventosDelDia(fechaDate);
            const libres = computeSlots(fechaDate, evs);
            if (!libres.includes(hora.value.trim())) {
                hideOverlay();
                showError(hora, 'Esa hora ya no está disponible. Elige otra.');
                await refreshHorasDisponibles();
                focusFirstInvalid();
                return;
            }
        } catch (_) {
            // si falla listado igual seguimos al intento de reserva
        }

        const startDate = combinarFechaHora(fechaDate, (hora?.value || ''));
        const durationMin = SLOT_DURATION_MIN;

        // NUEVO: armar descripción para Calendar con motivo y edad
        const motivoTexto = (function () {
            try { return motivo?.selectedOptions?.[0]?.textContent?.trim() || motivo?.value || ''; }
            catch (_) { return motivo?.value || ''; }
        })();
        const edadVal = (edad?.value || '').trim();
        const descripcionGC = `Motivo: ${motivoTexto} | Edad: ${edadVal} | Reserva desde sitio web`;

        // Crear evento en Calendar
        showOverlay('Generando cita...');
        const reservaGC = await reservarEnGoogleCalendar({
            startLocal: startDate,
            durationMin: SLOT_DURATION_MIN,
            nombre: nombre.value.trim(),
            correo: email.value.trim(),
            titulo: 'Sesión Psicológica',
            descripcion: descripcionGC,
            // NUEVO: enviar también de forma separada
            edad: edadVal,
            motivo: motivoTexto,
            inviteGuests: true,
            meet: true
        });
        console.log('GAS respuesta:', reservaGC);

        const createdLink = reservaGC?.openUrl || reservaGC?.editUrl || '';
        const conflictLink = reservaGC?.conflictEvents?.[0]?.openUrl || reservaGC?.conflictEvents?.[0]?.editUrl || '';

        if (reservaGC?.unauthorized) {
            hideOverlay();
            if (confirmEl) confirmEl.innerHTML = '<p class="confirm-error">No autorizado: revisa SECRET/Implementación.</p>';
            return;
        }

        // Sin enlace "Ver evento" al conflicto
        if (reservaGC?.conflict) {
            hideOverlay();
            if (confirmEl) {
                confirmEl.classList.remove('confirm-success', 'text-success');
                confirmEl.classList.add('confirm-error', 'text-danger');
                confirmEl.innerHTML = 'Esa hora ya está reservada.';
            }
            return;
        }

        // Error del backend (no crear evento ni enviar correo)
        if (!reservaGC?.ok) {
            hideOverlay();
            if (confirmEl) {
                confirmEl.classList.remove('confirm-success', 'text-success');
                confirmEl.classList.add('confirm-error', 'text-danger');
                confirmEl.innerHTML = 'No se pudo crear la cita. Inténtalo nuevamente.';
            }
            return; // <- no enviar EmailJS
        }

        // Email de confirmación
        showOverlay('Enviando confirmación...');

        const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
        const tz = 'America/Santiago';
        const fmtLarga = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: tz });
        const fmtCorta = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: tz });

        const fechaLarga = fechaDate
            ? capitalize(fmtLarga.format(fechaDate))
            : ((document.querySelector('.flatpickr-input[altinput]') || fecha).value || '');

        const fechaCorta = fechaDate
            ? fmtCorta.format(fechaDate)
            : fechaLarga;

        // usar el email del input como destinatario dinámico (paciente) y asegurar copia a Camila
        const patientEmail = (email?.value || '').trim();
        const camilaEmail = 'ps.camilahernandez.gu@gmail.com';

        const isValidEmail = (addr) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((addr||'').trim());

        if (!patientEmail || !isValidEmail(patientEmail)) {
          console.error('agendar.js: campo email inválido o vacío (to_email). Abortar envío EmailJS.');
          hideOverlay();
          if (confirmEl) confirmEl.innerHTML = '<p class="confirm-error">Error interno: correo del paciente inválido. Verifica el formulario.</p>';
          return;
        }

        const templateParams = {
          nom: (nombre?.value || '').trim(),
          ape: (apellido?.value || '').trim(),
          mail: patientEmail, // reply-to / dato del paciente
          tel: normalizePhoneToPlus56(telefono?.value || ''),
          ed: (edad?.value || '').trim(),
          mot: (function(){
            try { return motivo?.selectedOptions?.[0]?.textContent?.trim() || motivo?.value || ''; } catch(_) { return motivo?.value || ''; }
          })(),
          fec: fechaLarga,
          hor: (hora?.value || '').trim(),
          url: createdLink || '',
          confirm_url: reservaGC?.confirmUrl || reservaGC?.confirm_url || '',
          cancel_url: reservaGC?.cancelUrl || reservaGC?.cancel_url || ''
        };

        // destinatario principal dinámico = email del input; Camila siempre en CC
        templateParams.to_email = patientEmail;
        templateParams.cc = camilaEmail;

        if (spinner) spinner.classList.remove('d-none');

        try {
            const SERVICE_ID = 'service_wjxgyjn';
            const TEMPLATE_ID = 'template_1kkrz0w';
            const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
            console.log('EmailJS send result:', result);

            if (spinner) spinner.classList.add('d-none');
            hideOverlay();

            if (confirmEl) {
                suppressConfirmClear = true;
                const linkHtml =
                    createdLink ? ` <a href="${createdLink}" target="_blank" rel="noopener">Ver en Google Calendar</a>` : '';
                confirmEl.classList.remove('confirm-error', 'text-danger');
                confirmEl.classList.add('confirm-success', 'text-success');
                confirmEl.setAttribute('role', 'status');
                confirmEl.setAttribute('aria-live', 'polite');
                confirmEl.style.display = 'block';
                confirmEl.style.color = 'var(--calipso)';
                confirmEl.innerHTML = `Reserva enviada para ${fechaCorta} a las ${hora.value.trim()}.${linkHtml}`;
                try { confirmEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { }
                // mantener mensaje visible unos segundos y luego desaparecer suavemente
                suppressConfirmClear = true;
                try {
                    confirmEl.style.transition = 'opacity 450ms ease';
                    confirmEl.style.opacity = '1';
                } catch (e) {}
                setTimeout(() => {
                    try { confirmEl.style.opacity = '0'; } catch (e) {}
                    setTimeout(() => {
                        try { confirmEl.innerHTML = ''; confirmEl.style.display = ''; confirmEl.style.opacity = ''; } catch (e) {}
                        suppressConfirmClear = false;
                    }, 500);
                }, 10000); // 10s visible
            }

            setTimeout(() => {
                // evitar que los listeners (blur/change) relancen la validación de Fecha durante el reset
                suppressFechaValidation = true;
                try { form.reset(); } catch (e) { }
                try { if (fecha && fecha._flatpickr) fecha._flatpickr.clear(); } catch (e) { }
                // eliminar mensajes de error residuales y clases is-invalid dentro del formulario
                try { form.querySelectorAll('.input-error').forEach(n => n.remove()); } catch(e){}
                try { form.querySelectorAll('.is-invalid').forEach(n => n.classList.remove('is-invalid')); } catch(e){}
                // limpiar estilos inline y mensaje del altInput de flatpickr (campo Fecha)
                try {
                  const alt = (fecha && fecha._flatpickr && fecha._flatpickr.altInput) || document.querySelector('.flatpickr-input[altinput], .flatpickr-input.altInput, .flatpickr-input');
                  if (alt) {
                    ['border-color','box-shadow','padding-right','background-image','background-position'].forEach(p => alt.style.removeProperty(p));
                    alt.classList.remove('is-invalid');
                    const maybeErr = alt.parentElement && alt.parentElement.querySelector('.input-error');
                    if (maybeErr) maybeErr.remove();
                  }
                } catch(e){}
                try { clearError(fecha); } catch(e){}
                updateButton();
                // volver a activar validación tras breve retardo (permitir eventos blur/onchange que sigan al reset)
                setTimeout(() => { suppressFechaValidation = false; }, 600);
            }, 200);
        } catch (err) {
            if (spinner) spinner.classList.add('d-none');
            hideOverlay();
            console.error('EmailJS error', err);
            if (confirmEl) confirmEl.innerHTML = '<p class="confirm-error">Error al enviar via EmailJS. Se intentará abrir tu cliente de correo.</p>';

            try {
                const subject = encodeURIComponent('Nueva reserva - sitio web');
                const body = encodeURIComponent(
                    `Nombre: ${nombre.value.trim()}\nEmail: ${email.value.trim()}\nEdad: ${edadVal}\nMotivo: ${motivoTexto}\nFecha: ${fechaLarga}\nHora: ${hora.value.trim()}\n\nReservado desde sitio web.`
                );
                const mailto = `mailto:ps.camilahernandez.gu@gmail.com?subject=${subject}&body=${body}`;
                window.location.href = mailto;
            } catch (mailtoErr) {
                console.error('Mailto fallback error', mailtoErr);
                if (confirmEl) confirmEl.innerHTML = '<p class="confirm-error">No se pudo enviar el correo. Intenta nuevamente más tarde.</p>';
            }
        }
    });
  } catch (e) {
    console.error('form agenda error', e);
  }

  // Overlay global: helpers + estilos (idempotente) - necesario para mensajes "Comprobando disponibilidad..." / "Generando cita..."
  (function overlayHelpers() {
      if (window.showOverlay && window.hideOverlay) return;
      function ensureOverlay() {
          let ov = document.getElementById('page-loading-overlay');
          const styleId = 'page-loading-overlay-style';
          if (!document.getElementById(styleId)) {
              const st = document.createElement('style');
              st.id = styleId;
              st.textContent = `
#page-loading-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:saturate(120%) blur(2px);display:none;align-items:center;justify-content:center;z-index:9999}
#page-loading-overlay .box{background:rgba(255,255,255,.95);color:#0b2533;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:20px 24px;min-width:240px;display:flex;align-items:center;gap:14px;border:2px solid var(--calipso,#1aa6b7)}
#page-loading-overlay .spinner{width:28px;height:28px;border:3px solid rgba(0,0,0,.1);border-top-color:var(--calipso,#1aa6b7);border-radius:50%;animation:spin 1s linear infinite}
#page-loading-overlay .msg{font-weight:600;color:#0b2533}
@keyframes spin{to{transform:rotate(360deg)}}
`;
              document.head.appendChild(st);
          }
          if (!ov) {
              ov = document.createElement('div');
              ov.id = 'page-loading-overlay';
              ov.setAttribute('aria-hidden', 'true');
              ov.innerHTML = `<div class="box"><div class="spinner"></div><div class="msg">Procesando...</div></div>`;
              document.body.appendChild(ov);
          }
          return ov;
      }

      window.showOverlay = function (message) {
          const ov = ensureOverlay();
          const msg = ov.querySelector('.msg');
          if (msg && message) msg.textContent = message;
          ov.style.display = 'flex';
          ov.setAttribute('aria-hidden', 'false');
      };

      window.hideOverlay = function () {
          const ov = document.getElementById('page-loading-overlay');
          if (!ov) return;
          ov.style.display = 'none';
          ov.setAttribute('aria-hidden', 'true');
      };
  })();
});


