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
      if (offset >= top) current = sectionIds[i];
    }
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
          if (offset >= top) current = sectionIds[i];
        }
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

/* Nuevo código: manejo DOM, flatpickr, formulario (EmailJS) y pagos simulados */
document.addEventListener('DOMContentLoaded', function () {
  // Navegación smooth
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Toggle "Más sobre mi"
  const sobreMas = document.getElementById('btn-mas-sobre');
  const sobreMenos = document.getElementById('btn-menos-sobre');
  const excerpt = document.getElementById('sobre-excerpt');
  const more = document.getElementById('sobre-more');
  if (sobreMas && sobreMenos && excerpt && more) {
    sobreMas.addEventListener('click', () => {
      excerpt.style.display = 'none';
      excerpt.setAttribute('aria-hidden', 'true');
      more.style.display = '';
      more.setAttribute('aria-hidden', 'false');
      more.querySelector('button')?.focus();
    });
    sobreMenos.addEventListener('click', () => {
      more.style.display = 'none';
      more.setAttribute('aria-hidden', 'true');
      excerpt.style.display = '';
      excerpt.setAttribute('aria-hidden', 'false');
      sobreMas.focus();
    });
  }

  // flatpickr init
  if (window.flatpickr) {
    flatpickr("#fecha", {
      locale: "es",
      minDate: "today",
      dateFormat: "d-m-Y",
      disableMobile: true,
      altInput: true,
      altFormat: "d \\de F \\de Y",
    });
  }

  // Formulario: EmailJS
  const form = document.getElementById('form-cita');
  const btnReservar = document.getElementById('btn-reservar');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const confirmEl = document.getElementById('confirmacion');

  // Reemplazar con tus IDs de EmailJS (service_..., template_...)
  const EMAILJS_SERVICE = 'SERVICE_ID';
  const EMAILJS_TEMPLATE = 'TEMPLATE_ID';

  function setLoading(on) {
    if (!btnReservar) return;
    if (on) {
      btnReservar.disabled = true;
      btnSpinner.classList.remove('d-none');
      btnText.textContent = 'Enviando...';
    } else {
      btnReservar.disabled = false;
      btnSpinner.classList.add('d-none');
      btnText.textContent = 'Reservar cita';
    }
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // Validación básica HTML5
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }

      const nombre = document.getElementById('nombre')?.value.trim();
      const email = document.getElementById('email')?.value.trim();
      const fecha = document.getElementById('fecha')?.value.trim();
      const hora = document.getElementById('hora')?.value.trim();

      setLoading(true);
      confirmEl.textContent = '';

      const templateParams = {
        nombre,
        email,
        fecha,
        hora,
        servicio: document.querySelector('#precio-servicio')?.textContent || 'Sesión'
      };

      // Uso de EmailJS desde el cliente (ya inicializaste la key en index.html)
      // IMPORTANTE: reemplazar EMAILJS_SERVICE y EMAILJS_TEMPLATE por tus valores reales.
      if (EMAILJS_SERVICE === 'SERVICE_ID' || EMAILJS_TEMPLATE === 'TEMPLATE_ID') {
        // Simulación en cliente (si no configuraste EmailJS aún)
        setTimeout(() => {
          setLoading(false);
          confirmEl.textContent = 'Solicitud recibida (simulación). Revisa tu correo para confirmar.';
          form.reset();
        }, 900);
        return;
      }

      emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, templateParams)
        .then(() => {
          setLoading(false);
          confirmEl.textContent = 'Reserva enviada. Revisa tu correo para confirmar la sesión.';
          form.reset();
        }, (err) => {
          setLoading(false);
          console.error('EmailJS error:', err);
          confirmEl.textContent = 'Ocurrió un error al enviar. Intenta nuevamente o contacta por WhatsApp.';
        });
    });
  }

  // Pagos (simulación / placeholders)
  const btnWebpay = document.getElementById('btn-webpay');
  const btnMP = document.getElementById('btn-mercadopago');

  // En vez de mostrar un alert local, invocamos la función que llama al backend y redirige
  if (btnWebpay) {
    btnWebpay.addEventListener('click', (e) => {
      e.preventDefault();
      const price = Number(btnWebpay.dataset.price || '30000');
      payWithWebpay(price);
    });
  }

  if (btnMP) {
    btnMP.addEventListener('click', (e) => {
      e.preventDefault();
      const price = Number(btnMP.dataset.price || '30000');
      // placeholder para MercadoPago — cambiar por llamada a función backend cuando la implementes
      alert('Pago de MercadoPago todavía no implementado (simulación).');
    });
  }

  // Ajuste: calcular altura del header y exponerla en CSS para offsets
  const headerEl = document.querySelector('.site-header');

  function setHeaderHeightVar() {
    const h = headerEl ? headerEl.offsetHeight : 0;
    document.documentElement.style.setProperty('--header-height', `${h}px`);
  }
  setHeaderHeightVar();
  window.addEventListener('resize', setHeaderHeightVar);

  // Smooth scroll teniendo en cuenta el header (mejor que scrollIntoView si header es fixed)
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = btn.dataset.target;
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (!target) return;

      const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || (headerEl ? headerEl.offsetHeight : 0);
      const extra = 12; // espacio adicional opcional
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - extra;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  async function payWithWebpay(amount = 30000) {
    const btn = document.getElementById('btn-webpay');
    const origText = btn?.textContent || 'Pagar';
    try {
      if (btn) { btn.disabled = true; btn.textContent = 'Iniciando pago...'; }
      const res = await fetch('/.netlify/functions/create-webpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const json = await res.json();
      if (!json || !json.url) {
        console.error('Respuesta inválida de create-webpay:', json);
        alert('No se pudo iniciar el pago. Revisa la consola.');
        return;
      }
      // Redirigir en la misma pestaña (mejor para probar return_url local)
      window.location.href = json.url;
    } catch (err) {
      console.error('Error iniciando Webpay:', err);
      alert('Error iniciando el pago (ver consola).');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
    }
  }

  // Vincular al botón (asegúrate que el DOM tiene #btn-webpay)
  document.addEventListener('DOMContentLoaded', () => {
    const btnWebpay = document.getElementById('btn-webpay');
    if (btnWebpay) {
      btnWebpay.addEventListener('click', (e) => {
        e.preventDefault();
        const price = Number(btnWebpay.dataset.price || '30000');
        payWithWebpay(price);
      });
    }
  });

  // Añade esto en el archivo JS que controla el botón de pago (reemplaza el selector si es necesario)
  async function iniciarPago(amount) {
    // abrir ventana de forma síncrona para evitar bloqueo de popup
    const win = window.open('', '_blank');
    try {
      const resp = await fetch('/.netlify/functions/create-webpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error('create-webpay HTTP error', resp.status, text);
        win.close();
        alert('No se pudo iniciar el pago. Revisa la consola.');
        return;
      }

      const json = await resp.json();
      console.log('create-webpay response', json);

      const checkoutUrl = json.checkoutUrl || (json.body && json.body.url) || (json.body && json.body.initPoint) || null;
      const token = json.token || (json.body && (json.body.token || json.body.token_ws));

      if (checkoutUrl) {
        win.location.href = checkoutUrl;
        return;
      }

      if (token) {
        const returnUrl = new URL(window.location.origin + '/.netlify/functions/webpay-return');
        returnUrl.searchParams.set('token_ws', token);
        win.location.href = returnUrl.toString();
        return;
      }

      console.error('No checkoutUrl ni token en respuesta', json);
      win.close();
      alert('Respuesta inválida del servidor. Revisa la consola.');

    } catch (err) {
      console.error('Error iniciando pago', err);
      try { win.close(); } catch (e) {}
      alert('Error de red. Revisa la consola.');
    }
  }

  // Ejemplo de conexión al botón (ajusta selector)
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('#btn-pagar-webpay') || document.querySelector('[data-pay-webpay]');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); iniciarPago(30000); });
  });
});

{
  // Reemplaza la función payWithWebpay / duplicados por esta implementación única
  async function iniciarPago(amount = 30000, btnEl = null) {
    // abrir ventana de forma síncrona en el click para evitar bloqueo
    const win = window.open('', '_blank');
    if (btnEl) {
      btnEl.dataset._origText = btnEl.textContent || '';
      btnEl.disabled = true;
      btnEl.textContent = 'Iniciando pago...';
    }

    try {
      const resp = await fetch('/.netlify/functions/create-webpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error('create-webpay HTTP error', resp.status, txt);
        win.close();
        alert('No se pudo iniciar el pago. Revisa la consola.');
        return;
      }

      const json = await resp.json();
      console.log('create-webpay response', json);

      // soportar varias formas de respuesta del backend (mock/SDK/rest)
      const checkoutUrl =
        json.checkoutUrl ||
        json.url ||
        (json.body && (json.body.url || json.body.initPoint)) ||
        (json.data && (json.data.url));
      const token =
        json.token ||
        json.token_ws ||
        (json.body && (json.body.token || json.body.token_ws)) ||
        (json.data && (json.data.token || json.data.token_ws));

      if (checkoutUrl) {
        win.location.href = checkoutUrl;
        return;
      }

      if (token) {
        const returnUrl = new URL(window.location.origin + '/.netlify/functions/webpay-return');
        returnUrl.searchParams.set('token_ws', token);
        win.location.href = returnUrl.toString();
        return;
      }

      console.error('Respuesta inválida de create-webpay (sin checkoutUrl ni token):', json);
      win.close();
      alert('Respuesta inválida del servidor. Revisa la consola.');
    } catch (err) {
      console.error('Error iniciando pago', err);
      try { win.close(); } catch (e) { /* ignore */ }
      alert('Error de red. Revisa la consola.');
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = btnEl.dataset._origText || 'Pagar';
        delete btnEl.dataset._origText;
      }
    }
  }

  // Asegurar un único listener que use iniciarPago
  const existingBtn = document.getElementById('btn-webpay') || document.querySelector('[data-pay-webpay]');
  if (existingBtn) {
    // quitar listeners previos por seguridad
    existingBtn.replaceWith(existingBtn.cloneNode(true));
    const btn = document.getElementById('btn-webpay') || document.querySelector('[data-pay-webpay]');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const price = Number(btn.dataset.price || '30000');
      iniciarPago(price, btn);
    });
  }
}
{
  // Elimina/ignora cualquier otra definición duplicada de iniciarPago o payWithWebpay
  // (no añadir más handlers aquí)
}