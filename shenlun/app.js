const typeLabels = {
  summary: "归纳概括",
  solution: "提出对策",
  analysis: "综合分析",
  official: "贯彻执行",
  essay: "申论大作文"
};

const dimensions = [
  { key: "relevance", label: "审题准确" },
  { key: "coverage", label: "要点覆盖" },
  { key: "logic", label: "逻辑结构" },
  { key: "material", label: "材料提炼" },
  { key: "language", label: "语言规范" },
  { key: "format", label: "格式要求" }
];

const state = {
  userId: window.localStorage.getItem("writemate-user-id") || "",
  history: []
};

const promptText = document.querySelector("#promptText");
const materialText = document.querySelector("#materialText");
const answerText = document.querySelector("#answerText");
const questionType = document.querySelector("#questionType");
const maxScore = document.querySelector("#maxScore");
const charCount = document.querySelector("#charCount");
const form = document.querySelector("#shenlunForm");
const emptyState = document.querySelector("#emptyState");
const reportContent = document.querySelector("#reportContent");
const reportTitle = document.querySelector("#reportTitle");
const overallScore = document.querySelector("#overallScore");
const heroScore = document.querySelector("#heroScore");
const dimensionGrid = document.querySelector("#dimensionGrid");
const strengthList = document.querySelector("#strengthList");
const weaknessList = document.querySelector("#weaknessList");
const missingTags = document.querySelector("#missingTags");
const rewriteText = document.querySelector("#rewriteText");

function countChars(text) {
  return text.replace(/\s/g, "").length;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || "请求失败，请稍后重试");
  }
  return payload;
}

async function bootstrapUser() {
  const query = state.userId ? `?userId=${encodeURIComponent(state.userId)}` : "";
  const payload = await api(`/api/bootstrap${query}`, { method: "GET", headers: {} });
  state.userId = payload.user.id;
  window.localStorage.setItem("writemate-user-id", state.userId);
  await loadHistory();
}

async function loadHistory() {
  const payload = await api(`/api/shenlun/history?userId=${encodeURIComponent(state.userId)}`, {
    method: "GET",
    headers: {}
  });
  state.history = payload.history || [];
}

function renderReport(report) {
  emptyState.classList.add("hidden");
  reportContent.classList.remove("hidden");
  reportTitle.textContent = `${report.questionLabel || typeLabels[report.type] || "申论"}批改报告`;
  overallScore.textContent = `${report.scaledScore}/${report.targetMax}`;
  heroScore.textContent = String(report.percentScore);

  dimensionGrid.innerHTML = (report.dimensions || []).map((dimension) => `
    <article class="dimension-card">
      <h4>${dimension.label}</h4>
      <strong>${dimension.score}</strong>
      <p>${dimension.comment}</p>
    </article>
  `).join("");

  strengthList.innerHTML = (report.strengths || []).map((item) => `<li>${item}</li>`).join("");
  weaknessList.innerHTML = (report.weaknesses || []).map((item) => `<li>${item}</li>`).join("");
  missingTags.innerHTML = (report.missing || []).map((item) => `<span>${item}</span>`).join("");
  rewriteText.textContent = report.rewrite || "";
}

function renderLoading() {
  emptyState.classList.add("hidden");
  reportContent.classList.remove("hidden");
  reportTitle.textContent = "正在批改";
  overallScore.textContent = "...";
  dimensionGrid.innerHTML = dimensions.map((dimension) => `
    <article class="dimension-card">
      <h4>${dimension.label}</h4>
      <strong>...</strong>
      <p>AI 正在分析该维度。</p>
    </article>
  `).join("");
  strengthList.innerHTML = "<li>正在提炼优点。</li>";
  weaknessList.innerHTML = "<li>正在分析问题。</li>";
  missingTags.innerHTML = "<span>分析中</span>";
  rewriteText.textContent = "正在生成参考优化建议。";
}

function updateCount() {
  charCount.textContent = String(countChars(answerText.value));
}

async function submitShenlun(event) {
  event.preventDefault();
  if (!promptText.value.trim() || !materialText.value.trim() || !answerText.value.trim()) {
    window.alert("请先填写题目、材料和考生作答。");
    return;
  }

  renderLoading();
  try {
    const payload = await api("/api/shenlun/grade", {
      method: "POST",
      body: JSON.stringify({
        userId: state.userId,
        questionType: questionType.value,
        maxScore: Number(maxScore.value),
        prompt: promptText.value.trim(),
        material: materialText.value.trim(),
        answer: answerText.value.trim()
      })
    });
    state.history = payload.history || [];
    renderReport(payload.report);
  } catch (error) {
    window.alert(error.message);
    reportContent.classList.add("hidden");
    emptyState.classList.remove("hidden");
  }
}

form.addEventListener("submit", submitShenlun);
answerText.addEventListener("input", updateCount);

document.querySelectorAll("[data-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(button.dataset.target);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

updateCount();
bootstrapUser().catch((error) => {
  console.error(error);
});
