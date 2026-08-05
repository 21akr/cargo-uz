/* ═══════════════════════════════════════════════════════════════════
   Общие помощники. Раньше esc() был скопирован в трёх местах,
   fmt() и определение API-адреса — в двух. Теперь по одному разу.

   Подключается ПЕРВЫМ, до carriers.js и до основного скрипта.
   ═══════════════════════════════════════════════════════════════════ */
window.CargoUtils = (function () {

  /* ── текст ──────────────────────────────────────────────────────── */

  // Экранирование перед вставкой в DOM. Главная защита от HTML-инъекций.
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  // 9.50 → «9.5», 28.00 → «28», 27.45 → «27.45»
  function fmt(n) {
    return Number(n).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  /* ── тарифы ─────────────────────────────────────────────────────── */

  // tiers: [{to:10,rate:9.5},{to:45,rate:9},{to:null,rate:8.5}] → ставка
  // to:null означает «и всё, что выше». null на входе = цена неизвестна.
  function rateFromTiers(tiers, w) {
    if (!tiers || !tiers.length) return null;
    for (const t of tiers) { if (t.to == null || w <= t.to) return t.rate; }
    return tiers[tiers.length - 1].rate;
  }

  /* ── номера партий ──────────────────────────────────────────────── */

  // Две схемы: «215-AVIA» (число + слово) и «AV-24 / AT-14» (CHIN).
  // Должно совпадать с normalizeBatchNo() на бэкенде.
  function normBatch(input) {
    const s = String(input).trim();
    let m = s.match(/(\d{1,4})\s*[-–—]?\s*(avia|avto)/i);
    if (m) return m[1] + '-' + m[2].toUpperCase();
    m = s.match(/\b(av|at)\s*[-–—]?\s*(\d{1,4})\b/i);
    if (m) return m[1].toUpperCase() + '-' + m[2];
    return s.toUpperCase();
  }

  /* ── время ──────────────────────────────────────────────────────── */

  function ago(iso) {
    const t = new Date(iso).getTime();
    if (!isFinite(t)) return '';
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'только что';
    if (s < 3600) return Math.floor(s / 60) + ' мин назад';
    if (s < 86400) return Math.floor(s / 3600) + ' ч назад';
    return Math.floor(s / 86400) + ' дн назад';
  }

  /* ── бэкенд / Telegram ──────────────────────────────────────────── */

  // Пусто → офлайн-режим (localStorage). Задано → API-режим (v2).
  function apiBase() {
    let ls = '';
    try { ls = localStorage.getItem('cargo_api_base') || ''; } catch (e) { }
    return String(window.CARGO_API_BASE || ls || '').replace(/\/+$/, '');
  }

  function initData() {
    return (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) || '';
  }

  // Тактильный отклик в Telegram. В обычном браузере молча ничего не делает.
  function haptic(style) {
    try { Telegram.WebApp.HapticFeedback.impactOccurred(style || 'light'); } catch (e) { }
  }

  function tgLink(handle, label) {
    const h = String(handle).replace(/^@/, '');
    return '<a href="https://t.me/' + esc(h) + '" target="_blank" rel="noopener">' + esc(label) + '</a>';
  }

  /* ── анимация ───────────────────────────────────────────────────── */

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /**
   * FLIP: перерисовываем список — и он не прыгает, а переезжает.
   * Запоминаем позиции по data-key, зовём render(), считаем смещение,
   * ставим элемент «назад» трансформом и отпускаем в следующем кадре.
   * При prefers-reduced-motion просто перерисовывает без анимации.
   */
  function flip(container, selector, renderFn, ms) {
    if (!container) { renderFn(); return; }
    if (reducedMotion()) { renderFn(); return; }

    const first = new Map();
    container.querySelectorAll(selector).forEach(n => {
      if (n.dataset.key) first.set(n.dataset.key, n.getBoundingClientRect().top);
    });

    renderFn();

    const moved = [];
    container.querySelectorAll(selector).forEach(n => {
      const prev = first.get(n.dataset.key);
      if (prev == null) return;
      const delta = prev - n.getBoundingClientRect().top;
      if (!delta) return;
      n.style.transition = 'none';
      n.style.transform = 'translateY(' + delta + 'px)';
      moved.push(n);
    });
    if (!moved.length) return;

    // Принудительный reflow вместо requestAnimationFrame: rAF не срабатывает
    // в фоновой вкладке, и карточки застряли бы сдвинутыми.
    void container.offsetHeight;

    moved.forEach(n => {
      n.style.transition = 'transform ' + (ms || 620) + 'ms cubic-bezier(.22,1,.36,1)';
      n.style.transform = '';
    });
  }

  return { esc, fmt, rateFromTiers, normBatch, ago, apiBase, initData, haptic, tgLink, reducedMotion, flip };
})();
