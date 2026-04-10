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
const referenceOutline = document.querySelector("#referenceOutline");
const answerText = document.querySelector("#answerText");
const questionType = document.querySelector("#questionType");
const maxScore = document.querySelector("#maxScore");
const referenceOutlineField = document.querySelector("#referenceOutlineField");
const essayReferenceCard = document.querySelector("#essayReferenceCard");
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
const ocrStatus = document.querySelector("#ocrStatus");
const promptFileInput = document.querySelector("#promptFileInput");
const materialFileInput = document.querySelector("#materialFileInput");
const answerFileInput = document.querySelector("#answerFileInput");
const promptDropzone = document.querySelector("#promptDropzone");
const materialDropzone = document.querySelector("#materialDropzone");
const answerDropzone = document.querySelector("#answerDropzone");
const promptFileStatus = document.querySelector("#promptFileStatus");
const materialFileStatus = document.querySelector("#materialFileStatus");
const answerFileStatus = document.querySelector("#answerFileStatus");
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
const providerBadge = document.querySelector("#providerBadge");

let pdfjsLoader;
let mammothLoader;

const sampleShenlun = {
  questionType: "summary",
  maxScore: "20",
  prompt: "根据给定资料，概括 M 市在推进数字化基层治理过程中的主要做法。要求：全面、准确、有条理，不超过 250 字。",
  material: "材料 3：M 市部分社区曾面临治理信息分散、群众诉求响应慢、基层重复填报、部门协同不足等问题。为提升治理效能，M 市建立统一数据共享平台，将民政、社保、城管、社区网格等数据接入同一系统，减少基层重复录入。各社区设置线上群众反馈入口，居民可以通过小程序提交诉求，由平台自动分派至相关部门。针对跨部门事项，街道建立联席会商机制，明确牵头单位和办理时限，并将办理结果纳入绩效考核。部分社区还组织网格员定期回访群众，收集服务评价，推动治理流程持续优化。",
  answer: "M 市主要做法包括：一是搭建统一数据共享平台，整合民政、社保、城管和网格等信息，减少重复填报；二是开通线上群众反馈入口，对居民诉求进行平台分派；三是建立跨部门联席会商机制，明确牵头单位、办理时限和考核要求；四是组织网格员回访群众，收集评价并优化治理流程。"
};

const sampleEssayReference = {
  prompt: "“给定材料1~4”反映了当前基层治理中普遍存在的几类矛盾与张力。请你深入思考，联系实际，自选角度，自拟题目，写一篇文章。（40分）要求：观点明确，见解深刻，内容充实；参考给定材料，但不拘泥于材料；逻辑清晰，语言流畅；字数1000~1200字。",
  referenceOutline: "标题方向：在治理张力中寻找动态平衡。\n总论点：现代基层治理不是消灭矛盾，而是在效率与温度、统一与差异、技术理性与人文关怀之间找到可运转的平衡。\n分论点一：以协商沟通和利益平衡回应基层具体冲突。\n分论点二：以因地制宜和制度弹性克服“一刀切”执行偏差。\n分论点三：以技术赋能基层治理，但不能让技术替代人的尊严、情感与面对面协商。\n结尾方向：治理没有完美公式，关键在于基层干部持续调整、耐心沟通和把制度落到人的真实需求上。",
  answer: "在推进基层治理现代化的过程中，最难的从来不是提出口号，而是把政策、技术和群众感受真正放到同一张桌子上统筹考虑。现实中的基层治理常常同时面对利益分化、资源约束、情绪碰撞和治理目标多元等复杂情况，如果只追求整齐划一的制度输出，往往会出现“上面很好、下面很怨”的落差。因此，现代基层治理的关键，不在于简单消除矛盾，而在于在张力中寻找平衡，在差异中实现有效治理。\n\n基层治理首先要在利益冲突与情感需求之间建立协商机制。无论是老旧小区加装电梯，还是邻里纠纷、社区公共事务，表面上看往往是成本分担、权责划分的问题，实质上却常常包含情绪、尊严和长期积累的关系摩擦。如果只强调制度条款、只讲谁得益谁受损，往往很难真正达成共识。基层治理要真正落地，必须给协商留出空间，通过逐户沟通、利益平衡、情感安抚和补偿设计，让群众在“被看见、被理解”的基础上形成接受度。治理要有效，不是靠压服分歧，而是靠把分歧导入可协商、可调整的轨道。\n\n基层治理还要在统一规范与因地制宜之间保持制度弹性。政策统一有助于标准明确、责任压实、考核推进，但基层情况千差万别，资源条件、人口结构、文化习惯和现实需求并不相同。如果简单照搬统一模板，就容易导致形式上完成任务、实际中难以落地。缺水地区建水冲公厕、老人村强推复杂垃圾分类，都是典型例子。真正高质量的治理，不是拒绝制度，而是在坚持目标一致的前提下，给基层留出一定的因地调整空间，让政策设计更贴近群众理解方式和真实生活逻辑。只有目标统一、路径灵活，治理才既能执行，也能见效。\n\n基层治理更要在技术效率与人文关怀之间守住人的位置。数字平台、智能监测和数据预警确实可以提升治理效率，帮助基层发现问题、统筹资源、压缩流程，但治理对象不是冷冰冰的数据，而是有尊严、有情感、有隐私边界的真实个体。如果技术系统只强调采集、分析和预警，却忽视群众被“看见”时的不适感，就可能把治理从服务变成打扰，甚至催生“为数据而活”的荒诞行为。因此，技术赋能必须坚持工具属性，把提升服务、保障安全和方便群众作为出发点，同时保留必要的解释、选择和协商空间，避免技术理性压倒人文关怀。\n\n基层治理没有一套放之四海而皆准的万能公式。越是复杂的治理场景，越需要在规则、效率、差异和情感之间反复校准。对基层干部而言，这种平衡不是一句口号，而是一次次耐心走访、一场场协调沟通、一项项细节调整的累积。只有把制度设计与群众实际、技术能力与人的感受真正结合起来，基层治理现代化才能既有力度，也有温度；既能执行，也能被群众接受。"
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
  const payload = await api(`/api/shenlun/bootstrap${query}`, { method: "GET", headers: {} });
  state.userId = payload.user.id;
  window.localStorage.setItem("writemate-user-id", state.userId);
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

function toggleEssayReferenceMode() {
  const isEssay = questionType.value === "essay";
  referenceOutlineField.classList.toggle("hidden", !isEssay);
  essayReferenceCard.classList.toggle("hidden", !isEssay);
  if (isEssay) {
    materialText.placeholder = "如果你没有完整材料，只做大作文对照批改，这里可以留空。若希望系统同时参考材料摘要，也可以补充几句。";
  } else {
    materialText.placeholder = "";
  }
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
  if (questionType.value === "essay") {
    maxScore.value = "40";
    promptText.value = sampleEssayReference.prompt;
    materialText.value = "";
    referenceOutline.value = sampleEssayReference.referenceOutline;
    answerText.value = sampleEssayReference.answer;
  } else {
    questionType.value = sampleShenlun.questionType;
    maxScore.value = sampleShenlun.maxScore;
    promptText.value = sampleShenlun.prompt;
    materialText.value = sampleShenlun.material;
    answerText.value = sampleShenlun.answer;
    referenceOutline.value = "";
  }
  toggleEssayReferenceMode();
  updateCount();
}

function updateActivationStatus(user) {
  if (!user) return;
  const planLabel = user.plan === "team" ? "高级版" : user.plan === "pro" ? "内测版" : "免费版";
  const quotaLabel = user.plan === "team" ? "300 次" : user.plan === "pro" ? "50 次" : "3 次";
  activationStatus.textContent = `当前账号：${planLabel}，可用额度约 ${quotaLabel}。`;
}

function updateProviderBadge(provider) {
  if (!providerBadge) return;
  const labels = {
    deepseek: "当前引擎：DeepSeek + 名师蒸馏",
    openai: "当前引擎：OpenAI + 名师蒸馏",
    demo: "当前引擎：演示模式"
  };
  providerBadge.textContent = labels[provider] || "当前引擎：申论宝批改";
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

  const isEssay = questionType.value === "essay";
  const hasReferenceOutline = referenceOutline.value.trim().length > 0;
  const hasMaterial = materialText.value.trim().length > 0;

  if (!promptText.value.trim() || !answerText.value.trim()) {
    window.alert("请先填写题目要求和考生作答。");
    return;
  }

  if (!isEssay && !hasMaterial) {
    window.alert("请先填写材料或给定资料。");
    return;
  }

  if (isEssay && !hasMaterial && !hasReferenceOutline) {
    window.alert("大作文至少需要填写材料摘要或参考分论点，二选一即可。");
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
        referenceOutline: referenceOutline.value.trim(),
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

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`LOAD_SCRIPT_FAILED:${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.src = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`LOAD_SCRIPT_FAILED:${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

async function getPdfJs() {
  if (!pdfjsLoader) {
    pdfjsLoader = loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js")
      .catch(() => loadScript("https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js"))
      .then(() => window.pdfjsLib || window["pdfjs-dist/build/pdf"]);
  }
  const pdfjs = await pdfjsLoader;
  if (!pdfjs) throw new Error("PDF_PARSER_UNAVAILABLE");
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  return pdfjs;
}

async function getMammoth() {
  if (!mammothLoader) {
    mammothLoader = loadScript("https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js")
      .then(() => window.mammoth);
  }
  const mammoth = await mammothLoader;
  if (!mammoth) throw new Error("DOCX_PARSER_UNAVAILABLE");
  return mammoth;
}

async function extractTextFromPdf(file) {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const documentTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await documentTask.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = (content.items || [])
      .map((item) => item.str || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) pages.push(pageText);
  }
  return pages.join("\n\n").trim();
}

async function extractTextFromDocx(file) {
  if (/\.doc$/i.test(file.name)) {
    throw new Error("DOC_LEGACY_NOT_SUPPORTED");
  }
  const mammoth = await getMammoth();
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return String(result.value || "").trim();
}

async function extractTextFromImage(file) {
  const imageDataUrl = await readImageAsDataUrl(file);
  const result = await api("/api/shenlun/ocr", {
    method: "POST",
    body: JSON.stringify({ imageDataUrl })
  });
  return {
    text: [result.prompt, result.material, result.answer].filter(Boolean).join("\n\n").trim(),
    notes: result.notes || "图片识别完成，请检查文字是否准确。"
  };
}

function getTargetRefs(target) {
  return {
    prompt: { input: promptText, status: promptFileStatus, label: "题目要求" },
    material: { input: materialText, status: materialFileStatus, label: "给定资料" },
    answer: { input: answerText, status: answerFileStatus, label: "考生作答" }
  }[target];
}

async function extractTextFromFile(file) {
  const name = file.name || "";
  const lower = name.toLowerCase();
  const type = file.type || "";

  if (type.startsWith("image/")) {
    return extractTextFromImage(file);
  }
  if (type === "text/plain" || lower.endsWith(".txt")) {
    return { text: (await file.text()).trim(), notes: "TXT 文字已导入。" };
  }
  if (type === "application/pdf" || lower.endsWith(".pdf")) {
    return { text: await extractTextFromPdf(file), notes: "PDF 文字已提取完成。" };
  }
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    || lower.endsWith(".docx")
    || lower.endsWith(".doc")
  ) {
    return { text: await extractTextFromDocx(file), notes: "Word 文档文字已提取完成。" };
  }
  throw new Error("UNSUPPORTED_UPLOAD_FORMAT");
}

async function importFileToField(target, file) {
  const refs = getTargetRefs(target);
  if (!refs || !file) return;
  const { input, status, label } = refs;

  if (file.size > 20 * 1024 * 1024) {
    window.alert(`${label}文件太大了，建议先压缩到 20MB 以内。`);
    return;
  }

  status.textContent = `正在导入${label}...`;
  ocrStatus.textContent = `正在处理 ${file.name}，请稍等...`;

  try {
    const result = await extractTextFromFile(file);
    if (!result.text) {
      throw new Error("EMPTY_EXTRACTED_TEXT");
    }
    input.value = result.text;
    if (target === "answer") updateCount();
    status.textContent = `${file.name} 已导入，共 ${countChars(result.text)} 字。`;
    ocrStatus.textContent = result.notes || `${label}已导入，请检查后再提交批改。`;
  } catch (error) {
    const messages = {
      DOC_LEGACY_NOT_SUPPORTED: "老版 .doc 暂不稳定，建议另存为 .docx 或 PDF 后再上传。",
      EMPTY_EXTRACTED_TEXT: `${label}没有提取到可用文字，请换一份更清晰的文件。`,
      PDF_PARSER_UNAVAILABLE: "PDF 解析组件加载失败，请刷新页面后重试。",
      DOCX_PARSER_UNAVAILABLE: "Word 解析组件加载失败，请刷新页面后重试。",
      UNSUPPORTED_UPLOAD_FORMAT: "暂只支持图片、PDF、DOCX、TXT 文件。"
    };
    status.textContent = `${label}导入失败，请重新上传。`;
    ocrStatus.textContent = `${label}导入失败。`;
    window.alert(messages[error.message] || error.message);
  }
}

function bindUploadField({ input, dropzone, target }) {
  if (!input || !dropzone) return;

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    await importFileToField(target, file);
    input.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "dragend", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone.addEventListener("drop", async (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await importFileToField(target, file);
  });
}

form.addEventListener("submit", submitShenlun);
submitButton.addEventListener("click", submitShenlun);
["input", "change", "keyup", "paste"].forEach((eventName) => {
  answerText.addEventListener(eventName, () => window.setTimeout(updateCount, 0));
});
sampleButton.addEventListener("click", fillSample);
activateButton.addEventListener("click", redeemCode);
questionType.addEventListener("change", toggleEssayReferenceMode);
interviewForm.addEventListener("submit", submitInterview);
interviewButton.addEventListener("click", submitInterview);
followupButton.addEventListener("click", generateFollowup);
interviewVideoInput.addEventListener("change", handleInterviewVideoUpload);
modeCards.forEach((card) => {
  card.addEventListener("click", () => setInterviewMode(card.dataset.mode));
});

bindUploadField({ input: promptFileInput, dropzone: promptDropzone, target: "prompt" });
bindUploadField({ input: materialFileInput, dropzone: materialDropzone, target: "material" });
bindUploadField({ input: answerFileInput, dropzone: answerDropzone, target: "answer" });

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
toggleEssayReferenceMode();
bootstrapUser().then((payload) => {
  updateActivationStatus(payload.user);
  state.history = payload.history || [];
  renderLearningProfile(payload.profile);
  updateProviderBadge(payload.provider);
}).catch((error) => {
  console.error(error);
});
