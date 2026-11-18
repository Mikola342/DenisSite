(() => {
  'use strict';

  const STORAGE_KEY = 'pc_profit_tracker_v1';

  const COMPONENT_CATEGORIES = [
    'Процессор (CPU)',
    'Видеокарта (GPU)',
    'Материнская плата',
    'Оперативная память (RAM)',
    'Охлаждение (Кулер / СЖО)',
    'Накопитель (SSD / HDD)',
    'Блок питания (PSU)',
    'Корпус (Case)',
    'Доп. расходы (вентиляторы, термопаста, доставка)',
    'Другое'
  ];

  const DEFAULT_BUILD_SLOTS = [
    'Процессор (CPU)',
    'Видеокарта (GPU)',
    'Материнская плата',
    'Оперативная память (RAM)',
    'Охлаждение (Кулер / СЖО)',
    'Накопитель (SSD / HDD)',
    'Блок питания (PSU)',
    'Корпус (Case)',
    'Доп. расходы (вентиляторы, термопаста, доставка)'
  ];

  const SOURCE_OPTIONS = [
    'Авито Б/У',
    'Новое (DNS / Ситилинк)',
    'Озон / WB',
    'AliExpress',
    'Свое / Запас',
    'Другое'
  ];

  const PART_CATEGORIES = [
    'Видеокарта (GPU)',
    'Процессор (CPU)',
    'Материнская плата',
    'Оперативная память (RAM)',
    'Комплект (Мать + Проц + ОЗУ)',
    'Накопитель (SSD / HDD)',
    'Охлаждение (Кулер / СЖО)',
    'Блок питания (PSU)',
    'Корпус (Case)',
    'Монитор / Периферия',
    'Ноутбук / Консоль',
    'Другое'
  ];

  const STATUS_META = {
    building: { label: '🔧 В сборке', className: 'status-building' },
    for_sale: { label: '🏷️ В продаже', className: 'status-for_sale' },
    sold: { label: '✅ Продан', className: 'status-sold' }
  };

  const PART_STATUS_META = {
    for_sale: { label: '📦 В продаже', className: 'status-for_sale' },
    sold: { label: '✅ Продано', className: 'status-sold' }
  };

  let state = null;
  let currentRoute = 'home';
  let currentFilter = 'all';
  let currentSort = 'newest';
  let searchQuery = '';
  let partsFilter = 'all';
  let partsSort = 'newest';
  let partsSearchQuery = '';
  let currentPcId = null;
  let isServerAvailable = false;
  let serverSyncTimer = null;

  // DOM helpers
  const $ = (id) => document.getElementById(id);

  function uid(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toNum(val) {
    if (val === '' || val === null || val === undefined) return 0;
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  }

  function formatMoney(amount, withSign = false) {
    const num = Math.round(toNum(amount) * 100) / 100;
    const absFormatted = new Intl.NumberFormat('ru-RU', {
      maximumFractionDigits: 2
    }).format(Math.abs(num));
    const cur = state ? state.currency : '₽';
    if (num < 0) return `-${absFormatted} ${cur}`;
    if (withSign && num > 0) return `+${absFormatted} ${cur}`;
    return `${absFormatted} ${cur}`;
  }

  function formatPercent(val) {
    const num = Number.isFinite(val) ? val : 0;
    const rounded = Math.round(num * 10) / 10;
    return `${rounded > 0 ? '+' : ''}${rounded}%`;
  }

  // Calculations
  function getComponentTotal(comp) {
    return toNum(comp.qty) * toNum(comp.price);
  }

  function getAssemblyCost(pc) {
    if (!pc || !Array.isArray(pc.components)) return 0;
    return pc.components.reduce((sum, c) => sum + getComponentTotal(c), 0);
  }

  function getNetProfit(pc) {
    return toNum(pc.salePrice) - getAssemblyCost(pc);
  }

  function getRoiPercent(pc) {
    const cost = getAssemblyCost(pc);
    if (cost <= 0) return 0;
    return (getNetProfit(pc) / cost) * 100;
  }

  function getPartInvested(part) {
    return toNum(part.qty) * toNum(part.buyPrice) + toNum(part.extraCost);
  }

  function getPartProfit(part) {
    return toNum(part.salePrice) - getPartInvested(part);
  }

  function getPartRoi(part) {
    const invested = getPartInvested(part);
    if (invested <= 0) return 0;
    return (getPartProfit(part) / invested) * 100;
  }

  function createDemoParts() {
    return [
      {
        id: 'part-demo-1',
        category: 'Видеокарта (GPU)',
        name: 'Palit RTX 3070 GamingPro 8GB',
        source: 'Авито Б/У',
        status: 'sold',
        qty: 1,
        buyPrice: 22500,
        extraCost: 500,
        salePrice: 29500,
        boughtAt: '2026-11-08',
        soldAt: '2026-11-11',
        notes: 'Обслужил, заменил термопасту (500 ₽), продал после тестов.'
      },
      {
        id: 'part-demo-2',
        category: 'Комплект (Мать + Проц + ОЗУ)',
        name: 'Комплект Ryzen 5 3600 + MSI B450M',
        source: 'Авито Б/У',
        status: 'sold',
        qty: 1,
        buyPrice: 9500,
        extraCost: 0,
        salePrice: 13200,
        boughtAt: '2026-11-02',
        soldAt: '2026-11-06',
        notes: 'Продал целиком комплектом через Авито Доставку.'
      },
      {
        id: 'part-demo-3',
        category: 'Оперативная память (RAM)',
        name: 'Kingston Fury Renegade 32GB (2x16) DDR4',
        source: 'Озон / WB',
        status: 'for_sale',
        qty: 1,
        buyPrice: 4800,
        extraCost: 0,
        salePrice: 6800,
        boughtAt: '2026-11-15',
        soldAt: '',
        notes: 'Новая в блистере, выставлена на продажу.'
      }
    ];
  }

  function createDemoState() {
    return {
      currency: '₽',
      isDemoData: true,
      demoBannerDismissed: false,
      pcs: [
        {
          id: 'pc-demo-1',
          name: 'Игровой ПК: Ryzen 5 5600 + RTX 3060 Ti',
          status: 'sold',
          createdAt: '2026-11-05',
          soldAt: '2026-11-12',
          salePrice: 68500,
          notes: 'Продан на Авито, покупатель проверил в FurMark и забрал самовывозом.',
          components: [
            { id: 'c101', category: 'Процессор (CPU)', name: 'AMD Ryzen 5 5600 OEM', source: 'AliExpress', qty: 1, price: 7400 },
            { id: 'c102', category: 'Видеокарта (GPU)', name: 'Palit RTX 3060 Ti Dual 8GB', source: 'Авито Б/У', qty: 1, price: 21500 },
            { id: 'c103', category: 'Материнская плата', name: 'MSI B550M PRO-VDH', source: 'Озон / WB', qty: 1, price: 7800 },
            { id: 'c104', category: 'Оперативная память (RAM)', name: 'ADATA XPG Gammix D35 16GB (2x8) 3200', source: 'Озон / WB', qty: 1, price: 3400 },
            { id: 'c105', category: 'Охлаждение (Кулер / СЖО)', name: 'ID-COOLING SE-214-XT', source: 'Новое (DNS / Ситилинк)', qty: 1, price: 1650 },
            { id: 'c106', category: 'Накопитель (SSD / HDD)', name: 'Kingston NV2 1TB M.2 NVMe', source: 'Озон / WB', qty: 1, price: 4900 },
            { id: 'c107', category: 'Блок питания (PSU)', name: 'DeepCool PK600D 600W Bronze', source: 'Новое (DNS / Ситилинк)', qty: 1, price: 4300 },
            { id: 'c108', category: 'Корпус (Case)', name: '1STPLAYER Trilobite T3 Black + 3 кулера', source: 'Озон / WB', qty: 1, price: 3600 },
            { id: 'c109', category: 'Доп. расходы (вентиляторы, термопаста, доставка)', name: 'Термопаста MX-4 + доставка Авито', source: 'Другое', qty: 1, price: 650 }
          ]
        },
        {
          id: 'pc-demo-2',
          name: 'Бюджетный ПК: Core i3-12100F + GTX 1660 Super',
          status: 'sold',
          createdAt: '2026-10-24',
          soldAt: '2026-10-30',
          salePrice: 41000,
          notes: 'Быстрая сборка для CS2 / GTA V, продана за 4 дня.',
          components: [
            { id: 'c201', category: 'Процессор (CPU)', name: 'Intel Core i3-12100F', source: 'Авито Б/У', qty: 1, price: 5800 },
            { id: 'c202', category: 'Видеокарта (GPU)', name: 'Gigabyte GTX 1660 Super 6GB', source: 'Авито Б/У', qty: 1, price: 11500 },
            { id: 'c203', category: 'Материнская плата', name: 'MSI PRO H610M-E DDR4', source: 'Новое (DNS / Ситилинк)', qty: 1, price: 6200 },
            { id: 'c204', category: 'Оперативная память (RAM)', name: 'Kingston Fury Beast 16GB (2x8)', source: 'Авито Б/У', qty: 1, price: 2400 },
            { id: 'c205', category: 'Накопитель (SSD / HDD)', name: 'ARDOR GAMING Ally 512GB NVMe', source: 'Новое (DNS / Ситилинк)', qty: 1, price: 2900 },
            { id: 'c206', category: 'Блок питания (PSU)', name: 'Cougar STC 500W', source: 'Новое (DNS / Ситилинк)', qty: 1, price: 2900 },
            { id: 'c207', category: 'Корпус (Case)', name: 'Ginzzu SL190 ARGB', source: 'Озон / WB', qty: 1, price: 2700 }
          ]
        },
        {
          id: 'pc-demo-3',
          name: '2K Сборка: Ryzen 5 7500F + RTX 4070',
          status: 'for_sale',
          createdAt: '2026-11-16',
          soldAt: '',
          salePrice: 118000,
          notes: 'Выставлен на продажу. Плановая цена продажи 118 000 ₽.',
          components: [
            { id: 'c301', category: 'Процессор (CPU)', name: 'AMD Ryzen 5 7500F', source: 'Озон / WB', qty: 1, price: 13800 },
            { id: 'c302', category: 'Видеокарта (GPU)', name: 'MSI RTX 4070 Ventus 2X 12GB', source: 'Авито Б/У', qty: 1, price: 47500 },
            { id: 'c303', category: 'Материнская плата', name: 'ASRock B650M-HDV/M.2', source: 'Озон / WB', qty: 1, price: 11400 },
            { id: 'c304', category: 'Оперативная память (RAM)', name: 'Team Group T-Create 32GB DDR5 6000MHz', source: 'Озон / WB', qty: 1, price: 9600 },
            { id: 'c305', category: 'Охлаждение (Кулер / СЖО)', name: 'DeepCool AG400 BK ARGB', source: 'Новое (DNS / Ситилинк)', qty: 1, price: 2400 },
            { id: 'c306', category: 'Накопитель (SSD / HDD)', name: 'Kingston KC3000 1TB', source: 'Озон / WB', qty: 1, price: 7800 },
            { id: 'c307', category: 'Блок питания (PSU)', name: 'Montech Gamma II 650W Gold', source: 'Новое (DNS / Ситилинк)', qty: 1, price: 6400 },
            { id: 'c308', category: 'Корпус (Case)', name: 'Montech Air 100 ARGB White', source: 'Новое (DNS / Ситилинк)', qty: 1, price: 5400 }
          ]
        }
      ],
      parts: createDemoParts()
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.pcs)) {
      return createDemoState();
    }
    const isDemo = Boolean(raw.isDemoData);
    const rawParts = Array.isArray(raw.parts)
      ? raw.parts
      : isDemo
      ? createDemoParts()
      : [];

    return {
      currency: typeof raw.currency === 'string' && raw.currency.trim() ? raw.currency : '₽',
      isDemoData: isDemo,
      demoBannerDismissed: Boolean(raw.demoBannerDismissed),
      pcs: raw.pcs.map((pc) => ({
        id: String(pc.id || uid('pc')),
        name: String(pc.name || 'Новая сборка ПК'),
        status: STATUS_META[pc.status] ? pc.status : 'building',
        createdAt: String(pc.createdAt || todayIso()),
        soldAt: String(pc.soldAt || ''),
        salePrice: pc.salePrice === '' || pc.salePrice === null || pc.salePrice === undefined ? '' : Number(pc.salePrice),
        notes: String(pc.notes || ''),
        components: Array.isArray(pc.components)
          ? pc.components.map((c) => ({
              id: String(c.id || uid('c')),
              category: String(c.category || 'Другое'),
              name: String(c.name || ''),
              source: String(c.source || SOURCE_OPTIONS[0]),
              qty: c.qty === '' || c.qty === null || c.qty === undefined ? 1 : Number(c.qty),
              price: c.price === '' || c.price === null || c.price === undefined ? '' : Number(c.price)
            }))
          : []
      })),
      parts: rawParts.map((part) => ({
        id: String(part.id || uid('part')),
        category: String(part.category || PART_CATEGORIES[0]),
        name: String(part.name || ''),
        source: String(part.source || SOURCE_OPTIONS[0]),
        status: PART_STATUS_META[part.status] ? part.status : 'for_sale',
        qty: part.qty === '' || part.qty === null || part.qty === undefined ? 1 : Number(part.qty),
        buyPrice: part.buyPrice === '' || part.buyPrice === null || part.buyPrice === undefined ? '' : Number(part.buyPrice),
        extraCost: part.extraCost === '' || part.extraCost === null || part.extraCost === undefined ? '' : Number(part.extraCost),
        salePrice: part.salePrice === '' || part.salePrice === null || part.salePrice === undefined ? '' : Number(part.salePrice),
        boughtAt: String(part.boughtAt || todayIso()),
        soldAt: String(part.soldAt || ''),
        notes: String(part.notes || '')
      }))
    };
  }

  function loadLocalState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return createDemoState();
      return normalizeState(JSON.parse(saved));
    } catch (e) {
      return createDemoState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Ошибка сохранения в localStorage:', e);
    }
    if (isServerAvailable) {
      clearTimeout(serverSyncTimer);
      serverSyncTimer = setTimeout(() => {
        pushStateToServer();
      }, 300);
    }
  }

  async function pushStateToServer() {
    if (!isServerAvailable) return;
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
    } catch (e) {
      // ignore temporary sync error
    }
  }

  async function detectAndSyncServer() {
    if (!window.location.protocol.startsWith('http')) {
      updateSyncBadge(false);
      return;
    }
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (!res.ok) {
        updateSyncBadge(false);
        return;
      }
      const payload = await res.json();
      isServerAvailable = true;
      updateSyncBadge(true);

      if (payload && Array.isArray(payload.pcs)) {
        state = normalizeState(payload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        $('currency-select').value = state.currency;
        renderCurrentRoute();
      } else if (payload && payload.empty) {
        await pushStateToServer();
      }
    } catch (e) {
      updateSyncBadge(false);
    }
  }

  function updateSyncBadge(serverOn) {
    const badge = $('sync-badge');
    const text = $('sync-text');
    if (serverOn) {
      badge.className = 'sync-badge server';
      text.textContent = 'Wi-Fi Сервер';
      badge.title = 'Данные автоматически сохраняются в data.json на компьютере и доступны с телефона';
    } else {
      badge.className = 'sync-badge local';
      text.textContent = 'Локально';
      badge.title = 'Данные сохраняются в памяти этого браузера';
    }
  }

  function showToast(message, type = 'info') {
    const container = $('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 3200);
  }

  // Rendering Home View
  function renderHome() {
    const demoBanner = $('demo-banner');
    if (state.isDemoData && !state.demoBannerDismissed) {
      demoBanner.classList.remove('hidden');
    } else {
      demoBanner.classList.add('hidden');
    }

    renderDashboardKpis();
    renderPcList();
  }

  function renderDashboardKpis() {
    const soldPcs = state.pcs.filter((p) => p.status === 'sold');
    const activePcs = state.pcs.filter((p) => p.status !== 'sold');
    const soldParts = state.parts.filter((p) => p.status === 'sold');
    const activeParts = state.parts.filter((p) => p.status !== 'sold');

    const pcsCleanProfit = soldPcs.reduce((sum, p) => sum + getNetProfit(p), 0);
    const partsCleanProfit = soldParts.reduce((sum, p) => sum + getPartProfit(p), 0);
    const totalCleanProfit = pcsCleanProfit + partsCleanProfit;

    const totalRevenue =
      soldPcs.reduce((sum, p) => sum + toNum(p.salePrice), 0) +
      soldParts.reduce((sum, p) => sum + toNum(p.salePrice), 0);
    const totalSoldCost =
      soldPcs.reduce((sum, p) => sum + getAssemblyCost(p), 0) +
      soldParts.reduce((sum, p) => sum + getPartInvested(p), 0);

    const avgProfitPc = soldPcs.length > 0 ? pcsCleanProfit / soldPcs.length : 0;
    const avgMargin = totalSoldCost > 0 ? (totalCleanProfit / totalSoldCost) * 100 : 0;

    const projectedProfit =
      activePcs.filter((p) => toNum(p.salePrice) > 0).reduce((sum, p) => sum + getNetProfit(p), 0) +
      activeParts.filter((p) => toNum(p.salePrice) > 0).reduce((sum, p) => sum + getPartProfit(p), 0);
    const investedActive =
      activePcs.reduce((sum, p) => sum + getAssemblyCost(p), 0) +
      activeParts.reduce((sum, p) => sum + getPartInvested(p), 0);

    const heroCard = $('kpi-hero-card');
    heroCard.classList.toggle('negative', totalCleanProfit < 0);

    const cleanEl = $('kpi-clean-profit');
    cleanEl.textContent = formatMoney(totalCleanProfit, totalCleanProfit > 0);

    const totalSoldCount = soldPcs.length + soldParts.length;
    const soldBadge = $('kpi-sold-badge');
    soldBadge.textContent = `${totalSoldCount} продано`;
    soldBadge.className = `kpi-pill ${totalCleanProfit < 0 ? 'negative' : 'positive'}`;

    $('kpi-breakdown-pcs').textContent = `🖥️ ПК: ${formatMoney(pcsCleanProfit, pcsCleanProfit > 0)}`;
    $('kpi-breakdown-parts').textContent = `📦 Железо: ${formatMoney(partsCleanProfit, partsCleanProfit > 0)}`;
    $('kpi-avg-profit').textContent = `Средняя с 1 ПК: ${formatMoney(avgProfitPc, avgProfitPc > 0)}`;
    $('kpi-avg-roi').textContent = `Маржа: ${formatPercent(avgMargin)}`;

    $('kpi-active-count').textContent = `${activePcs.length + activeParts.length} активных`;
    const projEl = $('kpi-projected-profit');
    projEl.textContent = formatMoney(projectedProfit, projectedProfit > 0);
    projEl.className = `kpi-value ${projectedProfit > 0 ? 'val-positive' : projectedProfit < 0 ? 'val-negative' : ''}`;

    $('kpi-revenue').textContent = formatMoney(totalRevenue);
    $('kpi-invested').textContent = formatMoney(investedActive);
    $('kpi-sold-cost').textContent = `Себестоимость проданных: ${formatMoney(totalSoldCost)}`;
  }

  function getFilteredAndSortedPcs() {
    const q = searchQuery.trim().toLowerCase();
    let list = state.pcs.filter((pc) => {
      if (currentFilter !== 'all' && pc.status !== currentFilter) return false;
      if (!q) return true;
      const inName = pc.name.toLowerCase().includes(q);
      const inNotes = pc.notes.toLowerCase().includes(q);
      const inParts = pc.components.some(
        (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
      );
      return inName || inNotes || inParts;
    });

    list = [...list];
    if (currentSort === 'profit_desc') {
      list.sort((a, b) => getNetProfit(b) - getNetProfit(a));
    } else if (currentSort === 'cost_desc') {
      list.sort((a, b) => getAssemblyCost(b) - getAssemblyCost(a));
    } else {
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
    return list;
  }

  function renderPcList() {
    const container = $('pc-list');
    const pcs = getFilteredAndSortedPcs();

    if (pcs.length === 0) {
      const hasAny = state.pcs.length > 0;
      container.innerHTML = `
        <div class="empty-state">
          <h3>${hasAny ? 'Ничего не найдено' : 'Пока нет ни одной сборки ПК'}</h3>
          <p>${
            hasAny
              ? 'Попробуйте сбросить фильтры или изменить поисковый запрос.'
              : 'Создайте свой первый ПК, рассчитайте комплектующие и фиксируйте прибыль с каждой продажи.'
          }</p>
          ${
            hasAny
              ? `<button type="button" class="btn" id="btn-reset-filters">Сбросить фильтры</button>`
              : `<button type="button" class="btn btn-primary" id="btn-empty-new-pc">+ Собрать первый ПК</button>`
          }
        </div>
      `;
      const resetBtn = $('btn-reset-filters');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          searchQuery = '';
          currentFilter = 'all';
          $('search-input').value = '';
          updateFilterPills();
          renderPcList();
        });
      }
      const newBtn = $('btn-empty-new-pc');
      if (newBtn) newBtn.addEventListener('click', createNewPc);
      return;
    }

    container.innerHTML = pcs
      .map((pc) => {
        const cost = getAssemblyCost(pc);
        const sale = toNum(pc.salePrice);
        const profit = getNetProfit(pc);
        const roi = getRoiPercent(pc);
        const statusInfo = STATUS_META[pc.status] || STATUS_META.building;

        const keyParts = pc.components
          .filter((c) => c.name && c.name.trim())
          .slice(0, 4)
          .map((c) => `<span class="spec-chip">${escapeHtml(c.name)}</span>`)
          .join('');

        const hasSalePrice = sale > 0;
        const profitClass = !hasSalePrice
          ? 'val-muted'
          : profit >= 0
          ? 'val-positive'
          : 'val-negative';

        const profitText = hasSalePrice
          ? `${formatMoney(profit, true)} (${formatPercent(roi)})`
          : 'Цена не указана';

        const saleLabel = pc.status === 'sold' ? 'Продан за' : 'План продажи';
        const dateLine =
          pc.status === 'sold' && pc.soldAt
            ? `Собран ${escapeHtml(pc.createdAt)} • Продан ${escapeHtml(pc.soldAt)}`
            : `Сборка от ${escapeHtml(pc.createdAt || '—')}`;

        return `
          <article class="pc-card" data-pc-id="${escapeHtml(pc.id)}">
            <div class="pc-card-top">
              <div>
                <h3 class="pc-card-title">${escapeHtml(pc.name || 'Без названия')}</h3>
                <div class="pc-card-date">${dateLine}</div>
              </div>
              <span class="status-badge ${statusInfo.className}">${statusInfo.label}</span>
            </div>

            <div class="pc-specs-list">
              ${keyParts || '<span class="spec-chip">Комплектующие пока не заполнены</span>'}
            </div>

            <div class="pc-card-finance">
              <div class="finance-stat">
                <span class="finance-stat-label">Собран за</span>
                <span class="finance-stat-val">${formatMoney(cost)}</span>
              </div>
              <div class="finance-stat">
                <span class="finance-stat-label">${saleLabel}</span>
                <span class="finance-stat-val">${hasSalePrice ? formatMoney(sale) : '—'}</span>
              </div>
              <div class="finance-stat">
                <span class="finance-stat-label">${pc.status === 'sold' ? 'Чистыми' : 'Прогноз'}</span>
                <span class="finance-stat-val ${profitClass}">${profitText}</span>
              </div>
            </div>

            <div class="pc-card-actions">
              <span style="font-size: 12px; color: var(--text-muted);">
                ${pc.components.length} поз. комплектующих
              </span>
              <span class="btn btn-sm">Открыть страницу →</span>
            </div>
          </article>
        `;
      })
      .join('');

    container.querySelectorAll('.pc-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-pc-id');
        window.location.hash = `#/pc/${encodeURIComponent(id)}`;
      });
    });
  }

  // Rendering Dedicated PC Page
  function renderPcDetail(pcId) {
    const pc = state.pcs.find((p) => p.id === pcId);
    if (!pc) {
      showToast('Сборка ПК не найдена', 'error');
      window.location.hash = '#/';
      return;
    }

    currentPcId = pc.id;
    $('pc-route-badge').textContent = `#/pc/${pc.id}`;
    $('pc-name-input').value = pc.name;
    $('pc-created-input').value = pc.createdAt || '';
    $('pc-sold-date-input').value = pc.soldAt || '';
    $('pc-notes-input').value = pc.notes || '';
    $('pc-sale-price-input').value = pc.salePrice === '' || pc.salePrice === null ? '' : pc.salePrice;

    updateStatusSegmentedUi(pc.status);
    renderComponentRows(pc);
    updatePcFinanceDom(pc);
  }

  function updateStatusSegmentedUi(status) {
    document.querySelectorAll('#pc-status-segmented .status-seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-status') === status);
    });
  }

  function renderComponentRows(pc) {
    const listEl = $('comp-list');
    $('comp-count-label').textContent = `${pc.components.length} поз.`;

    if (pc.components.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding: 28px 16px;">
          <p style="margin-bottom: 0;">Список комплектующих пуст. Добавьте процессор, видеокарту и остальные детали ниже.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = pc.components
      .map((comp) => {
        const catOptions = [...COMPONENT_CATEGORIES];
        if (comp.category && !catOptions.includes(comp.category)) {
          catOptions.unshift(comp.category);
        }

        const srcOptions = [...SOURCE_OPTIONS];
        if (comp.source && !srcOptions.includes(comp.source)) {
          srcOptions.unshift(comp.source);
        }

        const rowTotal = getComponentTotal(comp);

        return `
          <div class="comp-row" data-comp-id="${escapeHtml(comp.id)}">
            <div class="comp-cell-cat">
              <div class="comp-mobile-label">Категория</div>
              <select class="input comp-cat-select" aria-label="Категория">
                ${catOptions
                  .map(
                    (cat) =>
                      `<option value="${escapeHtml(cat)}" ${cat === comp.category ? 'selected' : ''}>${escapeHtml(cat)}</option>`
                  )
                  .join('')}
              </select>
            </div>

            <div class="comp-cell-name">
              <div class="comp-mobile-label">Комплектующее / Модель</div>
              <input
                type="text"
                class="input comp-name-input"
                value="${escapeHtml(comp.name)}"
                placeholder="Модель детали (напр. RTX 3060 Ti)"
              />
            </div>

            <div class="comp-cell-source">
              <div class="comp-mobile-label">Где куплено</div>
              <select class="input comp-source-select" aria-label="Источник">
                ${srcOptions
                  .map(
                    (src) =>
                      `<option value="${escapeHtml(src)}" ${src === comp.source ? 'selected' : ''}>${escapeHtml(src)}</option>`
                  )
                  .join('')}
              </select>
            </div>

            <div class="comp-cell-qty">
              <div class="comp-mobile-label">Кол-во</div>
              <input
                type="number"
                inputmode="decimal"
                min="0"
                step="1"
                class="input comp-qty-input"
                value="${comp.qty === '' ? '' : escapeHtml(comp.qty)}"
              />
            </div>

            <div class="comp-cell-price">
              <div class="comp-mobile-label">Цена за шт.</div>
              <input
                type="number"
                inputmode="decimal"
                min="0"
                step="any"
                class="input comp-price-input"
                value="${comp.price === '' ? '' : escapeHtml(comp.price)}"
                placeholder="0"
              />
            </div>

            <div class="comp-cell-total">
              <div class="comp-mobile-label" style="margin-bottom: 0;">Сумма:</div>
              <div class="comp-row-total">${formatMoney(rowTotal)}</div>
            </div>

            <div class="comp-cell-del">
              <button type="button" class="btn-icon-del" title="Удалить позицию" aria-label="Удалить">×</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function updatePcFinanceDom(pc) {
    const cost = getAssemblyCost(pc);
    const sale = toNum(pc.salePrice);
    const hasSale = pc.salePrice !== '' && pc.salePrice !== null && pc.salePrice !== undefined;
    const profit = sale - cost;
    const roi = cost > 0 ? (profit / cost) * 100 : 0;

    $('pc-assembly-cost').textContent = formatMoney(cost);
    const filledCount = pc.components.filter((c) => toNum(c.price) > 0).length;
    $('pc-parts-summary').textContent = `Учтено позиций с ценой: ${filledCount} из ${pc.components.length}`;

    const profitBox = $('pc-profit-box');
    const profitVal = $('pc-net-profit');
    const roiText = $('pc-roi-text');
    const profitLabel = $('pc-profit-label');

    profitLabel.textContent =
      pc.status === 'sold' ? 'Своя чистая прибыль (Продано)' : 'Ожидаемая чистая прибыль';

    if (!hasSale && sale === 0) {
      profitBox.classList.remove('negative');
      profitVal.textContent = formatMoney(-cost);
      profitVal.className = 'finance-box-value val-muted';
      roiText.textContent = 'Укажите цену продажи выше';
    } else {
      profitBox.classList.toggle('negative', profit < 0);
      profitVal.textContent = formatMoney(profit, profit > 0);
      profitVal.className = `finance-box-value ${profit >= 0 ? 'val-positive' : 'val-negative'}`;
      roiText.textContent = `Наценка / ROI: ${formatPercent(roi)}`;
    }

    const markSoldBtn = $('btn-mark-sold');
    if (pc.status === 'sold') {
      markSoldBtn.textContent = '✅ Продан — учитывается в «Заработано чистыми»';
      markSoldBtn.className = 'btn btn-success';
    } else {
      markSoldBtn.textContent = '✅ Зафиксировать продажу в общую прибыль';
      markSoldBtn.className = 'btn btn-primary';
    }

    // Mobile sticky bar
    $('mobile-bar-cost').textContent = formatMoney(cost);
    $('mobile-bar-sale').textContent = hasSale ? formatMoney(sale) : '—';
    const mProfit = $('mobile-bar-profit');
    mProfit.textContent = hasSale ? formatMoney(profit, profit > 0) : '—';
    mProfit.className = `mobile-bar-val ${
      !hasSale ? 'val-muted' : profit >= 0 ? 'val-positive' : 'val-negative'
    }`;
  }

  // Rendering Resold Hardware Page (#/parts)
  function renderPartsView() {
    renderPartsKpis();
    renderPartsList();
  }

  function renderPartsKpis() {
    const soldParts = state.parts.filter((p) => p.status === 'sold');
    const activeParts = state.parts.filter((p) => p.status !== 'sold');

    const totalCleanProfit = soldParts.reduce((sum, p) => sum + getPartProfit(p), 0);
    const totalRevenue = soldParts.reduce((sum, p) => sum + toNum(p.salePrice), 0);
    const totalSoldCost = soldParts.reduce((sum, p) => sum + getPartInvested(p), 0);

    const avgProfit = soldParts.length > 0 ? totalCleanProfit / soldParts.length : 0;
    const avgMargin = totalSoldCost > 0 ? (totalCleanProfit / totalSoldCost) * 100 : 0;

    const projectedProfit = activeParts
      .filter((p) => toNum(p.salePrice) > 0)
      .reduce((sum, p) => sum + getPartProfit(p), 0);
    const investedActive = activeParts.reduce((sum, p) => sum + getPartInvested(p), 0);

    const heroCard = $('parts-kpi-hero');
    heroCard.classList.toggle('negative', totalCleanProfit < 0);

    $('parts-clean-profit').textContent = formatMoney(totalCleanProfit, totalCleanProfit > 0);
    const soldBadge = $('parts-sold-badge');
    soldBadge.textContent = `${soldParts.length} продано`;
    soldBadge.className = `kpi-pill ${totalCleanProfit < 0 ? 'negative' : 'positive'}`;

    $('parts-avg-profit').textContent = `Средняя с 1 позиции: ${formatMoney(avgProfit, avgProfit > 0)}`;
    $('parts-avg-roi').textContent = `Маржа: ${formatPercent(avgMargin)}`;

    $('parts-active-badge').textContent = `${activeParts.length} в продаже`;
    const projEl = $('parts-projected-profit');
    projEl.textContent = formatMoney(projectedProfit, projectedProfit > 0);
    projEl.className = `kpi-value ${projectedProfit > 0 ? 'val-positive' : projectedProfit < 0 ? 'val-negative' : ''}`;

    $('parts-revenue').textContent = formatMoney(totalRevenue);
    $('parts-invested').textContent = formatMoney(investedActive);
    $('parts-sold-cost').textContent = `Закуп проданного: ${formatMoney(totalSoldCost)}`;
  }

  function getFilteredAndSortedParts() {
    const q = partsSearchQuery.trim().toLowerCase();
    let list = state.parts.filter((part) => {
      if (partsFilter !== 'all' && part.status !== partsFilter) return false;
      if (!q) return true;
      return (
        part.name.toLowerCase().includes(q) ||
        part.category.toLowerCase().includes(q) ||
        part.source.toLowerCase().includes(q) ||
        part.notes.toLowerCase().includes(q)
      );
    });

    list = [...list];
    if (partsSort === 'profit_desc') {
      list.sort((a, b) => getPartProfit(b) - getPartProfit(a));
    } else if (partsSort === 'cost_desc') {
      list.sort((a, b) => getPartInvested(b) - getPartInvested(a));
    } else {
      list.sort((a, b) => (b.boughtAt || '').localeCompare(a.boughtAt || ''));
    }
    return list;
  }

  function buildPartFinanceDisplay(part) {
    const invested = getPartInvested(part);
    const sale = toNum(part.salePrice);
    const hasSale = part.salePrice !== '' && part.salePrice !== null && part.salePrice !== undefined;
    const profit = sale - invested;
    const roi = invested > 0 ? (profit / invested) * 100 : 0;

    let boxClass = 'part-profit-box';
    let valClass = 'part-stat-val';
    let profitText = formatMoney(profit, profit > 0);
    let roiText = `Маржа / ROI: ${formatPercent(roi)}`;

    if (!hasSale && sale === 0) {
      boxClass += ' muted';
      valClass += ' val-muted';
      profitText = formatMoney(-invested);
      roiText = 'Укажите цену продажи';
    } else if (profit < 0) {
      boxClass += ' negative';
      valClass += ' val-negative';
    } else {
      valClass += ' val-positive';
    }

    return { invested, boxClass, valClass, profitText, roiText };
  }

  function updatePartCardFinanceDom(card, part) {
    const info = buildPartFinanceDisplay(part);
    const invEl = card.querySelector('.part-invested-val');
    const profitBox = card.querySelector('.part-profit-box');
    const profitVal = card.querySelector('.part-profit-val');
    const roiVal = card.querySelector('.part-roi-val');

    if (invEl) invEl.textContent = formatMoney(info.invested);
    if (profitBox) profitBox.className = info.boxClass;
    if (profitVal) {
      profitVal.className = info.valClass;
      profitVal.textContent = info.profitText;
    }
    if (roiVal) roiVal.textContent = info.roiText;
  }

  function renderPartsList() {
    const container = $('parts-list');
    const parts = getFilteredAndSortedParts();

    if (parts.length === 0) {
      const hasAny = state.parts.length > 0;
      container.innerHTML = `
        <div class="empty-state">
          <h3>${hasAny ? 'Ничего не найдено' : 'Пока нет перепроданного железа'}</h3>
          <p>${
            hasAny
              ? 'Попробуйте сбросить фильтры или изменить поисковый запрос.'
              : 'Добавьте видеокарту, процессор, комплект или любую другую деталь для учета покупки, продажи и чистой прибыли.'
          }</p>
          ${
            hasAny
              ? `<button type="button" class="btn" id="btn-parts-reset">Сбросить фильтры</button>`
              : `<button type="button" class="btn btn-primary" id="btn-empty-new-part">+ Добавить первое железо</button>`
          }
        </div>
      `;
      const resetBtn = $('btn-parts-reset');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          partsSearchQuery = '';
          partsFilter = 'all';
          $('parts-search-input').value = '';
          updatePartsFilterPills();
          renderPartsList();
        });
      }
      const newBtn = $('btn-empty-new-part');
      if (newBtn) newBtn.addEventListener('click', createNewPart);
      return;
    }

    container.innerHTML = parts
      .map((part) => {
        const catOptions = [...PART_CATEGORIES];
        if (part.category && !catOptions.includes(part.category)) {
          catOptions.unshift(part.category);
        }
        const srcOptions = [...SOURCE_OPTIONS];
        if (part.source && !srcOptions.includes(part.source)) {
          srcOptions.unshift(part.source);
        }

        const fin = buildPartFinanceDisplay(part);

        return `
          <article class="part-card ${part.status === 'sold' ? 'is-sold' : ''}" data-part-id="${escapeHtml(part.id)}">
            <div class="part-card-top">
              <div class="part-field">
                <span class="part-field-label">Категория</span>
                <select class="input part-cat-select" aria-label="Категория">
                  ${catOptions
                    .map(
                      (cat) =>
                        `<option value="${escapeHtml(cat)}" ${cat === part.category ? 'selected' : ''}>${escapeHtml(cat)}</option>`
                    )
                    .join('')}
                </select>
              </div>

              <div class="part-field part-field-name">
                <span class="part-field-label">Модель / Название железа</span>
                <input
                  type="text"
                  class="input part-name-input"
                  value="${escapeHtml(part.name)}"
                  placeholder="Например: RTX 3070 Palit GamingPro 8GB"
                />
              </div>

              <div class="part-field">
                <span class="part-field-label">Где куплено</span>
                <select class="input part-source-select" aria-label="Источник">
                  ${srcOptions
                    .map(
                      (src) =>
                        `<option value="${escapeHtml(src)}" ${src === part.source ? 'selected' : ''}>${escapeHtml(src)}</option>`
                    )
                    .join('')}
                </select>
              </div>

              <div class="part-field">
                <span class="part-field-label">Статус</span>
                <div class="part-status-toggle">
                  <button type="button" class="part-status-btn ${part.status === 'for_sale' ? 'active' : ''}" data-status="for_sale">📦 В продаже</button>
                  <button type="button" class="part-status-btn ${part.status === 'sold' ? 'active' : ''}" data-status="sold">✅ Продано</button>
                </div>
              </div>

              <div class="part-card-actions">
                <button type="button" class="btn btn-sm btn-part-dup" title="Дублировать позицию">📑</button>
                <button type="button" class="btn-icon-del btn-part-del" title="Удалить позицию" aria-label="Удалить">×</button>
              </div>
            </div>

            <div class="part-card-finance">
              <div class="part-field">
                <span class="part-field-label">Кол-во</span>
                <input
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="1"
                  class="input part-qty-input"
                  value="${part.qty === '' ? '' : escapeHtml(part.qty)}"
                />
              </div>

              <div class="part-field">
                <span class="part-field-label">Куплено за (шт.)</span>
                <input
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="any"
                  class="input part-buy-input"
                  value="${part.buyPrice === '' ? '' : escapeHtml(part.buyPrice)}"
                  placeholder="0"
                />
              </div>

              <div class="part-field">
                <span class="part-field-label">Доп. расход (доставка, паста)</span>
                <input
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="any"
                  class="input part-extra-input"
                  value="${part.extraCost === '' ? '' : escapeHtml(part.extraCost)}"
                  placeholder="0"
                />
              </div>

              <div class="part-stat-box">
                <span class="part-field-label">Вложено всего</span>
                <span class="part-stat-val part-invested-val">${formatMoney(fin.invested)}</span>
              </div>

              <div class="part-sale-wrap">
                <span class="part-field-label">Продано за (или план)</span>
                <div class="part-sale-row">
                  <input
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="any"
                    class="input part-sale-input"
                    value="${part.salePrice === '' ? '' : escapeHtml(part.salePrice)}"
                    placeholder="0"
                  />
                  <div class="part-markup-mini">
                    <button type="button" class="part-markup-btn" data-markup="15">+15%</button>
                    <button type="button" class="part-markup-btn" data-markup="20">+20%</button>
                    <button type="button" class="part-markup-btn" data-markup="30">+30%</button>
                  </div>
                </div>
              </div>

              <div class="${fin.boxClass}">
                <span class="part-field-label">Чистая прибыль</span>
                <span class="${fin.valClass} part-profit-val">${fin.profitText}</span>
                <span class="part-roi-sub part-roi-val">${fin.roiText}</span>
              </div>
            </div>

            <div class="part-card-bottom">
              <div class="part-field">
                <span class="part-field-label">Дата покупки</span>
                <input type="date" class="input part-bought-date-input" value="${escapeHtml(part.boughtAt || '')}" />
              </div>
              <div class="part-field">
                <span class="part-field-label">Дата продажи</span>
                <input type="date" class="input part-sold-date-input" value="${escapeHtml(part.soldAt || '')}" />
              </div>
              <div class="part-field part-field-notes">
                <span class="part-field-label">Заметка / нюансы / тесты</span>
                <input
                  type="text"
                  class="input part-notes-input"
                  value="${escapeHtml(part.notes || '')}"
                  placeholder="Например: пломба на месте, продано на Авито..."
                />
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function updateNavTabs(route) {
    $('nav-tab-pcs').classList.toggle('active', route === 'home' || route === 'pc');
    $('nav-tab-parts').classList.toggle('active', route === 'parts');
    $('nav-count-pcs').textContent = String(state.pcs.length);
    $('nav-count-parts').textContent = String(state.parts.length);
  }

  // Router
  function router() {
    const hash = window.location.hash || '#/';
    const pcMatch = hash.match(/^#\/pc\/(.+)$/);

    if (pcMatch) {
      currentRoute = 'pc';
      const pcId = decodeURIComponent(pcMatch[1]);
      $('view-home').classList.add('hidden');
      $('view-parts').classList.add('hidden');
      $('view-pc').classList.remove('hidden');
      $('mobile-sticky-bar').classList.remove('hidden');
      updateNavTabs('pc');
      renderPcDetail(pcId);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (hash === '#/parts') {
      currentRoute = 'parts';
      currentPcId = null;
      $('view-home').classList.add('hidden');
      $('view-pc').classList.add('hidden');
      $('mobile-sticky-bar').classList.add('hidden');
      $('view-parts').classList.remove('hidden');
      updateNavTabs('parts');
      renderPartsView();
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      currentRoute = 'home';
      currentPcId = null;
      $('view-pc').classList.add('hidden');
      $('view-parts').classList.add('hidden');
      $('mobile-sticky-bar').classList.add('hidden');
      $('view-home').classList.remove('hidden');
      updateNavTabs('home');
      renderHome();
    }
  }

  function renderCurrentRoute() {
    updateNavTabs(currentRoute);
    if (currentRoute === 'pc' && currentPcId) {
      renderPcDetail(currentPcId);
    } else if (currentRoute === 'parts') {
      renderPartsView();
    } else {
      renderHome();
    }
  }

  // Actions
  function createNewPart() {
    const newPart = {
      id: uid('part'),
      category: PART_CATEGORIES[0],
      name: '',
      source: SOURCE_OPTIONS[0],
      status: 'for_sale',
      qty: 1,
      buyPrice: '',
      extraCost: '',
      salePrice: '',
      boughtAt: todayIso(),
      soldAt: '',
      notes: ''
    };
    state.parts.unshift(newPart);
    partsFilter = 'all';
    partsSearchQuery = '';
    if ($('parts-search-input')) $('parts-search-input').value = '';
    updatePartsFilterPills();
    saveState();

    if (window.location.hash !== '#/parts') {
      window.location.hash = '#/parts';
    } else {
      updateNavTabs('parts');
      renderPartsView();
    }

    const firstInput = $('parts-list').querySelector('.part-name-input');
    if (firstInput) firstInput.focus();
    showToast('Добавлена карточка для перепродажи железа', 'success');
  }

  function createNewPc() {
    const newPc = {
      id: uid('pc'),
      name: `Сборка ПК #${state.pcs.length + 1}`,
      status: 'building',
      createdAt: todayIso(),
      soldAt: '',
      salePrice: '',
      notes: '',
      components: DEFAULT_BUILD_SLOTS.map((cat) => ({
        id: uid('c'),
        category: cat,
        name: '',
        source: SOURCE_OPTIONS[0],
        qty: 1,
        price: ''
      }))
    };
    state.pcs.unshift(newPc);
    saveState();
    window.location.hash = `#/pc/${encodeURIComponent(newPc.id)}`;
    showToast('Создана новая страница ПК', 'success');
  }

  function getActivePc() {
    if (!currentPcId) return null;
    return state.pcs.find((p) => p.id === currentPcId) || null;
  }

  function addComponentToCurrentPc(category = 'Другое') {
    const pc = getActivePc();
    if (!pc) return;
    pc.components.push({
      id: uid('c'),
      category,
      name: '',
      source: SOURCE_OPTIONS[0],
      qty: 1,
      price: ''
    });
    saveState();
    renderComponentRows(pc);
    updatePcFinanceDom(pc);
    // Focus newly added component name input
    const rows = $('comp-list').querySelectorAll('.comp-row');
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
      const nameInput = lastRow.querySelector('.comp-name-input');
      if (nameInput) nameInput.focus();
    }
  }

  function duplicateCurrentPc() {
    const pc = getActivePc();
    if (!pc) return;
    const copy = {
      id: uid('pc'),
      name: `${pc.name} (копия)`,
      status: 'building',
      createdAt: todayIso(),
      soldAt: '',
      salePrice: pc.salePrice,
      notes: pc.notes,
      components: pc.components.map((c) => ({ ...c, id: uid('c') }))
    };
    state.pcs.unshift(copy);
    saveState();
    window.location.hash = `#/pc/${encodeURIComponent(copy.id)}`;
    showToast('Создана копия сборки', 'success');
  }

  function deleteCurrentPc() {
    const pc = getActivePc();
    if (!pc) return;
    if (!confirm(`Удалить сборку «${pc.name}» безвозвратно?`)) return;
    state.pcs = state.pcs.filter((p) => p.id !== pc.id);
    saveState();
    showToast('Сборка ПК удалена');
    window.location.hash = '#/';
  }

  function copySpecsText() {
    const pc = getActivePc();
    if (!pc) return;
    const lines = [pc.name, ''];
    pc.components.forEach((c) => {
      if (!c.name || !c.name.trim()) return;
      const qtySuffix = toNum(c.qty) > 1 ? ` × ${toNum(c.qty)} шт.` : '';
      lines.push(`• ${c.category}: ${c.name.trim()}${qtySuffix}`);
    });
    if (toNum(pc.salePrice) > 0) {
      lines.push('', `Цена: ${formatMoney(pc.salePrice)}`);
    }
    const text = lines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast('Характеристики скопированы в буфер', 'success'))
        .catch(() => fallbackCopyText(text));
    } else {
      fallbackCopyText(text);
    }
  }

  function fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Характеристики скопированы', 'success');
    } catch (e) {
      showToast('Не удалось скопировать автоматически', 'error');
    }
    ta.remove();
  }

  function exportJson() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pc-profit-backup-${todayIso()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Резервная копия скачана', 'success');
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !Array.isArray(parsed.pcs)) {
          throw new Error('Неверный формат файла');
        }
        state = normalizeState(parsed);
        $('currency-select').value = state.currency;
        saveState();
        renderCurrentRoute();
        showToast(
          `Импортировано: ${state.pcs.length} ПК, ${state.parts.length} железа`,
          'success'
        );
      } catch (e) {
        showToast('Ошибка: файл не является корректной копией PC Profit', 'error');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function updateFilterPills() {
    document.querySelectorAll('#status-filters .filter-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === currentFilter);
    });
  }

  function updatePartsFilterPills() {
    document.querySelectorAll('#parts-status-filters .filter-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === partsFilter);
    });
  }

  // Event Binding
  function bindEvents() {
    $('currency-select').addEventListener('change', (e) => {
      state.currency = e.target.value;
      saveState();
      renderCurrentRoute();
    });

    $('btn-new-pc').addEventListener('click', createNewPc);
    $('btn-new-part-top').addEventListener('click', createNewPart);
    $('btn-add-part').addEventListener('click', createNewPart);

    // Export & Import (desktop + mobile)
    $('btn-export').addEventListener('click', exportJson);
    $('btn-export-mobile').addEventListener('click', exportJson);

    const triggerImport = () => $('import-file-input').click();
    $('btn-import').addEventListener('click', triggerImport);
    $('btn-import-mobile').addEventListener('click', triggerImport);

    $('import-file-input').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      handleImportFile(file);
      e.target.value = '';
    });

    // Demo banner
    $('btn-clear-demo').addEventListener('click', () => {
      if (!confirm('Удалить все тестовые сборки и железо и начать с чистого списка?')) return;
      state.pcs = [];
      state.parts = [];
      state.isDemoData = false;
      saveState();
      updateNavTabs(currentRoute);
      renderHome();
      showToast('Примеры очищены. Можно добавлять свои сборки и железо!', 'success');
    });

    $('btn-dismiss-demo').addEventListener('click', () => {
      state.demoBannerDismissed = true;
      state.isDemoData = false;
      saveState();
      $('demo-banner').classList.add('hidden');
    });

    // Home filters & search
    $('search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderPcList();
    });

    document.querySelectorAll('#status-filters .filter-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentFilter = btn.getAttribute('data-filter');
        updateFilterPills();
        renderPcList();
      });
    });

    $('sort-select').addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderPcList();
    });

    // PC Detail page bindings (in-place updates to preserve input focus!)
    $('pc-name-input').addEventListener('input', (e) => {
      const pc = getActivePc();
      if (!pc) return;
      pc.name = e.target.value;
      saveState();
    });

    $('pc-created-input').addEventListener('change', (e) => {
      const pc = getActivePc();
      if (!pc) return;
      pc.createdAt = e.target.value;
      saveState();
    });

    $('pc-sold-date-input').addEventListener('change', (e) => {
      const pc = getActivePc();
      if (!pc) return;
      pc.soldAt = e.target.value;
      saveState();
    });

    $('pc-notes-input').addEventListener('input', (e) => {
      const pc = getActivePc();
      if (!pc) return;
      pc.notes = e.target.value;
      saveState();
    });

    document.querySelectorAll('#pc-status-segmented .status-seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pc = getActivePc();
        if (!pc) return;
        const newStatus = btn.getAttribute('data-status');
        pc.status = newStatus;
        if (newStatus === 'sold' && !pc.soldAt) {
          pc.soldAt = todayIso();
          $('pc-sold-date-input').value = pc.soldAt;
        }
        updateStatusSegmentedUi(newStatus);
        updatePcFinanceDom(pc);
        saveState();
      });
    });

    $('pc-sale-price-input').addEventListener('input', (e) => {
      const pc = getActivePc();
      if (!pc) return;
      pc.salePrice = e.target.value === '' ? '' : Number(e.target.value);
      updatePcFinanceDom(pc);
      saveState();
    });

    document.querySelectorAll('.markup-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pc = getActivePc();
        if (!pc) return;
        const cost = getAssemblyCost(pc);
        if (cost <= 0) {
          showToast('Сначала укажите цены комплектующих', 'error');
          return;
        }
        const pct = Number(btn.getAttribute('data-markup')) || 0;
        const rawTarget = cost * (1 + pct / 100);
        const step = state.currency === '$' || state.currency === '€' ? 10 : 100;
        const rounded = Math.ceil(rawTarget / step) * step;
        pc.salePrice = rounded;
        $('pc-sale-price-input').value = rounded;
        updatePcFinanceDom(pc);
        saveState();
        showToast(`Установлена цена с наценкой +${pct}%: ${formatMoney(rounded)}`);
      });
    });

    $('btn-mark-sold').addEventListener('click', () => {
      const pc = getActivePc();
      if (!pc) return;
      if (pc.salePrice === '' || pc.salePrice === null || toNum(pc.salePrice) <= 0) {
        $('pc-sale-price-input').focus();
        showToast('Сначала введите сумму, за которую продан ПК', 'error');
        return;
      }
      pc.status = 'sold';
      if (!pc.soldAt) {
        pc.soldAt = todayIso();
        $('pc-sold-date-input').value = pc.soldAt;
      }
      updateStatusSegmentedUi('sold');
      updatePcFinanceDom(pc);
      saveState();
      showToast('Продажа зафиксирована в «Заработано чистыми»!', 'success');
    });

    // Component list delegation (preserves typing focus!)
    const compListEl = $('comp-list');
    compListEl.addEventListener('input', (e) => {
      const pc = getActivePc();
      if (!pc) return;
      const row = e.target.closest('.comp-row');
      if (!row) return;
      const compId = row.getAttribute('data-comp-id');
      const comp = pc.components.find((c) => c.id === compId);
      if (!comp) return;

      if (e.target.classList.contains('comp-name-input')) {
        comp.name = e.target.value;
      } else if (e.target.classList.contains('comp-qty-input')) {
        comp.qty = e.target.value === '' ? '' : Number(e.target.value);
      } else if (e.target.classList.contains('comp-price-input')) {
        comp.price = e.target.value === '' ? '' : Number(e.target.value);
      }

      const rowTotalEl = row.querySelector('.comp-row-total');
      if (rowTotalEl) {
        rowTotalEl.textContent = formatMoney(getComponentTotal(comp));
      }
      updatePcFinanceDom(pc);
      saveState();
    });

    compListEl.addEventListener('change', (e) => {
      const pc = getActivePc();
      if (!pc) return;
      const row = e.target.closest('.comp-row');
      if (!row) return;
      const compId = row.getAttribute('data-comp-id');
      const comp = pc.components.find((c) => c.id === compId);
      if (!comp) return;

      if (e.target.classList.contains('comp-cat-select')) {
        comp.category = e.target.value;
        saveState();
      } else if (e.target.classList.contains('comp-source-select')) {
        comp.source = e.target.value;
        saveState();
      }
    });

    compListEl.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.btn-icon-del');
      if (!delBtn) return;
      const pc = getActivePc();
      if (!pc) return;
      const row = delBtn.closest('.comp-row');
      if (!row) return;
      const compId = row.getAttribute('data-comp-id');
      pc.components = pc.components.filter((c) => c.id !== compId);
      saveState();
      renderComponentRows(pc);
      updatePcFinanceDom(pc);
    });

    $('btn-add-comp').addEventListener('click', () => addComponentToCurrentPc('Другое'));
    $('btn-add-comp-top').addEventListener('click', () => addComponentToCurrentPc('Другое'));
    $('btn-add-extra').addEventListener('click', () =>
      addComponentToCurrentPc('Доп. расходы (вентиляторы, термопаста, доставка)')
    );

    $('btn-copy-specs').addEventListener('click', copySpecsText);
    $('btn-duplicate-pc').addEventListener('click', duplicateCurrentPc);
    $('btn-delete-pc').addEventListener('click', deleteCurrentPc);

    // Resold Hardware (#/parts) filters & delegation
    $('parts-search-input').addEventListener('input', (e) => {
      partsSearchQuery = e.target.value;
      renderPartsList();
    });

    document.querySelectorAll('#parts-status-filters .filter-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        partsFilter = btn.getAttribute('data-filter');
        updatePartsFilterPills();
        renderPartsList();
      });
    });

    $('parts-sort-select').addEventListener('change', (e) => {
      partsSort = e.target.value;
      renderPartsList();
    });

    const partsListEl = $('parts-list');
    partsListEl.addEventListener('input', (e) => {
      const card = e.target.closest('.part-card');
      if (!card) return;
      const partId = card.getAttribute('data-part-id');
      const part = state.parts.find((p) => p.id === partId);
      if (!part) return;

      if (e.target.classList.contains('part-name-input')) {
        part.name = e.target.value;
      } else if (e.target.classList.contains('part-qty-input')) {
        part.qty = e.target.value === '' ? '' : Number(e.target.value);
      } else if (e.target.classList.contains('part-buy-input')) {
        part.buyPrice = e.target.value === '' ? '' : Number(e.target.value);
      } else if (e.target.classList.contains('part-extra-input')) {
        part.extraCost = e.target.value === '' ? '' : Number(e.target.value);
      } else if (e.target.classList.contains('part-sale-input')) {
        part.salePrice = e.target.value === '' ? '' : Number(e.target.value);
      } else if (e.target.classList.contains('part-notes-input')) {
        part.notes = e.target.value;
      }

      updatePartCardFinanceDom(card, part);
      renderPartsKpis();
      saveState();
    });

    partsListEl.addEventListener('change', (e) => {
      const card = e.target.closest('.part-card');
      if (!card) return;
      const partId = card.getAttribute('data-part-id');
      const part = state.parts.find((p) => p.id === partId);
      if (!part) return;

      if (e.target.classList.contains('part-cat-select')) {
        part.category = e.target.value;
      } else if (e.target.classList.contains('part-source-select')) {
        part.source = e.target.value;
      } else if (e.target.classList.contains('part-bought-date-input')) {
        part.boughtAt = e.target.value;
      } else if (e.target.classList.contains('part-sold-date-input')) {
        part.soldAt = e.target.value;
      }
      saveState();
    });

    partsListEl.addEventListener('click', (e) => {
      const card = e.target.closest('.part-card');
      if (!card) return;
      const partId = card.getAttribute('data-part-id');
      const part = state.parts.find((p) => p.id === partId);
      if (!part) return;

      const statusBtn = e.target.closest('.part-status-btn');
      if (statusBtn) {
        const newStatus = statusBtn.getAttribute('data-status');
        part.status = newStatus;
        if (newStatus === 'sold' && !part.soldAt) {
          part.soldAt = todayIso();
          const soldInput = card.querySelector('.part-sold-date-input');
          if (soldInput) soldInput.value = part.soldAt;
        }
        card.classList.toggle('is-sold', newStatus === 'sold');
        card.querySelectorAll('.part-status-btn').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-status') === newStatus);
        });
        updatePartCardFinanceDom(card, part);
        renderPartsKpis();
        saveState();
        if (newStatus === 'sold') {
          showToast('Продажа железа учтена в чистой прибыли!', 'success');
        }
        return;
      }

      const markupBtn = e.target.closest('.part-markup-btn');
      if (markupBtn) {
        const invested = getPartInvested(part);
        if (invested <= 0) {
          showToast('Сначала укажите цену закупки', 'error');
          return;
        }
        const pct = Number(markupBtn.getAttribute('data-markup')) || 0;
        const rawTarget = invested * (1 + pct / 100);
        const step = state.currency === '$' || state.currency === '€' ? 10 : 100;
        const rounded = Math.ceil(rawTarget / step) * step;
        part.salePrice = rounded;
        const saleInput = card.querySelector('.part-sale-input');
        if (saleInput) saleInput.value = rounded;
        updatePartCardFinanceDom(card, part);
        renderPartsKpis();
        saveState();
        showToast(`Установлена цена +${pct}%: ${formatMoney(rounded)}`);
        return;
      }

      if (e.target.closest('.btn-part-dup')) {
        const copy = {
          ...part,
          id: uid('part'),
          name: part.name ? `${part.name} (копия)` : '',
          status: 'for_sale',
          boughtAt: todayIso(),
          soldAt: ''
        };
        const idx = state.parts.findIndex((p) => p.id === part.id);
        state.parts.splice(idx >= 0 ? idx + 1 : 0, 0, copy);
        saveState();
        updateNavTabs(currentRoute);
        renderPartsView();
        showToast('Создана копия позиции', 'success');
        return;
      }

      if (e.target.closest('.btn-part-del')) {
        const title = part.name ? `«${part.name}»` : 'эту позицию';
        if (!confirm(`Удалить ${title}?`)) return;
        state.parts = state.parts.filter((p) => p.id !== part.id);
        saveState();
        updateNavTabs(currentRoute);
        renderPartsView();
        showToast('Позиция удалена');
      }
    });

    window.addEventListener('hashchange', router);
  }

  function init() {
    state = loadLocalState();
    $('currency-select').value = state.currency;
    bindEvents();
    router();
    detectAndSyncServer();
  }

  init();
})();
