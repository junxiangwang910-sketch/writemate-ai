const state = {
  userId: window.localStorage.getItem("power-demo-user-id") || "",
  payload: null
};

const elements = {
  walletBalance: document.querySelector("#walletBalance"),
  priceStatus: document.querySelector("#priceStatus"),
  statsGrid: document.querySelector("#statsGrid"),
  walletAddress: document.querySelector("#walletAddress"),
  redeemedKwh: document.querySelector("#redeemedKwh"),
  tokenPrice: document.querySelector("#tokenPrice"),
  gridRegion: document.querySelector("#gridRegion"),
  priceGrid: document.querySelector("#priceGrid"),
  ledgerList: document.querySelector("#ledgerList"),
  powerForm: document.querySelector("#powerForm"),
  actionInput: document.querySelector("#actionInput"),
  amountInput: document.querySelector("#amountInput"),
  addressField: document.querySelector("#addressField"),
  addressInput: document.querySelector("#addressInput"),
  submitButton: document.querySelector("#submitButton")
};

function num(value, digits = 2) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
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

async function bootstrap() {
  const query = new URLSearchParams();
  if (state.userId) query.set("userId", state.userId);
  const payload = await api(`/api/power/bootstrap?${query.toString()}`);
  state.userId = payload.user.id;
  window.localStorage.setItem("power-demo-user-id", state.userId);
  state.payload = payload;
  render();
}

function render() {
  const { market, wallet, metrics, ledger } = state.payload;
  elements.walletBalance.textContent = `${num(wallet.balance, 2)} PWR`;
  elements.priceStatus.textContent = `${market.changePct24h >= 0 ? "+" : ""}${num(market.changePct24h, 2)}% / 24h`;
  elements.walletAddress.textContent = wallet.address;
  elements.redeemedKwh.textContent = `${num(wallet.redeemedKwh, 2)} kWh`;
  elements.tokenPrice.textContent = `${num(market.tokenCny, 4)} CNY · ${num(market.tokenUsdt, 4)} USDT`;
  elements.gridRegion.textContent = market.region;

  elements.statsGrid.innerHTML = [
    ["结算电量能力", `${num(metrics.settlementCapacityKwh, 2)} kWh`],
    ["结算价值", `${num(metrics.settlementValueCny, 2)} CNY`],
    ["绿电占比", `${num(metrics.greenRatio, 2)}%`],
    ["减碳估算", `${num(metrics.carbonSavedKg, 2)} kg`]
  ].map(([label, value]) => `
    <article class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");

  elements.priceGrid.innerHTML = [
    ["锚定规则", market.peg],
    ["实时电价", `${num(market.spotCnyPerKwh, 4)} CNY/kWh`],
    ["期货结算参考", `${num(market.futuresCnyPerKwh, 4)} CNY/kWh`],
    ["电力币定价", `${num(market.tokenCny, 4)} CNY/PWR`]
  ].map(([label, value]) => `
    <article class="price-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");

  elements.ledgerList.innerHTML = ledger.length ? ledger.map((item) => `
    <article class="ledger-row">
      <div>
        <strong>${actionLabel(item.action)} · ${num(item.tokenAmount, 2)} PWR</strong>
        <div class="ledger-meta">${item.note}</div>
        <div class="ledger-meta">${item.createdAt} · ${item.txHash}</div>
      </div>
      <div>
        <strong class="positive">${num(item.unitPrice, 4)} CNY</strong>
        <div class="ledger-meta">${item.gridRegion} · ${item.status}</div>
      </div>
    </article>
  `).join("") : `<article class="ledger-row"><div><strong>暂无流水</strong><div class="ledger-meta">你可以先铸造一笔电力币看看流程。</div></div></article>`;
}

function actionLabel(action) {
  if (action === "mint") return "铸造";
  if (action === "redeem") return "赎回";
  return "转账";
}

function syncFormState() {
  const isTransfer = elements.actionInput.value === "transfer";
  elements.addressField.style.display = isTransfer ? "grid" : "none";
  elements.submitButton.textContent = actionLabel(elements.actionInput.value);
}

async function handleSubmit(event) {
  event.preventDefault();
  const payload = await api("/api/power/action", {
    method: "POST",
    body: JSON.stringify({
      userId: state.userId,
      action: elements.actionInput.value,
      tokenAmount: Number(elements.amountInput.value || 0),
      toAddress: elements.addressInput.value.trim()
    })
  });
  state.payload = { ...payload, user: state.payload.user };
  render();
}

elements.actionInput.addEventListener("change", syncFormState);
elements.powerForm.addEventListener("submit", (event) => {
  handleSubmit(event).catch((error) => window.alert(error.message));
});

syncFormState();
bootstrap().catch((error) => window.alert(error.message));
