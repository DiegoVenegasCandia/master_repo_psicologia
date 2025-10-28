document.addEventListener('DOMContentLoaded', function () {
  const header = document.querySelector('.site-header');
  const logoImg = document.querySelector('.logo img');
  if (!header || !logoImg) return;

  function adjustHeader() {
    const logoH = logoImg.naturalHeight || logoImg.clientHeight;
    if (!logoH) return;
    const desired = Math.max(56, Math.min(100, Math.round(logoH + 12))); // entre 56 y 100px
    header.style.minHeight = desired + 'px';
    const mt = Math.max(0, Math.round((desired - logoImg.clientHeight) / 2));
    logoImg.style.marginTop = mt + 'px';

    // mantener body con padding igual a la altura del header (evita que el header oculte contenido)
    document.documentElement.style.setProperty('--header-height', desired + 'px');
  }

  if (logoImg.complete) adjustHeader();
  else logoImg.addEventListener('load', adjustHeader);
  window.addEventListener('resize', adjustHeader);
});

document.addEventListener('DOMContentLoaded', function () {
  const header = document.querySelector('.site-header');
  const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
  const logoLink = document.querySelector('.logo-link');

  function headerHeight() {
    return header ? Math.ceil(header.getBoundingClientRect().height) : 0;
  }

  function scrollToId(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const y = target.getBoundingClientRect().top + window.scrollY - headerHeight() - 8;
    window.scrollTo({ top: Math.max(0, Math.floor(y)), behavior: 'smooth' });
  }

  function setActive(id) {
    navButtons.forEach(b => b.classList.toggle('active', b.dataset.target === id));
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const target = btn.dataset.target;
      if (!target) return;
      scrollToId(target);
      setActive(target);
    });
  });

  if (logoLink) {
    logoLink.addEventListener('click', function (e) {
      e.preventDefault();
      scrollToId('sobre-mi');
      setActive('sobre-mi');
    });
  }

  // Highlight nav item while scrolling
  const sectionIds = navButtons.map(b => b.dataset.target).filter(Boolean);
  function onScroll() {
    const offset = window.scrollY + headerHeight() + 12;
    let current = sectionIds[0] || null;
    for (let i = 0; i < sectionIds.length; i++) {
      const el = document.getElementById(sectionIds[i]);
      if (!el) continue;
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (offset >= top - 1) current = sectionIds[i];
    }
    // FIX: al llegar al fondo, marcar el último (pago-seguro)
    const nearBottom = window.innerHeight + window.scrollY >= (document.documentElement.scrollHeight - 2);
    if (nearBottom && sectionIds.length) current = sectionIds[sectionIds.length - 1];

    if (current) setActive(current);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // === Toggle simple entre dos paneles "Sobre mí" ===
  (function twoPanelToggle() {
    const panel1 = document.getElementById('sobre-excerpt');
    const panel2 = document.getElementById('sobre-more');
    const btnMas = document.getElementById('btn-mas-sobre');
    const btnMenos = document.getElementById('btn-menos-sobre');
    if (!panel1 || !panel2 || !btnMas) return;

    // estado inicial: panel1 visible, panel2 oculto
    panel1.style.display = '';
    panel1.setAttribute('aria-hidden', 'false');
    panel2.style.display = 'none';
    panel2.setAttribute('aria-hidden', 'true');
    btnMas.style.display = '';

    function blurIfFocusedInside(el){
      try { if (document.activeElement && el.contains(document.activeElement)) document.activeElement.blur(); } catch(e) {}
    }

    btnMas.addEventListener('click', function (e) {
      e.preventDefault();
      blurIfFocusedInside(panel1);

      // quitar panel1 del flujo y mostrar panel2
      panel1.style.display = 'none';
      panel1.setAttribute('aria-hidden', 'true');

      panel2.style.display = '';
      panel2.setAttribute('aria-hidden', 'false');
      panel2.scrollTop = 0;

      btnMas.style.display = 'none';

      // focus accesible en primer elemento del panel2
      setTimeout(() => {
        const first = panel2.querySelector('button, a, input, [tabindex]:not([tabindex="-1"])');
        if (first) first.focus();
      }, 80);
    });

    if (btnMenos) {
      btnMenos.addEventListener('click', function (e) {
        e.preventDefault();
        blurIfFocusedInside(panel2);

        panel2.style.display = 'none';
        panel2.setAttribute('aria-hidden', 'true');

        panel1.style.display = '';
        panel1.setAttribute('aria-hidden', 'false');
        panel1.scrollTop = 0;

        btnMas.style.display = '';
        btnMas.focus();
      });
    }
  })();
});

// Añadir clase .services-section al section que contiene el título "Servicios"
document.addEventListener('DOMContentLoaded', function () {
  try {
    const headings = Array.from(document.querySelectorAll('main section h2, main section h1'));
    const target = headings.find(h => h.textContent && h.textContent.trim().toLowerCase().includes('servicios'));
    if (target) {
      const sec = target.closest('section');
      if (sec) sec.classList.add('services-section');
    }
  } catch (e) { /* silent fail */ }
});

(function () {
  'use strict';

  // Utilidades
  const q = (s) => document.querySelector(s);
  const qAll = (s) => Array.from(document.querySelectorAll(s));

  document.addEventListener('DOMContentLoaded', function () {

    // ===== Header / Nav / Panels (no tocar) =====
    try {
      const header = q('.site-header');
      const logoImg = q('.logo img');
      if (header && logoImg) {
        const adjustHeader = () => {
          const logoH = logoImg.naturalHeight || logoImg.clientHeight || 44;
          const desired = Math.max(56, Math.min(100, Math.round(logoH + 12)));
          header.style.minHeight = desired + 'px';
          const mt = Math.max(0, Math.round((desired - (logoImg.clientHeight || logoH)) / 2));
          logoImg.style.marginTop = mt + 'px';
          document.documentElement.style.setProperty('--header-height', desired + 'px');
        };
        if (logoImg.complete) adjustHeader();
        else logoImg.addEventListener('load', adjustHeader);
        window.addEventListener('resize', adjustHeader);
      }

      const navButtons = qAll('.nav-btn');
      const logoLink = q('.logo-link');
      const headerHeight = () => header ? Math.ceil(header.getBoundingClientRect().height) : 0;
      const scrollToId = (id) => {
        const target = document.getElementById(id);
        if (!target) return;
        const y = target.getBoundingClientRect().top + window.scrollY - headerHeight() - 8;
        window.scrollTo({ top: Math.max(0, Math.floor(y)), behavior: 'smooth' });
      };
      const setActive = (id) => navButtons.forEach(b => b.classList.toggle('active', b.dataset.target === id));
      navButtons.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!btn.dataset.target) return;
        scrollToId(btn.dataset.target);
        setActive(btn.dataset.target);
      }));
      if (logoLink) logoLink.addEventListener('click', (e) => { e.preventDefault(); scrollToId('sobre-mi'); setActive('sobre-mi'); });
      const sectionIds = navButtons.map(b => b.dataset.target).filter(Boolean);
      const onScroll = () => {
        const offset = window.scrollY + headerHeight() + 12;
        let current = sectionIds[0] || null;
        for (let i = 0; i < sectionIds.length; i++) {
          const el = document.getElementById(sectionIds[i]);
          if (!el) continue;
          const top = el.getBoundingClientRect().top + window.scrollY;
          if (offset >= top - 1) current = sectionIds[i];
        }
        // FIX: al llegar al fondo, marcar el último (pago-seguro)
        const nearBottom = window.innerHeight + window.scrollY >= (document.documentElement.scrollHeight - 2);
        if (nearBottom && sectionIds.length) current = sectionIds[sectionIds.length - 1];

        if (current) setActive(current);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();

      // two-panel toggle
      (function () {
        const panel1 = q('#sobre-excerpt');
        const panel2 = q('#sobre-more');
        const btnMas = q('#btn-mas-sobre');
        const btnMenos = q('#btn-menos-sobre');
        if (!panel1 || !panel2 || !btnMas) return;
        panel1.style.display = '';
        panel1.setAttribute('aria-hidden', 'false');
        panel2.style.display = 'none';
        panel2.setAttribute('aria-hidden', 'true');
        btnMas.style.display = '';
        btnMas.addEventListener('click', (e) => {
          e.preventDefault();
          panel1.style.display = 'none'; panel1.setAttribute('aria-hidden', 'true');
          panel2.style.display = ''; panel2.setAttribute('aria-hidden', 'false'); panel2.scrollTop = 0;
          btnMas.style.display = 'none';
          setTimeout(() => {
            const first = panel2.querySelector('button, a, input, [tabindex]:not([tabindex="-1"])');
            if (first) first.focus();
          }, 80);
        });
        if (btnMenos) btnMenos.addEventListener('click', (e) => {
          e.preventDefault();
          panel2.style.display = 'none'; panel2.setAttribute('aria-hidden', 'true');
          panel1.style.display = ''; panel1.setAttribute('aria-hidden', 'false'); panel1.scrollTop = 0;
          btnMas.style.display = ''; btnMas.focus();
        });
      })();

      // add services-section class if heading exists
      try {
        const headings = qAll('main section h2, main section h1');
        const target = headings.find(h => h.textContent && h.textContent.trim().toLowerCase().includes('servicios'));
        if (target) {
          const sec = target.closest('section');
          if (sec) sec.classList.add('services-section');
        }
      } catch (e) { /* silent */ }
    } catch (e) {
      console.warn('init header/nav error', e);
    }

    // ===== FORM: validation + flatpickr (consolidado y único) =====
    try {
      const form = document.getElementById('form-cita');
      if (!form) return;

      const nombre = document.getElementById('nombre');
      const email = document.getElementById('email');
      const fecha = document.getElementById('fecha');
      const hora = document.getElementById('hora');
      const reservar = document.getElementById('btn-reservar');
      const spinner = document.getElementById('btn-spinner');
      const confirmEl = document.getElementById('confirmacion');

      // Flag para evitar que los listeners limpien el mensaje inmediatamente después del envío/reset
      let suppressConfirmClear = false;

      // función de validación de email solicitada (usar exactamente)
      function esEmailValido(emailValue) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(String(emailValue).trim());
      }

      // helpers errores inline
      function clearError(field) {
        if (!field) return;
        field.classList.remove('is-invalid');
        const s = (field.parentElement || field).querySelector('.input-error');
        if (s) s.remove();
      }
      function showError(field, msg) {
        if (!field) return;
        clearError(field);
        field.classList.add('is-invalid');
        const d = document.createElement('div');
        d.className = 'input-error';
        d.setAttribute('role', 'alert');
        d.textContent = msg;
        (field.parentElement || field).appendChild(d);
      }

      // leer fecha (considerar flatpickr altInput o instancia)
      function readFecha() {
        try {
          if (fecha && fecha._flatpickr && Array.isArray(fecha._flatpickr.selectedDates) && fecha._flatpickr.selectedDates.length) {
            return fecha._flatpickr.selectedDates[0];
          }
        } catch (e) {}
        const alt = q('.flatpickr-input[altinput], .flatpickr-input.altInput, .flatpickr-input');
        if (alt && alt.value && alt.value.trim()) return alt.value.trim();
        if (fecha && fecha.value && fecha.value.trim()) return fecha.value.trim();
        return '';
      }

      // validadores por campo
      function validarNombre() {
        clearError(nombre);
        if (!nombre || !nombre.value || !nombre.value.trim()) {
          showError(nombre, 'Ingresa tu nombre completo.');
          return false;
        }
        return true;
      }
      function validarEmail() {
        clearError(email);
        if (!email || !email.value || !email.value.trim()) {
          showError(email, 'Ingresa un correo electrónico.');
          return false;
        }
        if (!esEmailValido(email.value)) {
          showError(email, 'Ingresa un correo válido (ej: usuario@dominio.cl).');
          return false;
        }
        return true;
      }
      function validarFecha() {
        clearError(fecha);
        if (!readFecha()) {
          showError(fecha, 'Selecciona una fecha.');
          return false;
        }
        return true;
      }
      function validarHora() {
        clearError(hora);
        if (!hora || !hora.value || !hora.value.trim()) {
          showError(hora, 'Selecciona una hora.');
          return false;
        }
        return true;
      }

      function validarTodo() {
        const n = validarNombre();
        const e = validarEmail();
        const f = validarFecha();
        const h = validarHora();
        return n && e && f && h;
      }

      // activar/desactivar botón según validación (se ejecuta en input/change)
      // Mantener el botón siempre habilitado: quitar/ignorar cualquier intento de deshabilitar
      function setDisabled(/* state */) {
        if (!reservar) return;
        // Forzar estado habilitado (no desactivar). Esto revierte cambios previos.
        reservar.removeAttribute('disabled');
        reservar.setAttribute('aria-disabled', 'false');
        reservar.style.pointerEvents = 'auto';
      }

      function updateButton() {
        try {
          // validación parcial: no mostrar errores aquí, solo habilitar/inhabilitar
          const nombreOk = nombre && nombre.value && nombre.value.trim().length > 0;
          const emailOk = email && esEmailValido(email.value || '');
          const fechaOk = !!readFecha();
          const horaOk = hora && hora.value && hora.value.trim().length > 0;
          // Llamada segura: setDisabled ahora no deshabilita el botón
          setDisabled(!(nombreOk && emailOk && fechaOk && horaOk));
        } catch (e) {
          console.warn('updateButton error', e);
        }
      }

      // inicializar flatpickr (reintentos cortos si carga luego)
      (function initFlat(attempt = 0) {
        if (!fecha) return;
        if (window.flatpickr) {
          try {
            // asegurar tipo text para evitar comportamiento nativo en algunos móviles
            try { fecha.type = 'text'; } catch (e) {}

            // calcular fecha máxima = hoy + 14 días
            const maxDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

            flatpickr(fecha, {
              altInput: true,
              altFormat: 'd/m/Y',
              dateFormat: 'Y-m-d',
              locale: 'es',
              minDate: 'today',       // no permitir días anteriores
              maxDate: maxDate,       // sólo hasta 14 días desde hoy
              disableMobile: true,
              onChange: () => {
                try { clearError(fecha); } catch (e) {}
                try { updateButton(); } catch (e) {}
              }
            });

            // listeners sobre el altInput generado por flatpickr
            const alt = document.querySelector('.flatpickr-input[altinput], .flatpickr-input.altInput');
            if (alt) {
              alt.addEventListener('input', () => { try { updateButton(); } catch(_){} });
              alt.addEventListener('change', () => { try { updateButton(); } catch(_){} });
            }
          } catch (err) {
            console.warn('flatpickr init error', err);
          }
          return;
        }
        if (attempt < 20) setTimeout(() => initFlat(attempt + 1), 120);
      })();

      // listeners para inputs -> validar en tiempo real (email) + limpiar errores y actualizar botón
      if (nombre) {
        nombre.addEventListener('input', () => {
          clearError(nombre);
          if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = '';
          updateButton();
        });
        nombre.addEventListener('change', () => {
          clearError(nombre);
          if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = '';
          updateButton();
        });
      }

      if (email) {
        // validación en marcha: muestra error mientras el usuario escribe si el formato es inválido
        email.addEventListener('input', () => {
          // no borrar el mensaje de confirmación si está suprimido
          if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = '';
          const v = email.value || '';
          if (v && !esEmailValido(v)) {
            // mostrar error de formato en tiempo real
            clearError(email);
            showError(email, 'Formato de correo inválido.');
          } else {
            clearError(email);
          }
          updateButton();
        });
        email.addEventListener('change', () => {
          // al salir del campo, aplicar validación completa
          clearError(email);
          if (!email.value || !email.value.trim()) {
            showError(email, 'Ingresa un correo electrónico.');
          } else if (!esEmailValido(email.value)) {
            showError(email, 'Ingresa un correo válido (ej: usuario@dominio.cl).');
          }
          if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = '';
          updateButton();
        });
      }

      if (fecha) {
        fecha.addEventListener('input', () => {
          clearError(fecha);
          if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = '';
          updateButton();
        });
        fecha.addEventListener('change', () => {
          clearError(fecha);
          if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = '';
          updateButton();
        });
      }

      if (hora) {
        hora.addEventListener('input', () => {
          clearError(hora);
          if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = '';
          updateButton();
        });
        hora.addEventListener('change', () => {
          clearError(hora);
          if (!suppressConfirmClear && confirmEl) confirmEl.innerHTML = '';
          updateButton();
        });
      }

      // submit handler (REEMPLAZAR la implementación actual por esta para usar EmailJS)
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (confirmEl) confirmEl.innerHTML = '';

        if (!validarTodo()) {
          if (confirmEl) confirmEl.innerHTML = '<p class="confirm-error">Debes completar todos los campos correctamente para agendar.</p>';
          return;
        }

        // preparar datos
        const fechaVal = (fecha && fecha._flatpickr && fecha._flatpickr.selectedDates.length)
          ? fecha._flatpickr.selectedDates[0].toISOString()
          : (document.querySelector('.flatpickr-input[altinput]') || fecha).value || '';

        const templateParams = {
          nombre: nombre.value.trim(),
          email: email.value.trim(),
          fecha: fechaVal,
          hora: hora.value.trim(),
          // si tu plantilla usa to_email, puedes conservarlo; si no, eliminar
          to_email: 'di.venegasc@gmail.com'
        };

        // mostrar spinner
        if (spinner) spinner.classList.remove('d-none');

        try {
          // Service ID que proporcionaste
          const SERVICE_ID = 'service_wjxgyjn';
          // Reemplaza por tu TEMPLATE_ID (lo obtienes en Email Templates, p.ej. 'template_abcd1234')
          const TEMPLATE_ID = 'template_1kkrz0w';

          // Enviar con EmailJS
          const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);

          // DEBUG: confirmar que la promesa resolvió
          console.log('EmailJS send result:', result);

          // ocultar spinner
          if (spinner) spinner.classList.add('d-none');

          // mostrar mensaje de éxito y evitar que listeners lo borren durante el reset
          if (confirmEl) {
            suppressConfirmClear = true;
            confirmEl.classList.remove('confirm-error', 'text-danger');
            confirmEl.classList.add('confirm-success', 'text-success');
            confirmEl.setAttribute('role', 'status');
            confirmEl.setAttribute('aria-live', 'polite');
            confirmEl.style.display = 'block';
            confirmEl.style.color = 'var(--calipso)';
            confirmEl.textContent = 'Reserva enviada. Revisaremos y te contactaremos.';
            try { confirmEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
            // Mantener el mensaje visible unos segundos antes de limpiar y reactivar listeners
            setTimeout(() => {
              try { confirmEl.innerHTML = ''; confirmEl.style.display = ''; } catch (e) {}
              suppressConfirmClear = false;
            }, 5000);
          }

          // resetar formulario y calendario (ligero retraso para evitar que borre el mensaje)
          setTimeout(() => {
            try { form.reset(); } catch (e) {}
            try { if (fecha && fecha._flatpickr) fecha._flatpickr.clear(); } catch (e) {}
            updateButton();
          }, 200);
        } catch (err) {
          // fallback a mailto si falla
          if (spinner) spinner.classList.add('d-none');
          console.error('EmailJS error', err);
          if (confirmEl) confirmEl.innerHTML = '<p class="confirm-error">Error al enviar via EmailJS. Se intentará abrir tu cliente de correo.</p>';

          try {
            const subject = encodeURIComponent('Nueva reserva - sitio web');
            const body = encodeURIComponent(
              `Nombre: ${nombre.value.trim()}\nEmail: ${email.value.trim()}\nFecha: ${fechaVal}\nHora: ${hora.value.trim()}\n\nReservado desde sitio web.`
            );
            const mailto = `mailto:di.venegasc@gmail.com?subject=${subject}&body=${body}`;
            window.location.href = mailto;
          } catch (mailtoErr) {
            console.error('Mailto fallback error', mailtoErr);
            if (confirmEl) confirmEl.innerHTML = '<p class="confirm-error">No se pudo enviar el correo. Intenta nuevamente más tarde.</p>';
          }
        }
      });

    } catch (e) {
      console.warn('form init error', e);
    }

  }); // DOMContentLoaded
})();

(function formModuleRealtimeValidation(){
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('form-cita');
    if (!form) return;
    // Módulo duplicado deshabilitado (ya usamos el handler consolidado con EmailJS arriba)
    return;

    const nombre = document.getElementById('nombre');
    const email = document.getElementById('email');
    const fecha = document.getElementById('fecha');
    const hora = document.getElementById('hora');
    const reservar = document.getElementById('btn-reservar');
    const spinner = document.getElementById('btn-spinner');
    const confirmEl = document.getElementById('confirmacion');

    function esEmailValido(value) {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !!(value && typeof value === 'string' && regex.test(value.trim()));
    }

    function clearError(field) {
      if (!field) return;
      field.classList.remove('is-invalid');
      const s = (field.parentElement || field).querySelector('.input-error');
      if (s) s.remove();
    }
    function showError(field, msg) {
      if (!field) return;
      clearError(field);
      field.classList.add('is-invalid');
      const d = document.createElement('div');
      d.className = 'input-error';
      d.setAttribute('role','alert');
      d.textContent = msg;
      (field.parentElement || field).appendChild(d);
    }

    function readFecha() {
      try {
        if (fecha && fecha._flatpickr && Array.isArray(fecha._flatpickr.selectedDates) && fecha._flatpickr.selectedDates.length) {
          return fecha._flatpickr.selectedDates[0];
        }
      } catch (e) {}
      const alt = document.querySelector('.flatpickr-input[altinput], .flatpickr-input.altInput, .flatpickr-input');
      if (alt && alt.value && alt.value.trim()) return alt.value.trim();
      if (fecha && fecha.value && fecha.value.trim()) return fecha.value.trim();
      return '';
    }

    // validadores individuales (muestran error en tiempo real)
    function validarNombre() {
      clearError(nombre);
      if (!nombre || !nombre.value || !nombre.value.trim()) {
        showError(nombre, 'Ingresa tu nombre completo.');
        return false;
      }
      return true;
    }
    function validarEmail() {
      clearError(email);
      if (!email || !email.value || !email.value.trim()) {
        showError(email, 'Ingresa un correo electrónico.');
        return false;
      }
      if (!esEmailValido(email.value)) {
        showError(email, 'Ingresa un correo válido (ej: usuario@dominio.cl).');
        return false;
      }
      return true;
    }
    function validarFecha() {
      clearError(fecha);
      if (!readFecha()) {
        showError(fecha, 'Selecciona una fecha.');
        return false;
      }
      return true;
    }
    function validarHora() {
      clearError(hora);
      if (!hora || !hora.value || !hora.value.trim()) {
        showError(hora, 'Selecciona una hora.');
        return false;
      }
      return true;
    }

    // listeners en tiempo real: validan al escribir/salir del campo pero NO deshabilitan el botón
    if (nombre) {
      nombre.addEventListener('input', () => { clearError(nombre); });
      nombre.addEventListener('blur', validarNombre);
    }
    if (email) {
      email.addEventListener('input', () => {
        clearError(email);
        // validación en marcha: mostrar error si formato inválido mientras escribe
        if (email.value && !esEmailValido(email.value)) {
          clearError(email);
          showError(email, 'Formato de correo inválido.');
        } else {
          clearError(email);
        }
      });
      email.addEventListener('blur', validarEmail);
    }
    if (hora) {
      hora.addEventListener('change', () => { clearError(hora); });
      hora.addEventListener('blur', validarHora);
    }

    // inicializar flatpickr sin bloquear y asegurar altInput escucha
    (function initFlat(attempt = 0) {
      if (!fecha) return;
      if (window.flatpickr) {
        try {
          // asegurar tipo text para evitar comportamiento nativo en algunos móviles
          try { fecha.type = 'text'; } catch (e) {}

          // calcular fecha máxima = hoy + 14 días
          const maxDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

          flatpickr(fecha, {
            altInput: true,
            altFormat: 'd/m/Y',
            dateFormat: 'Y-m-d',
            locale: 'es',
            minDate: 'today',
            maxDate: maxDate,
            disableMobile: true,
            onChange: function() {
              clearError(fecha);
            }
          });

          const alt = document.querySelector('.flatpickr-input[altinput], .flatpickr-input.altInput');
          if (alt) {
            alt.addEventListener('input', () => clearError(fecha));
            alt.addEventListener('change', () => clearError(fecha));
          }
        } catch (err) { console.warn('flatpickr init error', err); }
        return;
      }
      if (attempt < 20) setTimeout(() => initFlat(attempt + 1), 120);
    })();

    // submit: validar todo, mostrar mensaje global si falla, si OK abrir mailto a di.venegasc@gmail.com
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (confirmEl) confirmEl.innerHTML = '';

      const okNombre = validarNombre();
      const okEmail = validarEmail();
      const okFecha = validarFecha();
      const okHora = validarHora();

      if (!(okNombre && okEmail && okFecha && okHora)) {
        if (confirmEl) confirmEl.innerHTML = '<p class="confirm-error">Debes completar todos los campos correctamente para agendar.</p>';
        const first = form.querySelector('.input-error');
        if (first) {
          const fld = first.previousElementSibling || first.parentElement.querySelector('input,select,textarea');
          if (fld) fld.focus();
        }
        return;
      }

      // armado de mailto hacia di.venegasc@gmail.com
      const fechaVal = (fecha && fecha._flatpickr && fecha._flatpickr.selectedDates.length)
        ? fecha._flatpickr.selectedDates[0].toLocaleString()
        : ((document.querySelector('.flatpickr-input[altinput]') || fecha) && (document.querySelector('.flatpickr-input[altinput]') || fecha).value);

      const subject = encodeURIComponent('Nueva reserva - sitio web');
      const body = encodeURIComponent(
        `Nombre: ${nombre.value.trim()}\nEmail: ${email.value.trim()}\nFecha: ${fechaVal}\nHora: ${hora.value.trim()}\n\nReservado desde sitio web.`
      );
      const mailto = `mailto:di.venegasc@gmail.com?subject=${subject}&body=${body}`;

      // abrir cliente de correo
      window.location.href = mailto;

      if (spinner) spinner.classList.remove('d-none');
      setTimeout(() => {
        if (spinner) spinner.classList.add('d-none');
        if (confirmEl) confirmEl.innerHTML = '<p class="confirm-success">Se abrió tu cliente de correo para enviar la reserva.</p>';
        form.reset();
        try { if (fecha && fecha._flatpickr) fecha._flatpickr.clear(); } catch (e) {}
      }, 700);
    });
  });
})();

// MercadoPago: el botón estilizado dispara el nativo generado por el script oficial
document.addEventListener('DOMContentLoaded', () => {
  const styledBtn = document.getElementById('btn-mercadopago');
  if (!styledBtn) return;

  const findNativeBtn = () =>
    document.querySelector('a.mercadopago-button, button.mercadopago-button');

  styledBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const native = findNativeBtn();
    if (native) native.click();
    else console.warn('MercadoPago: botón nativo aún no está disponible.');
  });
});

// Limpieza temporal del flujo Webpay: sin backend ni sandbox
document.addEventListener('DOMContentLoaded', () => {
  // 1) Limpiar cualquier parámetro de retorno previo en la URL y mensajes
  try {
    const url = new URL(location.href);
    const paramsToRemove = ['payment','token','TBK_TOKEN','status','provider_status','transaction','meta'];
    const hadParams = paramsToRemove.some(k => url.searchParams.has(k));
    if (hadParams) {
      paramsToRemove.forEach(k => url.searchParams.delete(k));
      history.replaceState({}, document.title, url.toString());
    }
    const confirmEl = document.getElementById('confirmacion');
    if (confirmEl) {
      confirmEl.classList.remove('text-success','text-danger');
      if (confirmEl.dataset.userMessage !== '1') confirmEl.textContent = '';
    }
  } catch (_) {}

  // FIX: si existe el formulario Webpay real, no interceptar ni clonar el botón
  if (document.getElementById('webpay-form')) {
    return; // deja que el submit haga POST a Webpay
  }

  // 2) Fallback solo si NO existe el formulario real (ambiente viejo)
  const btnWebpay = document.getElementById('btn-webpay');
  if (btnWebpay) {
    const clone = btnWebpay.cloneNode(true); // elimina listeners previos
    clone.disabled = false;
    clone.title = 'El pago estará disponible pronto';
    clone.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Pronto integraremos el nuevo flujo de pago. Por ahora este botón no inicia transacciones.');
    });
    btnWebpay.replaceWith(clone);
  }
});

// Ajuste de unidad de viewport para móviles (100vh real)
document.addEventListener('DOMContentLoaded', function () {
  const setVh = () => {
    const h = (window.visualViewport?.height || window.innerHeight) * 0.01;
    document.documentElement.style.setProperty('--vh', `${h}px`);
  };
  setVh();
  window.addEventListener('resize', setVh);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', setVh);
});

// Fondo bloque pagos: mismo patrón que hero/áreas usando .block-bg + --bg-url
document.addEventListener('DOMContentLoaded', function () {
  const sec = document.querySelector('#pago-seguro, #pago, #pagos');
  if (!sec) return;

  // asegura la clase y el nodo .block-bg como primer hijo
  if (!sec.classList.contains('payments-section')) sec.classList.add('payments-section');
  let bg = sec.querySelector(':scope > .block-bg');
  if (!bg) {
    bg = document.createElement('div');
    bg.className = 'block-bg';
    sec.prepend(bg);
  }

  // intenta cargar en este orden (como en los otros bloques)
  const candidates = [
    './assets/bg-payments.webp',
    './assets/bg-payments@2x.webp',
    './assets/bg-payments.jpg',
    './assets/bg-payments.jpeg',
    './assets/bg-payments.png'
  ];

  

  const load = (i = 0) => {
    if (i >= candidates.length) return;
    const src = candidates[i];
    const img = new Image();
    img.onload = () => {
      // fija la variable que consume .block-bg::before
      bg.style.setProperty('--bg-url', `url("${src}")`);
      console.debug('payments background set:', src);
    };
    img.onerror = () => load(i + 1);
    img.src = src;
  };
  load();
});

/* Scroll-spy robusto + activar al click (mantiene clases/IDs existentes) */
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const navBtns = Array.from(document.querySelectorAll('.header-nav .nav-btn'));

  const headerHeight = () => Math.ceil(header?.getBoundingClientRect().height || 0);
  const setActive = (id) => navBtns.forEach(b => b.classList.toggle('active', b.dataset.target === id));
  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight() - 8;
    window.scrollTo({ top: Math.max(0, Math.floor(top)), behavior: 'smooth' });
  };

  // Marca activo inmediatamente al click y luego hace scroll
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.target;
      if (!id) return;
      setActive(id);
      scrollToId(id);
    });
  });

  // Scroll-spy con corrección cuando se llega al fondo (bloque pago)
  const sectionIds = navBtns.map(b => b.dataset.target).filter(Boolean);
  const onScroll = () => {
    const offset = window.scrollY + headerHeight() + 12;
    let current = sectionIds[0] || null;
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (offset >= top - 1) current = id;
    }
    // Si estamos pegados al final del documento, forzar el último (pago-seguro)
    const nearBottom = window.innerHeight + window.scrollY >= (document.documentElement.scrollHeight - 2);
    if (nearBottom && sectionIds.length) current = sectionIds[sectionIds.length - 1];
    if (current) setActive(current);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
});

// Quita el intercept que mostraba el popup y deja enviar el form real
document.addEventListener('DOMContentLoaded', () => {
  // Limpia posibles parámetros de retorno
  try {
    const url = new URL(location.href);
    ['payment','token','TBK_TOKEN','status','provider_status','transaction','meta']
      .forEach(k => url.searchParams.delete(k));
    history.replaceState({}, document.title, url.toString());
  } catch (_) {}

  const form = document.getElementById('webpay-form');
  const btnWebpay = document.getElementById('btn-webpay');

  if (form && btnWebpay) {
    btnWebpay.disabled = false;
    btnWebpay.title = 'Pagar con Webpay';
    // No reemplazar ni prevenir el submit (se deja funcional)
    return;
  }

  // Fallback solo si no existe el form (ambiente sin HTML actualizado)
  const fallbackBtn = document.getElementById('btn-webpay');
  if (fallbackBtn) {
    const clone = fallbackBtn.cloneNode(true);
    clone.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Pronto integraremos el nuevo flujo de pago. Por ahora este botón no inicia transacciones.');
    });
    fallbackBtn.replaceWith(clone);
  }
});

// Integración Webpay: sincroniza el monto desde data-price o el precio visible
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('webpay-form');
  const btn = document.getElementById('btn-webpay');
  const montoInput = document.getElementById('webpay-monto');
  if (!form || !btn || !montoInput) return;

  const syncAmount = () => {
    let amount = btn.dataset.price || (document.getElementById('precio-servicio')?.textContent || '');
    amount = String(amount).replace(/[^\d]/g, '');
    if (amount) montoInput.value = amount;
  };

  syncAmount();
  btn.addEventListener('click', syncAmount);
  form.addEventListener('submit', syncAmount);
});

// Scroll suave para botones del header
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    let targetId = btn.dataset.target;
    // compatibilidad si aún existe algún botón apuntando a "servicios"
    if (targetId === 'servicios') targetId = 'form-cita-section';
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Scroll suave para "Agendar ahora" (dentro de Servicios) hacia #form-cita-section
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('a[href="#form-cita-section"]');
  if (!links.length) return;

  const header = document.querySelector('.site-header');
  const headerH = () => Math.ceil(header?.getBoundingClientRect().height || 0);

  const go = (e) => {
    e.preventDefault();
    const target = document.getElementById('form-cita-section');
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - headerH() - 8;
    window.scrollTo({ top: Math.max(0, Math.floor(top)), behavior: 'smooth' });
  };

  links.forEach(a => a.addEventListener('click', go));
});