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
const imageInput = document.querySelector("#imageInput");
const ocrButton = document.querySelector("#ocrButton");
const ocrStatus = document.querySelector("#ocrStatus");

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

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

async function extractImageText() {
  const file = imageInput.files?.[0];
  if (!file) {
    window.alert("请先选择一张图片。");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    window.alert("图片太大了，请先压缩到 5MB 以内。");
    return;
  }

  ocrButton.disabled = true;
  ocrStatus.textContent = "正在识别图片文字，请稍等...";

  try {
    const imageDataUrl = await readImageAsDataUrl(file);
    const result = await api("/api/shenlun/ocr", {
      method: "POST",
      body: JSON.stringify({ imageDataUrl })
    });

    if (result.prompt) promptText.value = result.prompt;
    if (result.material) materialText.value = result.material;
    if (result.answer) answerText.value = result.answer;
    updateCount();
    ocrStatus.textContent = result.notes || "识别完成，请检查文字是否准确，再点击生成批改报告。";
  } catch (error) {
    ocrStatus.textContent = "识别失败，请检查 API key 或换一张更清晰的图片。";
    window.alert(error.message === "OCR_REQUIRES_OPENAI_API_KEY" ? "图片识别需要先配置 OpenAI API Key。" : error.message);
  } finally {
    ocrButton.disabled = false;
  }
}

form.addEventListener("submit", submitShenlun);
answerText.addEventListener("input", updateCount);
ocrButton.addEventListener("click", extractImageText);

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
