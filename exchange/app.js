const STORAGE_KEY = "australia-coin-user-id";
const BINANCE_WS_SYMBOLS = [
  "btcusdt",
  "ethusdt",
  "solusdt",
  "dogeusdt",
  "adausdt",
  "xrpusdt",
  "trxusdt"
];

const state = {
  userId: window.localStorage.getItem(STORAGE_KEY) || "",
  payload: null,
  marketFilter: "all",
  selectedSymbol: "BTCUSDT",
  tradeSide: "buy",
  powerAction: "mint",
  liveQuotes: {},
  socket: null,
  refreshTimer: null,
  lastUpdatedAt: null
};

const elements = {
  heroPowerPrice: document.querySelector("#heroPowerPrice"),
  heroEquity: document.querySelector("#heroEquity"),
  heroPowerBalance: document.querySelector("#heroPowerBalance"),
  lastUpdated: document.querySelector("#lastUpdated"),
  syncBadge: document.querySelector("#syncBadge"),
  trustGrid: document.querySelector("#trustGrid"),
  registerForm: document.querySelector("#registerForm"),
  registerUsername: document.querySelector("#registerUsername"),
  registerTelegram: document.querySelector("#registerTelegram"),
  registerInvite: document.querySelector("#registerInvite"),
  accountMode: document.querySelector("#accountMode"),
  accountGrid: document.querySelector("#accountGrid"),
  promoGrid: document.querySelector("#promoGrid"),
  leaderboardList: document.querySelector("#leaderboardList"),
  tickerStrip: document.querySelector("#tickerStrip"),
  marketList: document.querySelector("#marketList"),
  tradeSymbol: document.querySelector("#tradeSymbol"),
  tradeSymbolMeta: document.querySelector("#tradeSymbolMeta"),
  tradeLastPrice: document.querySelector("#tradeLastPrice"),
  orderBook: document.querySelector("#orderBook"),
  tradeForm: document.querySelector("#tradeForm"),
  marketTypeInput: document.querySelector("#marketTypeInput"),
  actionInput: document.querySelector("#actionInput"),
  quantityInput: document.querySelector("#quantityInput"),
  leverageField: document.querySelector("#leverageField"),
  leverageInput: document.querySelector("#leverageInput"),
  tradeSubmit: document.querySelector("#tradeSubmit"),
  powerRegion: document.querySelector("#powerRegion"),
  powerPrice: document.querySelector("#powerPrice"),
  powerGrid: document.querySelector("#powerGrid"),
  powerForm: document.querySelector("#powerForm"),
  powerAmountInput: document.querySelector("#powerAmountInput"),
  powerAddressField: document.querySelector("#powerAddressField"),
  powerAddressInput: document.querySelector("#powerAddressInput"),
  powerSubmit: document.querySelector("#powerSubmit"),
  assetOverview: document.querySelector("#assetOverview"),
  assetList: document.querySelector("#assetList"),
  orderList: document.querySelector("#orderList"),
  depositList: document.querySelector("#depositList"),
  depositForm: document.querySelector("#depositForm"),
  depositNetworkInput: document.querySelector("#depositNetworkInput"),
  depositAmountInput: document.querySelector("#depositAmountInput"),
  depositTxHashInput: document.querySelector("#depositTxHashInput"),
  depositRecordList: document.querySelector("#depositRecordList"),
  adminQueueList: document.querySelector("#adminQueueList")
};

function fmt(value, digits = 2) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function priceFmt(value) {
  const n = Number(value || 0);
  const digits = n < 0.01 ? 8 : n < 1 ? 6 : n < 100 ? 4 : 2;
  return fmt(n, digits);
}

function signedClass(value) {
  return Number(value || 0) >= 0 ? "positive" : "negative";
}

function shortAddress(address) {
  if (!address) return "--";
  if (address.length < 15) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

function baseQuotes() {
  return state.payload?.trading?.quotes || [];
}

function mergedQuote(item) {
  const live = state.liveQuotes[item.symbol];
  if (!live) return item;
  return {
    ...item,
    price: live.price ?? item.price,
    changePct: live.changePct ?? item.changePct,
    high24h: live.high24h ?? item.high24h,
    low24h: live.low24h ?? item.low24h,
    turnover: live.turnover ?? item.turnover
  };
}

function quotes() {
  return baseQuotes().map(mergedQuote);
}

function quoteBySymbol(symbol) {
  return quotes().find((item) => item.symbol === symbol) || quotes()[0];
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

async function bootstrap(symbol = state.selectedSymbol) {
  const query = new URLSearchParams();
  if (state.userId) query.set("userId", state.userId);
  if (symbol) query.set("symbol", symbol);
  const payload = await api(`/api/exchange/bootstrap?${query.toString()}`);
  state.payload = payload;
  state.userId = payload.user.id;
  state.lastUpdatedAt = new Date();
  window.localStorage.setItem(STORAGE_KEY, state.userId);
  render();
}

function renderHero() {
  const power = state.payload.power;
  const trading = state.payload.trading;
  elements.heroPowerPrice.textContent = `${fmt(power.market.tokenUsdt, 4)} USDT`;
  elements.heroEquity.textContent = `${fmt(trading.overview.totalEquity, 4)} USDT`;
  elements.heroPowerBalance.textContent = `${fmt(power.wallet.balance, 2)} ${power.market.tokenSymbol}`;
  elements.lastUpdated.textContent = state.lastUpdatedAt
    ? state.lastUpdatedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--";
  elements.syncBadge.textContent = Object.keys(state.liveQuotes).length ? "Binance live stream" : "Refreshing market feed";
  elements.assetOverview.textContent = `Available ${fmt(trading.overview.available, 4)} USDT · Margin ${fmt(trading.overview.marginUsed, 4)} USDT`;
}

function renderTrust() {
  const power = state.payload.power;
  const deposit = state.payload.deposit;
  const trc20 = deposit.networks.find((item) => item.network === "TRC20");
  const trustCards = [
    {
      label: "Price source",
      value: `${power.market.dataSource || "Internal reference"} + Binance`,
      meta: power.market.reportFile
        ? `AEMO report ${power.market.reportFile} · settlement ${power.market.settlementDate}`
        : "Crypto spot quotes update from Binance official market streams. Australia Coin remains a platform reference asset."
    },
    {
      label: "Settlement rail",
      value: trc20?.enabled ? "USDT on TRON" : "Address pending",
      meta: trc20?.enabled ? `Primary deposit route: ${shortAddress(trc20.address)}` : "No active deposit address configured."
    },
    {
      label: "Reference peg",
      value: power.market.peg,
      meta: `${fmt(power.market.spotCnyPerKwh, 4)} CNY/kWh spot reference · ${fmt(power.market.futuresCnyPerKwh, 4)} CNY/kWh forward reference`
    },
    {
      label: "Operations status",
      value: "Manual treasury review",
      meta: "Submitted transfers are reviewed before platform balance is credited. This is visible to users and operations."
    }
  ];

  elements.trustGrid.innerHTML = trustCards.map((item) => `
    <article class="trust-card">
      <span class="trust-label">${item.label}</span>
      <strong class="trust-value">${item.value}</strong>
      <span class="trust-meta">${item.meta}</span>
    </article>
  `).join("");
}

function renderAccount() {
  const profile = state.payload.profile;
  const promo = state.payload.promo;
  elements.accountMode.textContent = "Invitation and settlement profile";
  elements.accountGrid.innerHTML = [
    ["Display name", profile.username || "Not set"],
    ["Telegram", profile.telegramHandle || "Not linked"],
    ["Invite code", profile.inviteCode],
    ["Inviter", profile.inviterCode || "None"]
  ].map(([label, value]) => `
    <article class="power-stat">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");

  elements.promoGrid.innerHTML = [
    ["Trading fee", `${fmt(promo.feeRate * 100, 2)}%`],
    ["Noon rebate", `${fmt(promo.rebateRate * 100, 2)}%`],
    ["Fee estimate", `${fmt(promo.estimatedFee, 4)} USDT`],
    ["Rebate estimate", `${fmt(promo.estimatedNoonRebate, 4)} USDT`]
  ].map(([label, value]) => `
    <article class="power-stat">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");

  elements.leaderboardList.innerHTML = (state.payload.leaderboard || []).length
    ? state.payload.leaderboard.map((item, index) => `
      <article class="order-row">
        <div>
          <strong>#${index + 1} ${item.inviteCode}</strong>
          <div class="market-meta">Top referral flow</div>
        </div>
        <div><strong>${item.referrals} users</strong></div>
      </article>
    `).join("")
    : `<article class="order-row"><div><strong>No referrals yet</strong><div class="market-meta">Referral activity will appear here.</div></div></article>`;
}

function renderTickers() {
  const items = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT"].map((symbol) => quoteBySymbol(symbol)).filter(Boolean);
  elements.tickerStrip.innerHTML = items.map((item) => `
    <button class="ticker-chip" type="button" data-symbol="${item.symbol}">
      <strong>${item.symbol}</strong>
      <div class="${signedClass(item.changePct)}">${priceFmt(item.price)} · ${item.changePct >= 0 ? "+" : ""}${fmt(item.changePct, 2)}%</div>
    </button>
  `).join("");
}

function renderMarkets() {
  const list = quotes().filter((item) => state.marketFilter === "all" || item.marketType === state.marketFilter);
  elements.marketList.innerHTML = list.map((item) => `
    <button class="market-row" type="button" data-symbol="${item.symbol}">
      <div>
        <strong>${item.symbol}</strong>
        <div class="market-meta">${item.name} · ${item.marketType} · ${item.source === "binance_live" ? "Binance live" : "Reference"}</div>
      </div>
      <div class="${signedClass(item.changePct)}">
        <strong>${priceFmt(item.price)}</strong>
        <div>${item.changePct >= 0 ? "+" : ""}${fmt(item.changePct, 2)}%</div>
      </div>
    </button>
  `).join("");
}

function renderTradePanel() {
  const quote = quoteBySymbol(state.selectedSymbol);
  if (!quote) return;
  const buyLabel = state.tradeSide === "buy" ? "Buy" : "Sell";
  elements.tradeSymbol.textContent = quote.symbol;
  elements.tradeSymbolMeta.textContent = `${quote.name} · ${quote.marketType}`;
  elements.tradeLastPrice.textContent = priceFmt(quote.price);
  elements.marketTypeInput.value = quote.marketType === "spot" ? "spot" : "perpetual";
  const book = syntheticBook(quote);
  elements.orderBook.innerHTML = `
    <div class="book-column">
      <h3>Asks</h3>
      ${book.asks.map((item) => `<div class="book-line"><span class="negative">${priceFmt(item.price)}</span><span>${fmt(item.quantity, 2)}</span></div>`).join("")}
    </div>
    <div class="book-column">
      <h3>Bids</h3>
      ${book.bids.map((item) => `<div class="book-line"><span class="positive">${priceFmt(item.price)}</span><span>${fmt(item.quantity, 2)}</span></div>`).join("")}
    </div>
  `;
  elements.leverageField.style.display = elements.marketTypeInput.value === "spot" ? "none" : "grid";
  if (elements.marketTypeInput.value !== "spot" && Number(elements.leverageInput.value || 0) > 500) {
    elements.leverageInput.value = "500";
  }
  elements.tradeSubmit.textContent = buyLabel;
  elements.tradeSubmit.className = `submit-button ${state.tradeSide}`;
}

function renderPowerPanel() {
  const power = state.payload.power;
  elements.powerRegion.textContent = power.market.region;
  elements.powerPrice.textContent = `${fmt(power.market.tokenUsdt, 4)} USDT`;
  elements.powerGrid.innerHTML = [
    ["Wallet address", power.wallet.address],
    ["Coin balance", `${fmt(power.wallet.balance, 2)} ${power.market.tokenSymbol}`],
    ["Peg", power.market.peg],
    ["AU spot ref", `${fmt(power.market.spotCnyPerKwh, 4)} CNY/kWh`],
    ["Forward ref", `${fmt(power.market.futuresCnyPerKwh, 4)} CNY/kWh`],
    ["Data source", power.market.dataSource || "Internal reference"],
    ["Redeemed power", `${fmt(power.wallet.redeemedKwh, 2)} kWh`]
  ].map(([label, value]) => `
    <article class="power-stat">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
  elements.powerAddressField.style.display = state.powerAction === "transfer" ? "grid" : "none";
  elements.powerSubmit.textContent = state.powerAction === "mint" ? "Mint" : state.powerAction === "redeem" ? "Redeem" : "Transfer";
  elements.powerSubmit.className = `submit-button ${state.powerAction === "redeem" ? "sell" : "buy"}`;
}

function renderAssets() {
  const trading = state.payload.trading;
  const power = state.payload.power;
  const assetRows = [
    { label: "Available USDT", value: `${fmt(trading.overview.available, 4)} USDT`, meta: "Trading wallet" },
    { label: "Australia Coin", value: `${fmt(power.wallet.balance, 2)} ${power.market.tokenSymbol}`, meta: `${fmt(power.wallet.valuationUsdt, 4)} USDT` },
    ...(trading.spotHoldings || []).slice(0, 4).map((item) => ({
      label: item.asset,
      value: `${fmt(item.value, 4)} USDT`,
      meta: `Position ${fmt(item.quantity, item.quantity < 1 ? 6 : 3)}`
    }))
  ];
  elements.assetList.innerHTML = assetRows.map((item) => `
    <article class="asset-row">
      <div>
        <strong>${item.label}</strong>
        <div class="market-meta">${item.meta}</div>
      </div>
      <div><strong>${item.value}</strong></div>
    </article>
  `).join("");
  elements.orderList.innerHTML = (trading.orders || []).slice(0, 6).map((item) => `
    <article class="order-row">
      <div>
        <strong>${item.note || item.symbol}</strong>
        <div class="market-meta">${item.createdAt} · ${item.marketType}</div>
      </div>
      <div><strong>${fmt(item.quantity, 4)} @ ${priceFmt(item.price)}</strong></div>
    </article>
  `).join("");
}

function renderDeposit() {
  const deposit = state.payload.deposit;
  elements.depositList.innerHTML = deposit.networks.map((item) => `
    <article class="deposit-card">
      <strong>${item.symbol}-${item.network}</strong>
      <div class="deposit-note">${item.chain} · ${item.feeHint} fee tier · ${item.confirmations} confirmations</div>
      <span class="address-line">${item.enabled ? item.address : "Deposit address not configured."}</span>
      ${item.enabled && item.network === "TRC20" ? '<div class="deposit-note">Send USDT on TRC20 only, then submit the on-chain transaction hash below.</div>' : ""}
    </article>
  `).join("");

  elements.depositRecordList.innerHTML = (state.payload.deposits || []).length
    ? state.payload.deposits.map((item) => `
      <article class="order-row">
        <div>
          <strong>${item.asset}-${item.network} · ${fmt(item.amount, 2)}</strong>
          <div class="market-meta">${item.submittedAt} · ${item.txHash}</div>
        </div>
        <div>
          <strong>${item.status}</strong>
          <div class="market-meta">${item.reviewerNote || ""}</div>
        </div>
      </article>
    `).join("")
    : `<article class="order-row"><div><strong>No deposits yet</strong><div class="market-meta">Submitted transfers will appear here.</div></div></article>`;

  elements.adminQueueList.innerHTML = (state.payload.adminQueue || []).length
    ? state.payload.adminQueue.map((item) => `
      <article class="order-row">
        <div>
          <strong>${item.displayName} · ${fmt(item.amount, 2)} ${item.asset}</strong>
          <div class="market-meta">${item.network} · ${item.txHash}</div>
        </div>
        <div>
          <strong>${item.status}</strong>
          ${item.status === "pending"
            ? `<div class="market-meta"><button class="seg buy" data-review-id="${item.id}" data-review-decision="approve" type="button">Approve</button> <button class="seg sell" data-review-id="${item.id}" data-review-decision="reject" type="button">Reject</button></div>`
            : `<div class="market-meta">${item.reviewerNote || ""}</div>`}
        </div>
      </article>
    `).join("")
    : `<article class="order-row"><div><strong>No pending reviews</strong><div class="market-meta">New deposits will queue here.</div></div></article>`;
}

function render() {
  if (!state.payload) return;
  renderHero();
  renderTrust();
  renderAccount();
  renderTickers();
  renderMarkets();
  renderTradePanel();
  renderPowerPanel();
  renderAssets();
  renderDeposit();
  bindDynamic();
}

function bindDynamic() {
  document.querySelectorAll("[data-symbol]").forEach((button) => {
    button.onclick = () => {
      state.selectedSymbol = button.dataset.symbol;
      renderTradePanel();
    };
  });

  document.querySelectorAll("[data-review-id]").forEach((button) => {
    button.onclick = () => {
      reviewDeposit(button.dataset.reviewId, button.dataset.reviewDecision).catch((error) => window.alert(error.message));
    };
  });

  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.onclick = () => {
      const target = document.getElementById(button.dataset.scrollTarget);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelectorAll("[data-scroll-target]").forEach((node) => node.classList.toggle("active", node === button));
    };
  });
}

function updateLiveQuote(symbol, data) {
  const key = symbol.toUpperCase();
  const base = quoteBySymbol(key);
  if (!base) return;
  const price = Number(data.c || data.lastPrice || base.price);
  const changePct = Number(data.P || data.priceChangePercent || base.changePct);
  state.liveQuotes[key] = {
    price,
    changePct,
    high24h: Number(data.h || data.highPrice || base.high24h),
    low24h: Number(data.l || data.lowPrice || base.low24h),
    turnover: data.q || data.quoteVolume || base.turnover
  };
  state.lastUpdatedAt = new Date();
  render();
}

function connectBinanceStream() {
  if (state.socket) state.socket.close();
  const stream = BINANCE_WS_SYMBOLS.map((item) => `${item}@ticker`).join("/");
  try {
    const socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${stream}`);
    state.socket = socket;
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message?.data?.s) return;
      updateLiveQuote(message.data.s, message.data);
    };
    socket.onopen = () => {
      elements.syncBadge.textContent = "Binance live stream";
    };
    socket.onclose = () => {
      elements.syncBadge.textContent = "Reconnecting stream";
      window.setTimeout(connectBinanceStream, 2000);
    };
    socket.onerror = () => {
      elements.syncBadge.textContent = "Stream fallback";
    };
  } catch (_) {
    elements.syncBadge.textContent = "Stream unavailable";
  }
}

async function submitTrade(event) {
  event.preventDefault();
  const marketType = elements.marketTypeInput.value;
  const symbol = marketType === "spot"
    ? (quoteBySymbol(state.selectedSymbol)?.marketType === "spot" ? state.selectedSymbol : "BTCUSDT")
    : (quoteBySymbol(state.selectedSymbol)?.marketType === "perpetual" ? state.selectedSymbol : "BTC-PERP");
  const actionValue = elements.actionInput.value;
  const isSpot = marketType === "spot";
  const action = isSpot ? actionValue : (actionValue === "buy" ? "open" : "close");
  const side = state.tradeSide === "sell" ? "short" : "long";
  const payload = await api("/api/trade/order", {
    method: "POST",
    body: JSON.stringify({
      userId: state.userId,
      symbol,
      marketType,
      action,
      side,
      orderKind: "market",
      quantity: Number(elements.quantityInput.value || 0),
      leverage: Math.max(1, Math.min(500, Number(elements.leverageInput.value || 50)))
    })
  });
  state.payload.trading = payload;
  render();
}

async function submitPower(event) {
  event.preventDefault();
  const payload = await api("/api/power/action", {
    method: "POST",
    body: JSON.stringify({
      userId: state.userId,
      action: state.powerAction,
      tokenAmount: Number(elements.powerAmountInput.value || 0),
      toAddress: elements.powerAddressInput.value.trim()
    })
  });
  state.payload.power = payload;
  render();
}

async function submitRegister(event) {
  event.preventDefault();
  const payload = await api("/api/exchange/register-demo", {
    method: "POST",
    body: JSON.stringify({
      userId: state.userId,
      username: elements.registerUsername.value.trim(),
      telegramHandle: elements.registerTelegram.value.trim(),
      inviterCode: elements.registerInvite.value.trim()
    })
  });
  state.payload.user = payload.user;
  state.payload.profile = payload.profile;
  state.payload.promo = payload.promo;
  render();
}

async function submitDeposit(event) {
  event.preventDefault();
  const payload = await api("/api/exchange/deposit-demo", {
    method: "POST",
    body: JSON.stringify({
      userId: state.userId,
      network: elements.depositNetworkInput.value,
      amount: Number(elements.depositAmountInput.value || 0),
      txHash: elements.depositTxHashInput.value.trim()
    })
  });
  state.payload.deposits = payload.deposits;
  state.payload.adminQueue = payload.adminQueue;
  render();
}

async function reviewDeposit(depositId, decision) {
  await api("/api/exchange/review-deposit-demo", {
    method: "POST",
    body: JSON.stringify({
      depositId,
      decision,
      reviewerNote: decision === "approve" ? "Treasury approval completed" : "Treasury review rejected"
    })
  });
  await bootstrap(state.selectedSymbol);
}

function startAutoRefresh() {
  if (state.refreshTimer) window.clearInterval(state.refreshTimer);
  state.refreshTimer = window.setInterval(() => {
    bootstrap(state.selectedSymbol).catch(() => {});
  }, 15000);
}

document.querySelectorAll("[data-market-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.marketFilter = button.dataset.marketFilter;
    document.querySelectorAll("[data-market-filter]").forEach((node) => node.classList.toggle("active", node === button));
    renderMarkets();
    bindDynamic();
  });
});

document.querySelectorAll("[data-side]").forEach((button) => {
  button.addEventListener("click", () => {
    state.tradeSide = button.dataset.side;
    document.querySelectorAll("[data-side]").forEach((node) => node.classList.toggle("active", node === button));
    renderTradePanel();
  });
});

document.querySelectorAll("[data-power-action]").forEach((button) => {
  button.addEventListener("click", () => {
    state.powerAction = button.dataset.powerAction;
    document.querySelectorAll("[data-power-action]").forEach((node) => node.classList.toggle("active", node === button));
    renderPowerPanel();
  });
});

elements.marketTypeInput.addEventListener("change", renderTradePanel);
elements.tradeForm.addEventListener("submit", (event) => submitTrade(event).catch((error) => window.alert(error.message)));
elements.powerForm.addEventListener("submit", (event) => submitPower(event).catch((error) => window.alert(error.message)));
elements.registerForm.addEventListener("submit", (event) => submitRegister(event).catch((error) => window.alert(error.message)));
elements.depositForm.addEventListener("submit", (event) => submitDeposit(event).catch((error) => window.alert(error.message)));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/exchange/sw.js").catch(() => {});
  });
}

bootstrap()
  .then(() => {
    connectBinanceStream();
    startAutoRefresh();
  })
  .catch((error) => window.alert(error.message));
