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

    function blurIfFocusedInside(el) {
      try { if (document.activeElement && el.contains(document.activeElement)) document.activeElement.blur(); } catch (e) { }
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

  // util
  const q = (s) => document.querySelector(s);
  const qAll = (s) => Array.from(document.querySelectorAll(s));

  // Overlay helpers (idempotente)
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
        ov.innerHTML = `<div class="box"><div class="spinner" aria-hidden="true"></div><div class="msg">Procesando...</div></div>`;
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

  // Main initialization when DOM ready
  document.addEventListener('DOMContentLoaded', function () {

    // ===== Header / Nav / basic UI =====
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

      // Two-panel "Sobre mí" toggle (idempotent)
      (function twoPanelToggle() {
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
        function blurIfFocusedInside(el) {
          try { if (document.activeElement && el.contains(document.activeElement)) document.activeElement.blur(); } catch (e) { }
        }
        btnMas.addEventListener('click', (e) => {
          e.preventDefault();
          blurIfFocusedInside(panel1);
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
          blurIfFocusedInside(panel2);
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

    // ===== FORM + AGENDA (migrado a agendar.js) =====
    // Form + Agenda moved to agendar.js — see c:\Users\diven\OneDrive\Escritorio\Pagina web\agendar.js
    // ===== Misc UI / payments / viewport fixes =====

    // viewport 100vh fix
    (function setVh() {
      const set = () => {
        const h = (window.visualViewport?.height || window.innerHeight) * 0.01;
        document.documentElement.style.setProperty('--vh', `${h}px`);
      };
      set();
      window.addEventListener('resize', set);
      if (window.visualViewport) window.visualViewport.addEventListener('resize', set);
    })();

    // payments background loader (idempotent)
    (function paymentsBg() {
      const sec = document.querySelector('#pago-seguro, #pago, #pagos');
      if (!sec) return;
      if (!sec.classList.contains('payments-section')) sec.classList.add('payments-section');
      let bg = sec.querySelector(':scope > .block-bg');
      if (!bg) {
        bg = document.createElement('div');
        bg.className = 'block-bg';
        sec.prepend(bg);
      }
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
        img.onload = () => { bg.style.setProperty('--bg-url', `url("${src}")`); };
        img.onerror = () => load(i + 1);
        img.src = src;
      };
      load();
    })();

    // simple scroll-spy for header nav (idempotent)
    (function scrollSpy() {
      const header = document.querySelector('.site-header');
      const navBtns = Array.from(document.querySelectorAll('.header-nav .nav-btn'));
      if (!navBtns.length) return;
      const headerHeight = () => Math.ceil(header?.getBoundingClientRect().height || 0);
      const setActive = (id) => navBtns.forEach(b => b.classList.toggle('active', b.dataset.target === id));
      const scrollToId = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - headerHeight() - 8;
        window.scrollTo({ top: Math.max(0, Math.floor(top)), behavior: 'smooth' });
      };
      navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const id = btn.dataset.target;
          if (!id) return;
          setActive(id);
          scrollToId(id);
        });
      });
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
        const nearBottom = window.innerHeight + window.scrollY >= (document.documentElement.scrollHeight - 2);
        if (nearBottom && sectionIds.length) current = sectionIds[sectionIds.length - 1];
        if (current) setActive(current);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    })();

    // webpay/webpay fallback: idempotent
    (function webpayFallback() {
      try {
        const url = new URL(location.href);
        ['payment', 'token', 'TBK_TOKEN', 'status', 'provider_status', 'transaction', 'meta'].forEach(k => url.searchParams.delete(k));
        history.replaceState({}, document.title, url.toString());
      } catch (_) { }
      if (document.getElementById('webpay-form')) return;
      const btnWebpay = document.getElementById('btn-webpay');
      if (btnWebpay) {
        const clone = btnWebpay.cloneNode(true);
        clone.disabled = false;
        clone.title = 'El pago estará disponible pronto';
        clone.addEventListener('click', (e) => {
          e.preventDefault();
          alert('Pronto integraremos el nuevo flujo de pago. Por ahora este botón no inicia transacciones.');
        });
        btnWebpay.replaceWith(clone);
      }
    })();

    // webpay amount sync
    (function webpaySync() {
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
    })();

    // smooth scroll for header nav buttons (compat)
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        let targetId = btn.dataset.target;
        // compatibilidad si aún existe algún botón apuntando a "servicios"
        if (targetId === 'servicios') targetId = 'form-cita-section';
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // "Agendar ahora" anchors to #form-cita-section
    (function agendarAhora() {
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
    })();

    // email live validation placeholder (noop)
    (function emailLiveValidation() { /* intentionally disabled */ })();

  }); // end DOMContentLoaded

})(); // end module

// Limpieza temporal del flujo Webpay: sin backend ni sandbox
document.addEventListener('DOMContentLoaded', () => {
  // 1) Limpiar cualquier parámetro de retorno previo en la URL y mensajes
  try {
    const url = new URL(location.href);
    const paramsToRemove = ['payment', 'token', 'TBK_TOKEN', 'status', 'provider_status', 'transaction', 'meta'];
    const hadParams = paramsToRemove.some(k => url.searchParams.has(k));
    if (hadParams) {
      paramsToRemove.forEach(k => url.searchParams.delete(k));
      history.replaceState({}, document.title, url.toString());
    }
    const confirmEl = document.getElementById('confirmacion');
    if (confirmEl) {
      confirmEl.classList.remove('text-success', 'text-danger');
      if (confirmEl.dataset.userMessage !== '1') confirmEl.textContent = '';
    }
  } catch (_) { }

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
    ['payment', 'token', 'TBK_TOKEN', 'status', 'provider_status', 'transaction', 'meta']
      .forEach(k => url.searchParams.delete(k));
    history.replaceState({}, document.title, url.toString());
  } catch (_) { }
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

(function emailLiveValidation() {
  // Desactivado para evitar el mensaje P1 ("Formato de correo no válido" / "Ingresa tu correo").
  // La validación y el mensaje P2 quedan a cargo del bloque principal (showError/clearError).
})();

// Overlay global: helpers + estilos (idempotente)
(function overlayHelpers() {
  if (window.showOverlay && window.hideOverlay) return;

  function ensureOverlay() {
    let ov = document.getElementById('page-loading-overlay');
    // inyectar estilos una sola vez
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
      ov.innerHTML = `<div class="box"><div class="spinner" aria-hidden="true"></div><div class="msg">Procesando...</div></div>`;
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