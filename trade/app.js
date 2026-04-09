const state = {
  userId: window.localStorage.getItem("trade-demo-user-id") || "",
  activeScreen: "overview",
  marketFilter: "all",
  selectedSpotSymbol: "BTCUSDT",
  selectedPerpSymbol: "BTC-PERP",
  spotSide: "buy",
  perpSide: "long",
  payload: null
};

const elements = {
  statusPill: document.querySelector("#statusPill"),
  totalEquity: document.querySelector("#totalEquity"),
  pnlValue: document.querySelector("#pnlValue"),
  riskLevel: document.querySelector("#riskLevel"),
  summaryGrid: document.querySelector("#summaryGrid"),
  favoritesList: document.querySelector("#favoritesList"),
  marketList: document.querySelector("#marketList"),
  spotSymbolTitle: document.querySelector("#spotSymbolTitle"),
  spotTicker: document.querySelector("#spotTicker"),
  spotBook: document.querySelector("#spotBook"),
  spotChart: document.querySelector("#spotChart"),
  perpSymbolTitle: document.querySelector("#perpSymbolTitle"),
  perpTicker: document.querySelector("#perpTicker"),
  perpBook: document.querySelector("#perpBook"),
  positionList: document.querySelector("#positionList"),
  assetList: document.querySelector("#assetList"),
  orderList: document.querySelector("#orderList"),
  availableCash: document.querySelector("#availableCash"),
  spotOrderForm: document.querySelector("#spotOrderForm"),
  spotOrderKind: document.querySelector("#spotOrderKind"),
  spotPriceInput: document.querySelector("#spotPriceInput"),
  spotQtyInput: document.querySelector("#spotQtyInput"),
  spotSubmitButton: document.querySelector("#spotSubmitButton"),
  perpOrderForm: document.querySelector("#perpOrderForm"),
  perpActionInput: document.querySelector("#perpActionInput"),
  perpLeverageInput: document.querySelector("#perpLeverageInput"),
  perpQtyInput: document.querySelector("#perpQtyInput"),
  perpSubmitButton: document.querySelector("#perpSubmitButton")
};

function formatNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatPrice(value) {
  const number = Number(value || 0);
  const digits = number < 1 ? 6 : number < 100 ? 4 : 2;
  return formatNumber(number, digits);
}

function signedClass(value) {
  return Number(value || 0) >= 0 ? "positive" : "negative";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "请求失败");
  }
  return payload;
}

function quoteMap() {
  return Object.fromEntries((state.payload?.quotes || []).map((item) => [item.symbol, item]));
}

function syntheticBook(quote) {
  const step = quote.price < 1 ? 0.00001 : quote.price < 100 ? 0.01 : 1.2;
  return {
    asks: Array.from({ length: 6 }).map((_, index) => ({
      price: quote.price + step * (index + 1),
      quantity: (index + 2) * (quote.price < 1 ? 160.4 : quote.price < 100 ? 72.8 : 18.4)
    })),
    bids: Array.from({ length: 6 }).map((_, index) => ({
      price: quote.price - step * (index + 1),
      quantity: (index + 2) * (quote.price < 1 ? 148.2 : quote.price < 100 ? 68.1 : 16.7)
    }))
  };
}

function syntheticCandles(quote) {
  const seed = Math.floor(Date.now() / 300000);
  return Array.from({ length: 24 }).map((_, index) => {
    const close = quote.price * (1 + Math.sin((seed - index) / 5) * 0.015);
    return { close };
  });
}

function applyPayload(payload) {
  state.payload = payload;
  state.userId = payload.user.id;
  window.localStorage.setItem("trade-demo-user-id", state.userId);
  render();
}

async function loadBootstrap(symbol) {
  const query = new URLSearchParams();
  if (state.userId) query.set("userId", state.userId);
  if (symbol) query.set("symbol", symbol);
  const payload = await api(`/api/trade/bootstrap?${query.toString()}`);
  applyPayload(payload);
}

function setActiveScreen(screen) {
  state.activeScreen = screen;
  document.querySelectorAll(".screen").forEach((node) => {
    node.classList.toggle("active", node.id === `screen-${screen}`);
  });
  document.querySelectorAll("[data-screen]").forEach((node) => {
    node.classList.toggle("active", node.dataset.screen === screen);
  });
}

function renderSummary() {
  const overview = state.payload.overview;
  elements.totalEquity.textContent = `${formatNumber(overview.totalEquity, 4)} USDT`;
  elements.pnlValue.textContent = `${overview.unrealizedPnl >= 0 ? "+" : ""}${formatNumber(overview.unrealizedPnl, 4)} USDT`;
  elements.pnlValue.className = signedClass(overview.unrealizedPnl);
  elements.riskLevel.textContent = `风险 ${overview.riskLevel}`;
  elements.availableCash.textContent = `可用 ${formatNumber(overview.available, 4)} USDT`;
  elements.summaryGrid.innerHTML = [
    ["可用保证金", `${formatNumber(overview.available, 4)} USDT`],
    ["现货市值", `${formatNumber(overview.spotValue, 4)} USDT`],
    ["占用保证金", `${formatNumber(overview.marginUsed, 4)} USDT`],
    ["浮动收益率", `${overview.pnlPct >= 0 ? "+" : ""}${formatNumber(overview.pnlPct, 2)}%`]
  ].map(([label, value]) => `
    <article class="mini-stat">
      <span class="eyebrow">${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderFavorites() {
  elements.favoritesList.innerHTML = (state.payload.favorites || []).map((quote) => `
    <button class="market-tile" type="button" data-symbol="${quote.symbol}" data-market="${quote.marketType}">
      <div class="symbol-stack">
        <strong>${quote.symbol}</strong>
        <span>${quote.name}</span>
      </div>
      <div class="right-stack ${signedClass(quote.changePct)}">
        <strong>${formatPrice(quote.price)}</strong>
        <span>${quote.changePct >= 0 ? "+" : ""}${formatNumber(quote.changePct, 2)}%</span>
      </div>
    </button>
  `).join("");
}

function renderMarkets() {
  const quotes = state.payload.quotes.filter((item) => state.marketFilter === "all" || item.marketType === state.marketFilter);
  elements.marketList.innerHTML = quotes.map((quote) => {
    const isActive = quote.symbol === state.selectedSpotSymbol || quote.symbol === state.selectedPerpSymbol;
    return `
      <button class="market-row ${isActive ? "active" : ""}" type="button" data-symbol="${quote.symbol}" data-market="${quote.marketType}">
        <div class="symbol-stack">
          <strong>${quote.symbol}</strong>
          <span>${quote.name} · 24h ${quote.turnover}</span>
        </div>
        <div class="right-stack ${signedClass(quote.changePct)}">
          <strong>${formatPrice(quote.price)}</strong>
          <span>${quote.changePct >= 0 ? "+" : ""}${formatNumber(quote.changePct, 2)}%</span>
        </div>
      </button>
    `;
  }).join("");
}

function renderBook(target, symbol) {
  const lookup = quoteMap();
  const quote = lookup[symbol];
  const book = syntheticBook(quote);
  target.innerHTML = `
    <div class="book-column">
      <h3>卖盘</h3>
      ${book.asks.map((item) => `<div class="book-line"><span class="negative">${formatPrice(item.price)}</span><span>${formatNumber(item.quantity, 2)}</span></div>`).join("")}
    </div>
    <div class="book-column">
      <h3>买盘</h3>
      ${book.bids.map((item) => `<div class="book-line"><span class="positive">${formatPrice(item.price)}</span><span>${formatNumber(item.quantity, 2)}</span></div>`).join("")}
      <div class="book-line"><strong>最新</strong><strong>${formatPrice(quote.price)}</strong></div>
    </div>
  `;
}

function renderChart() {
  const quote = quoteMap()[state.selectedSpotSymbol] || quoteMap().BTCUSDT;
  const candles = syntheticCandles(quote);
  const values = candles.map((item) => item.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  elements.spotChart.innerHTML = candles.map((item) => {
    const ratio = max === min ? 0.5 : (item.close - min) / (max - min);
    return `<div class="bar" style="height:${40 + ratio * 80}px" title="${formatPrice(item.close)}"></div>`;
  }).join("");
}

function renderSpotSection() {
  const quote = quoteMap()[state.selectedSpotSymbol] || quoteMap().BTCUSDT;
  elements.spotSymbolTitle.textContent = quote.symbol;
  elements.spotTicker.textContent = `${formatPrice(quote.price)} · ${quote.changePct >= 0 ? "+" : ""}${formatNumber(quote.changePct, 2)}%`;
  renderBook(elements.spotBook, quote.symbol);
  renderChart();
  elements.spotPriceInput.placeholder = `市价 ${formatPrice(quote.price)}`;
}

function renderPerpSection() {
  const quote = quoteMap()[state.selectedPerpSymbol] || quoteMap()["BTC-PERP"];
  elements.perpSymbolTitle.textContent = quote.symbol;
  elements.perpTicker.textContent = `${formatPrice(quote.price)} · ${quote.changePct >= 0 ? "+" : ""}${formatNumber(quote.changePct, 2)}%`;
  renderBook(elements.perpBook, quote.symbol);
  const positions = state.payload.positions.filter((item) => item.symbol === quote.symbol);
  elements.positionList.innerHTML = positions.length ? positions.map((item) => `
    <article class="position-row">
      <div class="symbol-stack">
        <strong>${item.side === "long" ? "多单" : "空单"} · ${item.symbol}</strong>
        <span class="position-meta">数量 ${formatNumber(item.quantity, 4)} | 杠杆 ${item.leverage}x | 开仓 ${formatPrice(item.entryPrice)}</span>
      </div>
      <div class="right-stack ${signedClass(item.unrealizedPnl)}">
        <strong>${item.unrealizedPnl >= 0 ? "+" : ""}${formatNumber(item.unrealizedPnl, 4)} USDT</strong>
        <span>保证金 ${formatNumber(item.marginUsed, 4)}</span>
      </div>
    </article>
  `).join("") : `<div class="position-row"><div class="symbol-stack"><strong>暂无持仓</strong><span class="position-meta">你可以先开一笔模拟合约单试试。</span></div></div>`;
}

function renderAssets() {
  const spotRows = [
    { asset: "USDT", quantity: state.payload.overview.cash, value: state.payload.overview.cash, price: 1, pnl: 0, changePct: 0 },
    ...(state.payload.spotHoldings || [])
  ];
  elements.assetList.innerHTML = spotRows.map((item) => `
    <article class="asset-row">
      <div class="symbol-stack">
        <strong>${item.asset}</strong>
        <span>持仓 ${formatNumber(item.quantity, item.quantity < 1 ? 6 : 3)}</span>
      </div>
      <div class="right-stack ${signedClass(item.pnl)}">
        <strong>${formatNumber(item.value, 4)} USDT</strong>
        <span>${item.pnl ? `${item.pnl >= 0 ? "+" : ""}${formatNumber(item.pnl, 4)} USDT` : "稳定币余额"}</span>
      </div>
    </article>
  `).join("");
  elements.orderList.innerHTML = (state.payload.orders || []).length ? state.payload.orders.map((item) => `
    <article class="order-row">
      <div class="symbol-stack">
        <strong>${item.note || item.symbol}</strong>
        <span class="order-meta">${item.createdAt} · ${item.marketType} · ${item.orderKind}</span>
      </div>
      <div class="right-stack">
        <strong>${formatNumber(item.quantity, 4)} @ ${formatPrice(item.price)}</strong>
        <span>${item.status}</span>
      </div>
    </article>
  `).join("") : `<div class="order-row"><div class="symbol-stack"><strong>暂无订单</strong><span class="order-meta">下单后这里会显示成交记录。</span></div></div>`;
}

function render() {
  elements.statusPill.textContent = `模拟盘 · ${state.payload.user.name}`;
  renderSummary();
  renderFavorites();
  renderMarkets();
  renderSpotSection();
  renderPerpSection();
  renderAssets();
  bindDynamicButtons();
  setActiveScreen(state.activeScreen);
}

function handleSymbolSelection(symbol, market) {
  if (market === "spot") {
    state.selectedSpotSymbol = symbol;
    loadBootstrap(symbol).catch((error) => window.alert(error.message));
    return;
  }
  state.selectedPerpSymbol = symbol;
  loadBootstrap(symbol).catch((error) => window.alert(error.message));
}

function bindDynamicButtons() {
  document.querySelectorAll("[data-symbol][data-market]").forEach((button) => {
    button.onclick = () => {
      handleSymbolSelection(button.dataset.symbol, button.dataset.market);
      setActiveScreen(button.dataset.market === "spot" ? "spot" : "perp");
    };
  });
}

async function submitSpotOrder(event) {
  event.preventDefault();
  try {
    const payload = await api("/api/trade/order", {
      method: "POST",
      body: JSON.stringify({
        userId: state.userId,
        symbol: state.selectedSpotSymbol,
        marketType: "spot",
        action: state.spotSide,
        orderKind: elements.spotOrderKind.value,
        price: Number(elements.spotPriceInput.value || 0),
        quantity: Number(elements.spotQtyInput.value || 0)
      })
    });
    applyPayload({ ...payload, user: state.payload.user });
  } catch (error) {
    window.alert(error.message);
  }
}

async function submitPerpOrder(event) {
  event.preventDefault();
  try {
    const payload = await api("/api/trade/order", {
      method: "POST",
      body: JSON.stringify({
        userId: state.userId,
        symbol: state.selectedPerpSymbol,
        marketType: "perpetual",
        action: elements.perpActionInput.value,
        side: state.perpSide,
        leverage: Number(elements.perpLeverageInput.value || 10),
        quantity: Number(elements.perpQtyInput.value || 0)
      })
    });
    applyPayload({ ...payload, user: state.payload.user });
  } catch (error) {
    window.alert(error.message);
  }
}

function bindStaticEvents() {
  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => setActiveScreen(button.dataset.screen));
  });
  document.querySelectorAll("[data-market-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketFilter = button.dataset.marketFilter;
      document.querySelectorAll("[data-market-filter]").forEach((node) => node.classList.toggle("active", node === button));
      renderMarkets();
      bindDynamicButtons();
    });
  });
  document.querySelectorAll("[data-side-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      state.spotSide = button.dataset.sideToggle;
      document.querySelectorAll("[data-side-toggle]").forEach((node) => node.classList.toggle("active", node === button));
      elements.spotSubmitButton.textContent = state.spotSide === "buy" ? "买入" : "卖出";
      elements.spotSubmitButton.className = `submit-button ${state.spotSide}`;
    });
  });
  document.querySelectorAll("[data-position-side]").forEach((button) => {
    button.addEventListener("click", () => {
      state.perpSide = button.dataset.positionSide;
      document.querySelectorAll("[data-position-side]").forEach((node) => node.classList.toggle("active", node === button));
      const label = state.perpSide === "long" ? (elements.perpActionInput.value === "open" ? "开多" : "平多") : (elements.perpActionInput.value === "open" ? "开空" : "平空");
      elements.perpSubmitButton.textContent = label;
      elements.perpSubmitButton.className = `submit-button ${state.perpSide === "long" ? "buy" : "sell"}`;
    });
  });
  elements.perpActionInput.addEventListener("change", () => {
    const label = state.perpSide === "long" ? (elements.perpActionInput.value === "open" ? "开多" : "平多") : (elements.perpActionInput.value === "open" ? "开空" : "平空");
    elements.perpSubmitButton.textContent = label;
  });
  elements.spotOrderForm.addEventListener("submit", submitSpotOrder);
  elements.perpOrderForm.addEventListener("submit", submitPerpOrder);
}

bindStaticEvents();
loadBootstrap().catch((error) => window.alert(error.message));
window.setInterval(() => loadBootstrap(state.activeScreen === "perp" ? state.selectedPerpSymbol : state.selectedSpotSymbol).catch(() => {}), 15000);
