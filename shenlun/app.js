const typeLabels = {
  summary: "归纳概括",
  solution: "提出对策",
  analysis: "综合分析",
  official: "贯彻执行",
  essay: "申论大作文",
  interview: "公务员面试"
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
  history: [],
  isSubmitting: false,
  isInterviewSubmitting: false
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
const submitButton = document.querySelector("#submitButton");
const sampleButton = document.querySelector("#sampleButton");
const activationCode = document.querySelector("#activationCode");
const activateButton = document.querySelector("#activateButton");
const activationStatus = document.querySelector("#activationStatus");
const interviewForm = document.querySelector("#interviewForm");
const interviewQuestion = document.querySelector("#interviewQuestion");
const interviewAnswer = document.querySelector("#interviewAnswer");
const voiceSignal = document.querySelector("#voiceSignal");
const videoSignal = document.querySelector("#videoSignal");
const fluencySignal = document.querySelector("#fluencySignal");
const interviewButton = document.querySelector("#interviewButton");
const interviewEmptyState = document.querySelector("#interviewEmptyState");
const interviewReportContent = document.querySelector("#interviewReportContent");
const interviewReportTitle = document.querySelector("#interviewReportTitle");
const interviewOverallScore = document.querySelector("#interviewOverallScore");
const interviewDimensionGrid = document.querySelector("#interviewDimensionGrid");
const interviewStrengthList = document.querySelector("#interviewStrengthList");
const interviewWeaknessList = document.querySelector("#interviewWeaknessList");
const interviewMissingTags = document.querySelector("#interviewMissingTags");
const interviewRewriteText = document.querySelector("#interviewRewriteText");
const profileTotalReports = document.querySelector("#profileTotalReports");
const profileAverageScore = document.querySelector("#profileAverageScore");
const profileTrend = document.querySelector("#profileTrend");
const profileFocusTags = document.querySelector("#profileFocusTags");
const profileNextActions = document.querySelector("#profileNextActions");
const modeCards = Array.from(document.querySelectorAll(".mode-card"));
const videoModePanel = document.querySelector("#videoModePanel");
const qaModePanel = document.querySelector("#qaModePanel");
const interviewVideoInput = document.querySelector("#interviewVideoInput");
const interviewVideoPreview = document.querySelector("#interviewVideoPreview");
const interviewVideoStatus = document.querySelector("#interviewVideoStatus");
const followupButton = document.querySelector("#followupButton");
const followupCard = document.querySelector("#followupCard");
const followupQuestion = document.querySelector("#followupQuestion");
const followupFocus = document.querySelector("#followupFocus");
const followupAnswer = document.querySelector("#followupAnswer");

const sampleShenlun = {
  questionType: "summary",
  maxScore: "20",
  prompt: "根据给定资料，概括 M 市在推进数字化基层治理过程中的主要做法。要求：全面、准确、有条理，不超过 250 字。",
  material: "材料 3：M 市部分社区曾面临治理信息分散、群众诉求响应慢、基层重复填报、部门协同不足等问题。为提升治理效能，M 市建立统一数据共享平台，将民政、社保、城管、社区网格等数据接入同一系统，减少基层重复录入。各社区设置线上群众反馈入口，居民可以通过小程序提交诉求，由平台自动分派至相关部门。针对跨部门事项，街道建立联席会商机制，明确牵头单位和办理时限，并将办理结果纳入绩效考核。部分社区还组织网格员定期回访群众，收集服务评价，推动治理流程持续优化。",
  answer: "M 市主要做法包括：一是搭建统一数据共享平台，整合民政、社保、城管和网格等信息，减少重复填报；二是开通线上群众反馈入口，对居民诉求进行平台分派；三是建立跨部门联席会商机制，明确牵头单位、办理时限和考核要求；四是组织网格员回访群众，收集评价并优化治理流程。"
};

let interviewMode = "video";
let interviewVideoNote = "";
let currentFollowup = null;

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
  return payload;
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
      <p>正在分析该维度。</p>
    </article>
  `).join("");
  strengthList.innerHTML = "<li>正在提炼优点。</li>";
  weaknessList.innerHTML = "<li>正在分析问题。</li>";
  missingTags.innerHTML = "<span>分析中</span>";
  rewriteText.textContent = "正在生成参考优化建议。";
}

function renderInterviewReport(report) {
  interviewEmptyState.classList.add("hidden");
  interviewReportContent.classList.remove("hidden");
  interviewReportTitle.textContent = `${report.questionLabel || "公务员面试"}测评报告`;
  interviewOverallScore.textContent = String(report.percentScore || report.scaledScore || 0);

  interviewDimensionGrid.innerHTML = (report.dimensions || []).map((dimension) => `
    <article class="dimension-card">
      <h4>${dimension.label}</h4>
      <strong>${dimension.score}</strong>
      <p>${dimension.comment}</p>
    </article>
  `).join("");

  interviewStrengthList.innerHTML = (report.strengths || []).map((item) => `<li>${item}</li>`).join("");
  interviewWeaknessList.innerHTML = (report.weaknesses || []).map((item) => `<li>${item}</li>`).join("");
  interviewMissingTags.innerHTML = (report.missing || []).map((item) => `<span>${item}</span>`).join("");
  interviewRewriteText.textContent = report.rewrite || "";
}

function renderInterviewLoading() {
  interviewEmptyState.classList.add("hidden");
  interviewReportContent.classList.remove("hidden");
  interviewReportTitle.textContent = "正在测评";
  interviewOverallScore.textContent = "...";
  interviewDimensionGrid.innerHTML = ["内容契合", "表达流畅", "语言自然", "声音状态", "表情仪态", "临场感"].map((label) => `
    <article class="dimension-card">
      <h4>${label}</h4>
      <strong>...</strong>
      <p>正在分析该维度。</p>
    </article>
  `).join("");
  interviewStrengthList.innerHTML = "<li>正在提炼优势。</li>";
  interviewWeaknessList.innerHTML = "<li>正在判断主要扣分点。</li>";
  interviewMissingTags.innerHTML = "<span>分析中</span>";
  interviewRewriteText.textContent = "正在生成下一次训练建议。";
}

function updateCount() {
  charCount.textContent = String(countChars(answerText.value));
}

function renderLearningProfile(profile) {
  if (!profile) return;
  profileTotalReports.textContent = String(profile.totalReports || 0);
  profileAverageScore.textContent = String(profile.averagePercent || 0);
  profileTrend.textContent = profile.recentTrend || "完成第一次训练后，这里会开始记录你的长期变化。";
  profileFocusTags.innerHTML = (profile.focusTags || []).map((item) => `<span>${item}</span>`).join("");
  profileNextActions.innerHTML = (profile.nextActions || []).map((item) => `<li>${item}</li>`).join("");
}

function setInterviewMode(mode) {
  interviewMode = mode;
  modeCards.forEach((card) => card.classList.toggle("active", card.dataset.mode === mode));
  videoModePanel.classList.toggle("hidden", mode !== "video");
  qaModePanel.classList.toggle("hidden", mode !== "qa");
  if (mode === "video") {
    interviewButton.textContent = "生成视频测评";
  } else {
    interviewButton.textContent = "生成一问一答总评";
  }
}

function getCombinedInterviewAnswer() {
  if (interviewMode !== "qa" || !currentFollowup || !followupAnswer.value.trim()) {
    return interviewAnswer.value.trim();
  }
  return [
    "第一轮回答：",
    interviewAnswer.value.trim(),
    "",
    `追问：${currentFollowup.followup}`,
    "追问回答：",
    followupAnswer.value.trim()
  ].join("\n");
}

function getInterviewContext() {
  const modeLabel = interviewMode === "qa" ? "智能一问一答模拟面试" : "上传视频测评";
  return [
    modeLabel,
    interviewVideoNote,
    currentFollowup ? `追问重点：${currentFollowup.focus}` : ""
  ].filter(Boolean).join("\n");
}

function fillSample() {
  questionType.value = sampleShenlun.questionType;
  maxScore.value = sampleShenlun.maxScore;
  promptText.value = sampleShenlun.prompt;
  materialText.value = sampleShenlun.material;
  answerText.value = sampleShenlun.answer;
  updateCount();
}

function updateActivationStatus(user) {
  if (!user) return;
  const planLabel = user.plan === "team" ? "高级版" : user.plan === "pro" ? "内测版" : "免费版";
  const quotaLabel = user.plan === "team" ? "300 次" : user.plan === "pro" ? "50 次" : "3 次";
  activationStatus.textContent = `当前账号：${planLabel}，可用额度约 ${quotaLabel}。`;
}

async function redeemCode() {
  const code = activationCode.value.trim();
  if (!code) {
    window.alert("请先输入激活码。");
    return;
  }

  activateButton.disabled = true;
  activateButton.textContent = "正在兑换...";
  try {
    const payload = await api("/api/activate", {
      method: "POST",
      body: JSON.stringify({
        userId: state.userId,
        code
      })
    });
    state.userId = payload.user.id;
    window.localStorage.setItem("writemate-user-id", state.userId);
    updateActivationStatus(payload.user);
    activationCode.value = "";
    window.alert("激活成功，已解锁内测额度。");
  } catch (error) {
    const messages = {
      ACTIVATION_CODE_REQUIRED: "请先输入激活码。",
      ACTIVATION_CODE_INVALID: "激活码无效，请检查后再试。",
      ACTIVATION_CODE_USED: "这个激活码已经被使用过。"
    };
    window.alert(messages[error.message] || error.message);
  } finally {
    activateButton.disabled = false;
    activateButton.textContent = "兑换激活码";
  }
}

async function submitShenlun(event) {
  event?.preventDefault();
  if (state.isSubmitting) return;

  if (!promptText.value.trim() || !materialText.value.trim() || !answerText.value.trim()) {
    window.alert("请先填写题目、材料和考生作答。");
    return;
  }

  state.isSubmitting = true;
  submitButton.disabled = true;
  submitButton.textContent = "正在批改...";
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
    renderLearningProfile(payload.profile);
    renderReport(payload.report);
  } catch (error) {
    window.alert(error.message);
    reportContent.classList.add("hidden");
    emptyState.classList.remove("hidden");
  } finally {
    state.isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = "生成批改报告";
  }
}

async function submitInterview(event) {
  event?.preventDefault();
  if (state.isInterviewSubmitting) return;

  const combinedAnswer = getCombinedInterviewAnswer();
  if (!interviewQuestion.value.trim() || !combinedAnswer) {
    window.alert("请先填写面试题目和作答文字。");
    return;
  }

  state.isInterviewSubmitting = true;
  interviewButton.disabled = true;
  interviewButton.textContent = "正在测评...";
  renderInterviewLoading();
  try {
    const payload = await api("/api/shenlun/interview", {
      method: "POST",
      body: JSON.stringify({
        userId: state.userId,
        question: interviewQuestion.value.trim(),
        answer: combinedAnswer,
        voiceSignal: voiceSignal.value,
        videoSignal: videoSignal.value,
        fluencySignal: fluencySignal.value,
        context: getInterviewContext()
      })
    });
    state.history = payload.history || [];
    renderLearningProfile(payload.profile);
    renderInterviewReport(payload.report);
  } catch (error) {
    window.alert(error.message);
    interviewReportContent.classList.add("hidden");
    interviewEmptyState.classList.remove("hidden");
  } finally {
    state.isInterviewSubmitting = false;
    interviewButton.disabled = false;
    interviewButton.textContent = "生成面试测评";
  }
}

async function generateFollowup() {
  if (!interviewQuestion.value.trim() || !interviewAnswer.value.trim()) {
    window.alert("请先填写面试题目和第一轮作答。");
    return;
  }

  followupButton.disabled = true;
  followupButton.textContent = "正在生成追问...";
  try {
    const payload = await api("/api/shenlun/interview/followup", {
      method: "POST",
      body: JSON.stringify({
        question: interviewQuestion.value.trim(),
        answer: interviewAnswer.value.trim()
      })
    });
    currentFollowup = {
      followup: payload.followup,
      focus: payload.focus
    };
    followupQuestion.textContent = payload.followup;
    followupFocus.textContent = payload.focus ? `考察重点：${payload.focus}` : "";
    followupCard.classList.remove("hidden");
    followupAnswer.focus();
  } catch (error) {
    window.alert(error.message);
  } finally {
    followupButton.disabled = false;
    followupButton.textContent = "重新生成追问";
  }
}

function handleInterviewVideoUpload() {
  const file = interviewVideoInput.files?.[0];
  if (!file) return;
  if (file.size > 150 * 1024 * 1024) {
    window.alert("视频文件太大了，建议先压缩到 150MB 以内。");
    interviewVideoInput.value = "";
    return;
  }
  const url = URL.createObjectURL(file);
  interviewVideoPreview.src = url;
  interviewVideoPreview.classList.remove("hidden");
  interviewVideoNote = `已上传视频：${file.name}，大小约 ${Math.round(file.size / 1024 / 1024)}MB。`;
  interviewVideoStatus.textContent = "视频已载入。请检查作答文字和表现项，再生成视频测评。";
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
    window.alert(error.message === "OCR_REQUIRES_OPENAI_API_KEY" ? "图片识别暂不可用，请稍后再试。" : error.message);
  } finally {
    ocrButton.disabled = false;
  }
}

form.addEventListener("submit", submitShenlun);
submitButton.addEventListener("click", submitShenlun);
["input", "change", "keyup", "paste"].forEach((eventName) => {
  answerText.addEventListener(eventName, () => window.setTimeout(updateCount, 0));
});
ocrButton.addEventListener("click", extractImageText);
sampleButton.addEventListener("click", fillSample);
activateButton.addEventListener("click", redeemCode);
interviewForm.addEventListener("submit", submitInterview);
interviewButton.addEventListener("click", submitInterview);
followupButton.addEventListener("click", generateFollowup);
interviewVideoInput.addEventListener("change", handleInterviewVideoUpload);
modeCards.forEach((card) => {
  card.addEventListener("click", () => setInterviewMode(card.dataset.mode));
});

document.querySelectorAll("[data-target]").forEach((node) => {
  node.addEventListener("click", (event) => {
    const target = document.querySelector(node.dataset.target);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

updateCount();
bootstrapUser().then((payload) => {
  updateActivationStatus(payload.user);
  renderLearningProfile(payload.shenlunProfile);
}).catch((error) => {
  console.error(error);
});
