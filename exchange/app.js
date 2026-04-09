const state = {
  userId: window.localStorage.getItem("voltx-user-id") || "",
  payload: null,
  marketFilter: "all",
  selectedSymbol: "BTCUSDT",
  tradeSide: "buy",
  powerAction: "mint"
};

const elements = {
  heroPowerPrice: document.querySelector("#heroPowerPrice"),
  heroEquity: document.querySelector("#heroEquity"),
  heroPowerBalance: document.querySelector("#heroPowerBalance"),
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
  const digits = n < 1 ? 6 : n < 100 ? 4 : 2;
  return fmt(n, digits);
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
  if (!response.ok) throw new Error(payload.error || "请求失败");
  return payload;
}

function quotes() {
  return state.payload?.trading?.quotes || [];
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
  window.localStorage.setItem("voltx-user-id", state.userId);
  render();
}

function renderHero() {
  const power = state.payload.power;
  const trading = state.payload.trading;
  elements.heroPowerPrice.textContent = `${fmt(power.market.tokenCny, 4)} CNY`;
  elements.heroEquity.textContent = `${fmt(trading.overview.totalEquity, 4)} USDT`;
  elements.heroPowerBalance.textContent = `${fmt(power.wallet.balance, 2)} PWR`;
}

function renderAccount() {
  const profile = state.payload.profile;
  const promo = state.payload.promo;
  elements.accountMode.textContent = `模式: ${profile.mode === "demo" ? "体验版" : profile.mode}`;
  elements.accountGrid.innerHTML = [
    ["用户名", profile.username || "未填写"],
    ["Telegram", profile.telegramHandle || "未绑定"],
    ["我的邀请码", profile.inviteCode],
    ["上级邀请码", profile.inviterCode || "无"]
  ].map(([label, value]) => `
    <article class="power-stat">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
  elements.promoGrid.innerHTML = [
    ["展示手续费率", `${fmt(promo.feeRate * 100, 2)}%`],
    ["展示返还率", `${fmt(promo.rebateRate * 100, 2)}%`],
    ["当日展示手续费", `${fmt(promo.estimatedFee, 4)} USDT`],
    ["中午预计返还", `${fmt(promo.estimatedNoonRebate, 4)} USDT`]
  ].map(([label, value]) => `
    <article class="power-stat">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
  elements.leaderboardList.innerHTML = (state.payload.leaderboard || []).length ? state.payload.leaderboard.map((item, index) => `
    <article class="order-row">
      <div>
        <strong>#${index + 1} ${item.inviteCode}</strong>
        <div class="market-meta">体验版邀请排行</div>
      </div>
      <div><strong>${item.referrals} 人</strong></div>
    </article>
  `).join("") : `<article class="order-row"><div><strong>暂无邀请数据</strong><div class="market-meta">等用户用邀请码注册后会显示。</div></div></article>`;
}

function renderTickers() {
  const items = ["BTCUSDT", "ETHUSDT", "BTC-PERP", "GC1!"].map((symbol) => quoteBySymbol(symbol)).filter(Boolean);
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
    <button class="market-row" type="button" data-symbol="${item.symbol}" data-market-type="${item.marketType}">
      <div>
        <strong>${item.symbol}</strong>
        <div class="market-meta">${item.name} · ${item.marketType}</div>
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
  elements.tradeSymbol.textContent = quote.symbol;
  elements.tradeSymbolMeta.textContent = `${quote.name} · ${quote.marketType}`;
  elements.tradeLastPrice.textContent = priceFmt(quote.price);
  elements.marketTypeInput.value = quote.marketType === "spot" ? "spot" : "perpetual";
  const book = syntheticBook(quote);
  elements.orderBook.innerHTML = `
    <div class="book-column">
      <h3>卖盘</h3>
      ${book.asks.map((item) => `<div class="book-line"><span class="negative">${priceFmt(item.price)}</span><span>${fmt(item.quantity, 2)}</span></div>`).join("")}
    </div>
    <div class="book-column">
      <h3>买盘</h3>
      ${book.bids.map((item) => `<div class="book-line"><span class="positive">${priceFmt(item.price)}</span><span>${fmt(item.quantity, 2)}</span></div>`).join("")}
    </div>
  `;
  elements.leverageField.style.display = elements.marketTypeInput.value === "spot" ? "none" : "grid";
  if (elements.marketTypeInput.value !== "spot" && Number(elements.leverageInput.value || 0) > 500) {
    elements.leverageInput.value = "500";
  }
}

function renderPowerPanel() {
  const power = state.payload.power;
  elements.powerRegion.textContent = power.market.region;
  elements.powerPrice.textContent = `${fmt(power.market.tokenCny, 4)} CNY`;
  elements.powerGrid.innerHTML = [
    ["钱包地址", power.wallet.address],
    ["PWR 余额", `${fmt(power.wallet.balance, 2)} PWR`],
    ["锚定规则", power.market.peg],
    ["澳洲电价参考", `${fmt(power.market.spotCnyPerKwh, 4)} CNY/kWh`],
    ["期货结算参考", `${fmt(power.market.futuresCnyPerKwh, 4)} CNY/kWh`],
    ["累计赎回电量", `${fmt(power.wallet.redeemedKwh, 2)} kWh`]
  ].map(([label, value]) => `
    <article class="power-stat">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
  elements.powerAddressField.style.display = state.powerAction === "transfer" ? "grid" : "none";
  elements.powerSubmit.textContent = state.powerAction === "mint" ? "铸造" : state.powerAction === "redeem" ? "赎回" : "转账";
  elements.powerSubmit.className = `submit-button ${state.powerAction === "redeem" ? "sell" : "buy"}`;
}

function renderAssets() {
  const trading = state.payload.trading;
  const power = state.payload.power;
  elements.assetOverview.textContent = `USDT ${fmt(trading.overview.totalEquity, 4)} · PWR ${fmt(power.wallet.balance, 2)}`;
  const assetRows = [
    { label: "USDT 可用余额", value: `${fmt(trading.overview.available, 4)} USDT`, meta: "站内交易余额" },
    { label: "PWR 钱包余额", value: `${fmt(power.wallet.balance, 2)} PWR`, meta: `${fmt(power.wallet.valuationCny, 2)} CNY` },
    ...(trading.spotHoldings || []).slice(0, 4).map((item) => ({
      label: item.asset,
      value: `${fmt(item.value, 4)} USDT`,
      meta: `持仓 ${fmt(item.quantity, item.quantity < 1 ? 6 : 3)}`
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
      <div class="deposit-note">${item.chain} · ${item.feeHint}手续费 · ${item.confirmations} 次确认</div>
      <span class="address-line">${item.enabled ? item.address : "未配置收款地址，请在服务端环境变量中填写。"}</span>
      ${item.enabled && item.network === "TRC20" ? '<div class="deposit-note">把 USDT-TRC20 转到这条地址，然后把链上 Tx Hash 填到下面提交。</div>' : ""}
    </article>
  `).join("");
  elements.depositRecordList.innerHTML = (state.payload.deposits || []).length ? state.payload.deposits.map((item) => `
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
  `).join("") : `<article class="order-row"><div><strong>暂无充值记录</strong><div class="market-meta">提交一笔演示充值后这里会显示。</div></div></article>`;
  elements.adminQueueList.innerHTML = (state.payload.adminQueue || []).length ? state.payload.adminQueue.map((item) => `
    <article class="order-row">
      <div>
        <strong>${item.displayName} · ${fmt(item.amount, 2)} ${item.asset}</strong>
        <div class="market-meta">${item.network} · ${item.txHash}</div>
      </div>
      <div>
        <strong>${item.status}</strong>
        ${item.status === "pending" ? `<div class="market-meta"><button class="seg buy" data-review-id="${item.id}" data-review-decision="approve" type="button">通过</button> <button class="seg sell" data-review-id="${item.id}" data-review-decision="reject" type="button">拒绝</button></div>` : `<div class="market-meta">${item.reviewerNote || ""}</div>`}
      </div>
    </article>
  `).join("") : `<article class="order-row"><div><strong>暂无审核队列</strong><div class="market-meta">新提交的充值会出现在这里。</div></div></article>`;
}

function render() {
  renderHero();
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
      reviewerNote: decision === "approve" ? "演示入账通过" : "演示审核拒绝"
    })
  });
  await bootstrap(state.selectedSymbol);
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
    elements.tradeSubmit.textContent = state.tradeSide === "buy" ? "买入" : "卖出";
    elements.tradeSubmit.className = `submit-button ${state.tradeSide}`;
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

bootstrap().catch((error) => window.alert(error.message));
