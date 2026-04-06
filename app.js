const state = {
  lang: "zh",
  plans: {},
  user: null,
  history: [],
  draft: null,
  admin: null,
  currentUserId: window.localStorage.getItem("writemate-user-id") || "",
  currentProvider: "demo"
};

const copy = {
  zh: {
    brandTag: "雅思写作智能批改 SaaS",
    navWorkspace: "工作台",
    navPricing: "套餐",
    navAdmin: "运营视图",
    navFaq: "FAQ",
    guestName: "游客模式",
    loginButton: "登录 / 注册",
    eyebrow: "Built for monetizable IELTS writing products",
    heroTitle: "从批改网页，升级成可以卖的雅思写作服务",
    heroText: "这次不是只有前端演示，而是接了真实后端接口、服务端历史记录和可配置的 AI 批改能力。你现在拿到的是一个可继续上线的 MVP 基础版。",
    heroActionPrimary: "进入工作台",
    heroActionSecondary: "查看定价",
    metricOne: "累计用户",
    metricTwo: "累计批改篇数",
    metricThree: "平均预估分",
    previewLabel: "服务状态",
    previewLive: "Backend Live",
    overallBand: "本次预估",
    criterionTR: "任务回应",
    criterionCC: "连贯衔接",
    criterionLR: "词汇资源",
    criterionGRA: "语法准确",
    previewInsightTitle: "现在这版已经具备",
    previewInsightOne: "前后端打通，浏览器不再直接保存主数据",
    previewInsightTwo: "可配置 OpenAI 批改，支持 demo / real 两种模式",
    previewInsightThree: "用户、历史、草稿、套餐和运营数据全部走服务端接口",
    workspaceEyebrow: "User Workspace",
    workspaceTitle: "用户工作台",
    usageLabel: "剩余批改次数",
    summaryCurrentPlan: "当前套餐",
    freePlanDesc: "每月 3 次批改，适合体验",
    summaryEssays: "我的作文",
    summaryEssaysDesc: "已保存到服务端历史记录",
    summaryBestBand: "最佳成绩",
    summaryBestBandDesc: "按当前账号历史统计",
    summaryMode: "账号状态",
    summaryModeDesc: "登录后持续保存到后端",
    taskTypeLabel: "写作类型",
    taskOneOption: "Task 1",
    taskTwoOption: "Task 2",
    candidateLabel: "考生昵称",
    candidatePlaceholder: "Amy / 李同学",
    promptLabel: "题目 / Prompt",
    essayLabel: "作文内容 / Essay",
    promptPlaceholder: "请输入 IELTS Writing Task 1 或 Task 2 题目",
    essayPlaceholder: "请粘贴考生作文内容，系统会生成分数与反馈",
    wordCountLabel: "当前字数",
    saveDraftButton: "保存草稿",
    analyzeButton: "生成 AI 批改报告",
    resultsPlaceholderTitle: "你的批改报告会显示在这里",
    resultsPlaceholderText: "提交作文后，系统会通过后端生成分数、反馈和历史记录。",
    resultsLabel: "AI 评分结果",
    strengthTitle: "亮点",
    improveTitle: "待提升点",
    rewriteTitle: "升级写法建议",
    coachTitle: "AI 教练总结",
    historyEyebrow: "Essay History",
    historyTitle: "批改历史",
    clearHistoryButton: "清空历史",
    historyEmpty: "还没有历史记录，先提交一篇作文试试看。",
    pricingEyebrow: "Pricing",
    pricingTitle: "套餐设计",
    trustEyebrow: "Why Buyers Trust It",
    trustTitle: "为什么这版更接近可售卖产品",
    trustCardOneTitle: "真实数据流",
    trustCardOneText: "用户、草稿、历史记录和套餐状态都已经有后端存储，不再只是前端假数据演示。",
    trustCardTwoTitle: "可升级 AI 批改",
    trustCardTwoText: "配置 OpenAI API Key 后即可切到真实 AI 批改模式，便于逐步从 MVP 走向正式产品。",
    trustCardThreeTitle: "产品包装完整",
    trustCardThreeText: "补齐 FAQ、隐私政策、用户协议和联系入口，减少像 demo 的感觉，增强商业可信度。",
    adminEyebrow: "Operator View",
    adminTitle: "简易运营后台视图",
    adminUsers: "累计用户",
    adminReports: "累计报告",
    adminConversion: "会员转化",
    adminTopPlan: "最热套餐",
    faqEyebrow: "FAQ",
    faqTitle: "常见问题",
    faqOneTitle: "现在已经是真 AI 批改了吗？",
    faqOneText: "如果服务器配置了 OpenAI API Key，就会走真实 AI 批改；如果没配置，会自动退回 demo 模式，方便本地开发与演示。",
    faqTwoTitle: "适合卖给谁？",
    faqTwoText: "适合个人考生、英语老师、雅思培训机构，以及想快速测试 AI 教育产品市场的创业项目。",
    faqThreeTitle: "还差什么才能正式上线？",
    faqThreeText: "最关键的是正式支付、真正的账号系统、部署到线上服务器，以及更完整的日志监控和客服支持能力。",
    legalEyebrow: "Legal",
    legalTitle: "隐私、协议与联系",
    privacyTitle: "隐私政策摘要",
    privacyText: "用户提交的作文内容仅用于生成批改结果、保存历史记录和改进产品体验。正式上线时应补充完整的合规文本、删除策略和用户数据导出机制。",
    termsTitle: "用户协议摘要",
    termsText: "本产品提供 AI 辅助写作批改，不构成官方雅思评分承诺。用户需要对上传内容和使用方式负责，服务方保留更新功能与套餐的权利。",
    contactTitle: "联系与商务合作",
    contactText: "邮箱：hello@writemate-ai.com 微信/商务：WriteMate-AI 适合用于教师合作、机构采购、白标定制和渠道分销。",
    footerText: "WriteMate AI MVP · IELTS Writing Task 1 / Task 2 · Built for commercial launch iteration",
    authEyebrow: "Access",
    authTitle: "登录或创建体验账号",
    authNameLabel: "用户名",
    authNamePlaceholder: "Amy",
    authEmailLabel: "邮箱",
    authEmailPlaceholder: "amy@example.com",
    authPlanLabel: "默认套餐",
    authSubmit: "进入产品",
    candidateFallback: "匿名考生",
    submitGuard: "请输入作文题目和正文后再进行批改。",
    saveDraftToast: "草稿已保存到服务端。",
    loginToast: "账号已进入产品工作台。",
    clearHistoryToast: "历史记录已清空。",
    providerDemo: "当前为 Demo 批改模式",
    providerOpenAI: "当前为 OpenAI 实时批改模式",
    loading: "AI 正在分析中...",
    planFreeName: "Free",
    planFreeDesc: "适合新用户试用",
    planProName: "Pro",
    planProDesc: "适合高频备考用户",
    planTeamName: "Team",
    planTeamDesc: "适合机构和教师",
    planPerMonth: "/月",
    planQuota: "每月 {quota} 次 AI 批改",
    planFeaturesFree1: "Task 1 + Task 2 批改",
    planFeaturesFree2: "基础分数与反馈",
    planFeaturesFree3: "服务端历史记录",
    planFeaturesPro1: "更高批改额度",
    planFeaturesPro2: "逐句改写建议",
    planFeaturesPro3: "优先响应支持",
    planFeaturesTeam1: "教师/机构多人使用",
    planFeaturesTeam2: "大额度批改",
    planFeaturesTeam3: "可扩展管理后台",
    planCurrent: "当前套餐",
    planChoose: "选择此套餐",
    historyTask: "任务类型",
    historyTime: "时间",
    historyLoad: "载入",
    networkError: "后端请求失败，请确认服务已启动。",
    quotaError: "当前账号批改次数已用完，请切换更高套餐。",
    authNameRequired: "请至少输入用户名。",
    serviceModePrefix: "服务模式"
  },
  en: {
    brandTag: "AI IELTS writing correction SaaS",
    navWorkspace: "Workspace",
    navPricing: "Pricing",
    navAdmin: "Admin",
    navFaq: "FAQ",
    guestName: "Guest Mode",
    loginButton: "Sign In / Join",
    eyebrow: "Built for monetizable IELTS writing products",
    heroTitle: "Upgrade a scoring page into a sellable IELTS writing service",
    heroText: "This version now includes real backend APIs, server-side history, and configurable AI scoring. It is a practical MVP base you can continue shipping.",
    heroActionPrimary: "Open Workspace",
    heroActionSecondary: "See Pricing",
    metricOne: "Total users",
    metricTwo: "Total reports",
    metricThree: "Average band",
    previewLabel: "Service Status",
    previewLive: "Backend Live",
    overallBand: "Current Estimate",
    criterionTR: "Task Response",
    criterionCC: "Coherence & Cohesion",
    criterionLR: "Lexical Resource",
    criterionGRA: "Grammar Accuracy",
    previewInsightTitle: "This version already includes",
    previewInsightOne: "Frontend and backend are connected",
    previewInsightTwo: "Configurable OpenAI grading with demo and real modes",
    previewInsightThree: "Users, history, drafts, plans, and admin metrics all come from backend APIs",
    workspaceEyebrow: "User Workspace",
    workspaceTitle: "User Workspace",
    usageLabel: "Remaining Reviews",
    summaryCurrentPlan: "Current Plan",
    freePlanDesc: "3 reviews per month for trial users",
    summaryEssays: "My Essays",
    summaryEssaysDesc: "Saved to backend history",
    summaryBestBand: "Best Band",
    summaryBestBandDesc: "Based on current account history",
    summaryMode: "Account Status",
    summaryModeDesc: "Saved on the server after sign-in",
    taskTypeLabel: "Writing Type",
    taskOneOption: "Task 1",
    taskTwoOption: "Task 2",
    candidateLabel: "Candidate Name",
    candidatePlaceholder: "Amy / Candidate",
    promptLabel: "Prompt",
    essayLabel: "Essay",
    promptPlaceholder: "Paste the IELTS Writing Task 1 or Task 2 prompt here",
    essayPlaceholder: "Paste the candidate essay here to generate scoring and feedback",
    wordCountLabel: "Word Count",
    saveDraftButton: "Save Draft",
    analyzeButton: "Generate AI Report",
    resultsPlaceholderTitle: "Your evaluation report will appear here",
    resultsPlaceholderText: "After submission, the backend will generate scoring, feedback, and server-side history.",
    resultsLabel: "AI Evaluation",
    strengthTitle: "Strengths",
    improveTitle: "Areas to Improve",
    rewriteTitle: "Sentence Upgrade",
    coachTitle: "AI Coach Summary",
    historyEyebrow: "Essay History",
    historyTitle: "History",
    clearHistoryButton: "Clear History",
    historyEmpty: "No saved reports yet. Submit an essay to create your first one.",
    pricingEyebrow: "Pricing",
    pricingTitle: "Plan Design",
    trustEyebrow: "Why Buyers Trust It",
    trustTitle: "Why this version feels more sellable",
    trustCardOneTitle: "Real data flow",
    trustCardOneText: "Users, drafts, history, and plan state are all stored on the backend instead of being fake frontend-only demo data.",
    trustCardTwoTitle: "Upgradeable AI grading",
    trustCardTwoText: "Once an OpenAI API key is configured, the product can switch into real AI grading mode and move beyond demo behavior.",
    trustCardThreeTitle: "Complete product packaging",
    trustCardThreeText: "FAQ, privacy, terms, and contact blocks reduce the demo feel and improve commercial trust.",
    adminEyebrow: "Operator View",
    adminTitle: "Lightweight Operator Dashboard",
    adminUsers: "Users",
    adminReports: "Reports",
    adminConversion: "Paid Conversion",
    adminTopPlan: "Top Plan",
    faqEyebrow: "FAQ",
    faqTitle: "Frequently Asked Questions",
    faqOneTitle: "Is it already using real AI grading?",
    faqOneText: "If the server has an OpenAI API key configured, grading runs through OpenAI. If not, it automatically falls back to demo mode for local development and product demos.",
    faqTwoTitle: "Who is this product for?",
    faqTwoText: "It fits individual IELTS learners, English teachers, training centers, and founders testing the AI education market quickly.",
    faqThreeTitle: "What is still missing before launch?",
    faqThreeText: "The biggest missing pieces are real payment, full account auth, cloud deployment, plus stronger logging, support, and operations.",
    legalEyebrow: "Legal",
    legalTitle: "Privacy, Terms, and Contact",
    privacyTitle: "Privacy Summary",
    privacyText: "Submitted essays are used to generate correction reports, store history, and improve the product experience. A production launch should add full compliance text, deletion rules, and data export options.",
    termsTitle: "Terms Summary",
    termsText: "This service provides AI-assisted writing review and does not guarantee official IELTS scores. Users remain responsible for uploaded content and use of the service, and the provider may update features and plans over time.",
    contactTitle: "Contact & Partnerships",
    contactText: "Email: hello@writemate-ai.com  Business WeChat: WriteMate-AI  Suitable for teacher partnerships, school procurement, white-label customization, and channel sales.",
    footerText: "WriteMate AI MVP · IELTS Writing Task 1 / Task 2 · Built for commercial launch iteration",
    authEyebrow: "Access",
    authTitle: "Sign in or create a demo account",
    authNameLabel: "Name",
    authNamePlaceholder: "Amy",
    authEmailLabel: "Email",
    authEmailPlaceholder: "amy@example.com",
    authPlanLabel: "Default Plan",
    authSubmit: "Enter Product",
    candidateFallback: "Anonymous Candidate",
    submitGuard: "Please enter both the prompt and the essay before scoring.",
    saveDraftToast: "Draft saved to the backend.",
    loginToast: "Account is now active in the workspace.",
    clearHistoryToast: "History has been cleared.",
    providerDemo: "Current mode: demo scoring",
    providerOpenAI: "Current mode: live OpenAI scoring",
    loading: "AI is analyzing...",
    planFreeName: "Free",
    planFreeDesc: "Best for product trial",
    planProName: "Pro",
    planProDesc: "Best for frequent IELTS users",
    planTeamName: "Team",
    planTeamDesc: "Best for schools and teachers",
    planPerMonth: "/mo",
    planQuota: "{quota} AI reviews per month",
    planFeaturesFree1: "Task 1 + Task 2 scoring",
    planFeaturesFree2: "Basic score and feedback",
    planFeaturesFree3: "Backend history",
    planFeaturesPro1: "Higher review quota",
    planFeaturesPro2: "Sentence upgrade suggestions",
    planFeaturesPro3: "Priority support",
    planFeaturesTeam1: "Built for teams and teachers",
    planFeaturesTeam2: "Large quota",
    planFeaturesTeam3: "Extensible management console",
    planCurrent: "Current Plan",
    planChoose: "Choose Plan",
    historyTask: "Task",
    historyTime: "Time",
    historyLoad: "Load",
    networkError: "Backend request failed. Make sure the server is running.",
    quotaError: "This account has no reviews left. Upgrade to continue.",
    authNameRequired: "Please enter a name.",
    serviceModePrefix: "Service Mode"
  }
};

const elements = {
  langToggle: document.querySelector("#langToggle"),
  authButton: document.querySelector("#authButton"),
  authModal: document.querySelector("#authModal"),
  authForm: document.querySelector("#authForm"),
  authNameInput: document.querySelector("#authNameInput"),
  authEmailInput: document.querySelector("#authEmailInput"),
  authPlanInput: document.querySelector("#authPlanInput"),
  accountName: document.querySelector("#accountName"),
  accountPlan: document.querySelector("#accountPlan"),
  taskType: document.querySelector("#taskType"),
  candidateName: document.querySelector("#candidateName"),
  essayPrompt: document.querySelector("#essayPrompt"),
  essayText: document.querySelector("#essayText"),
  wordCount: document.querySelector("#wordCount"),
  essayForm: document.querySelector("#essayForm"),
  saveDraftButton: document.querySelector("#saveDraftButton"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  resultsPlaceholder: document.querySelector("#resultsPlaceholder"),
  resultsContent: document.querySelector("#resultsContent"),
  resultsName: document.querySelector("#resultsName"),
  overallScore: document.querySelector("#overallScore"),
  criteriaGrid: document.querySelector("#criteriaGrid"),
  strengthList: document.querySelector("#strengthList"),
  improveList: document.querySelector("#improveList"),
  rewriteSuggestion: document.querySelector("#rewriteSuggestion"),
  coachSummary: document.querySelector("#coachSummary"),
  heroBand: document.querySelector("#heroBand"),
  historyGrid: document.querySelector("#historyGrid"),
  pricingGrid: document.querySelector("#pricingGrid"),
  usageCount: document.querySelector("#usageCount"),
  summaryPlan: document.querySelector("#summaryPlan"),
  summaryPlanDesc: document.querySelector("#summaryPlanDesc"),
  summaryEssayCount: document.querySelector("#summaryEssayCount"),
  summaryBestBandValue: document.querySelector("#summaryBestBandValue"),
  summaryModeValue: document.querySelector("#summaryModeValue"),
  metricUsers: document.querySelector("#metricUsers"),
  metricEssays: document.querySelector("#metricEssays"),
  metricAvgBand: document.querySelector("#metricAvgBand"),
  adminUsersValue: document.querySelector("#adminUsersValue"),
  adminReportsValue: document.querySelector("#adminReportsValue"),
  adminConversionValue: document.querySelector("#adminConversionValue"),
  adminTopPlanValue: document.querySelector("#adminTopPlanValue"),
  usageBanner: document.querySelector("#usageBanner")
};

function t(key) {
  return copy[state.lang][key] || key;
}

function setLanguage(lang) {
  state.lang = lang;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  elements.langToggle.textContent = lang === "zh" ? "EN" : "中";

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });

  renderPlanOptions();
  renderPricing();
  renderHistory();
  refreshAccountViews();
}

function getWords(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function updateWordCount() {
  elements.wordCount.textContent = String(getWords(elements.essayText.value).length);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || t("networkError"));
  }

  return payload;
}

function planName(planKey) {
  if (planKey === "free") return t("planFreeName");
  if (planKey === "pro") return t("planProName");
  return t("planTeamName");
}

function planDesc(planKey) {
  if (planKey === "free") return t("planFreeDesc");
  if (planKey === "pro") return t("planProDesc");
  return t("planTeamDesc");
}

function remainingQuota() {
  if (!state.user || !state.plans[state.user.plan]) return 0;
  return Math.max(state.plans[state.user.plan].quota - state.history.length, 0);
}

function renderPlanOptions() {
  const plans = Object.values(state.plans);
  if (!plans.length) return;

  elements.authPlanInput.innerHTML = plans.map((plan) => `
    <option value="${plan.key}">${planName(plan.key)}</option>
  `).join("");

  elements.authPlanInput.value = state.user?.plan || "free";
}

function renderPricing() {
  const featureMap = {
    free: [t("planFeaturesFree1"), t("planFeaturesFree2"), t("planFeaturesFree3")],
    pro: [t("planFeaturesPro1"), t("planFeaturesPro2"), t("planFeaturesPro3")],
    team: [t("planFeaturesTeam1"), t("planFeaturesTeam2"), t("planFeaturesTeam3")]
  };

  elements.pricingGrid.innerHTML = Object.values(state.plans).map((plan) => `
    <article class="plan-card ${state.user?.plan === plan.key ? "active" : ""}">
      <span class="plan-badge">${plan.featured ? plan.badge : planName(plan.key)}</span>
      <div>
        <h3>${planName(plan.key)}</h3>
        <p>${planDesc(plan.key)}</p>
      </div>
      <div class="plan-price">
        <strong>$${plan.price}</strong>
        <span>${t("planPerMonth")}</span>
      </div>
      <p>${t("planQuota").replace("{quota}", plan.quota)}</p>
      <ul>${featureMap[plan.key].map((item) => `<li>${item}</li>`).join("")}</ul>
      <div class="plan-footer">
        <span>${state.user?.plan === plan.key ? t("planCurrent") : ""}</span>
        <button class="primary-button small choose-plan-button" type="button" data-plan="${plan.key}">${t("planChoose")}</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".choose-plan-button").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const payload = await api("/api/plan", {
          method: "POST",
          body: JSON.stringify({
            userId: state.currentUserId,
            plan: button.dataset.plan
          })
        });
        state.user = payload.user;
        refreshAccountViews();
        renderPricing();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });
}

function renderHistory() {
  const items = [...state.history].reverse();
  if (!items.length) {
    elements.historyGrid.innerHTML = `<article class="history-card"><p class="history-empty">${t("historyEmpty")}</p></article>`;
    return;
  }

  elements.historyGrid.innerHTML = items.map((item) => `
    <article class="history-card">
      <div class="history-meta">
        <span class="score-pill">${Number(item.overall).toFixed(1)}</span>
        <span>${t("historyTask")}: ${item.taskLabel}</span>
      </div>
      <h3>${item.name}</h3>
      <p>${item.prompt.slice(0, 120)}${item.prompt.length > 120 ? "..." : ""}</p>
      <div class="history-meta">
        <span>${t("historyTime")}: ${item.timestamp}</span>
        <button class="ghost-button load-history-button" type="button" data-id="${item.id}">${t("historyLoad")}</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".load-history-button").forEach((button) => {
    button.addEventListener("click", () => {
      const found = state.history.find((item) => item.id === button.dataset.id);
      if (!found) return;
      populateForm(found);
      renderResults(found);
      document.querySelector("#workspace").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function refreshAccountViews() {
  const plan = state.user ? state.plans[state.user.plan] : null;
  const bestBand = state.history.reduce((max, item) => Math.max(max, Number(item.overall || 0)), 0);

  elements.accountName.textContent = state.user?.name || t("guestName");
  elements.accountPlan.textContent = plan ? planName(plan.key) : "Free";
  elements.summaryPlan.textContent = plan ? planName(plan.key) : "Free";
  elements.summaryPlanDesc.textContent = plan?.key === "free" ? t("freePlanDesc") : t("planQuota").replace("{quota}", plan?.quota || 0);
  elements.summaryEssayCount.textContent = String(state.history.length);
  elements.summaryBestBandValue.textContent = bestBand ? bestBand.toFixed(1) : "0.0";
  elements.summaryModeValue.textContent = state.user?.name || t("guestName");
  elements.usageCount.textContent = String(remainingQuota());

  elements.metricUsers.textContent = String(state.admin?.totalUsers || 0);
  elements.metricEssays.textContent = String(state.admin?.totalReports || 0);
  elements.metricAvgBand.textContent = state.admin?.avgBand ? Number(state.admin.avgBand).toFixed(1) : "0.0";
  elements.adminUsersValue.textContent = String(state.admin?.totalUsers || 0);
  elements.adminReportsValue.textContent = String(state.admin?.totalReports || 0);
  elements.adminConversionValue.textContent = `${state.admin?.paidConversion || 0}%`;
  elements.adminTopPlanValue.textContent = state.admin?.topPlan ? planName(state.admin.topPlan) : "Free";
  elements.usageBanner.title = `${t("serviceModePrefix")}: ${state.currentProvider === "openai" ? t("providerOpenAI") : t("providerDemo")}`;
}

function populateForm(record) {
  elements.taskType.value = record.task || "task2";
  elements.candidateName.value = record.name || "";
  elements.essayPrompt.value = record.prompt || "";
  elements.essayText.value = record.essay || "";
  updateWordCount();
}

function renderResults(result) {
  elements.resultsName.textContent = `${result.name || t("candidateFallback")} · ${result.taskLabel || (elements.taskType.value === "task1" ? "Task 1" : "Task 2")}`;
  elements.overallScore.textContent = Number(result.overall).toFixed(1);
  elements.heroBand.textContent = Number(result.overall).toFixed(1);

  const criteria = [
    { title: t("criterionTR"), score: result.taskResponse, note: result.taskResponseFeedback },
    { title: t("criterionCC"), score: result.coherence, note: result.coherenceFeedback },
    { title: t("criterionLR"), score: result.lexical, note: result.lexicalFeedback },
    { title: t("criterionGRA"), score: result.grammar, note: result.grammarFeedback }
  ];

  elements.criteriaGrid.innerHTML = criteria.map((item) => `
    <article class="criterion-card">
      <h4>${item.title}</h4>
      <strong>${Number(item.score).toFixed(1)}</strong>
      <p>${item.note}</p>
    </article>
  `).join("");

  elements.strengthList.innerHTML = (result.strengths || []).map((item) => `<li>${item}</li>`).join("");
  elements.improveList.innerHTML = (result.improvements || []).map((item) => `<li>${item}</li>`).join("");
  elements.rewriteSuggestion.innerHTML = `<strong>${t("rewriteTitle")}</strong><br>${result.rewriteSuggestion || ""}`;
  elements.coachSummary.textContent = result.coachSummary || "";

  elements.resultsPlaceholder.classList.add("hidden");
  elements.resultsContent.classList.remove("hidden");
}

async function bootstrap() {
  try {
    const query = state.currentUserId ? `?userId=${encodeURIComponent(state.currentUserId)}` : "";
    const payload = await api(`/api/bootstrap${query}`, { method: "GET", headers: {} });
    state.user = payload.user;
    state.history = payload.history || [];
    state.draft = payload.draft || null;
    state.plans = payload.plans || {};
    state.admin = payload.admin || null;
    state.currentUserId = payload.user.id;
    state.currentProvider = payload.provider || "demo";
    window.localStorage.setItem("writemate-user-id", state.currentUserId);
    renderPlanOptions();
    renderPricing();
    renderHistory();
    refreshAccountViews();
    if (state.draft) {
      populateForm(state.draft);
    }
  } catch (error) {
    window.alert(error.message);
  }
}

function openModal() {
  elements.authModal.classList.remove("hidden");
}

function closeModal() {
  elements.authModal.classList.add("hidden");
}

async function submitAuth(event) {
  event.preventDefault();
  if (!elements.authNameInput.value.trim()) {
    window.alert(t("authNameRequired"));
    return;
  }

  try {
    const payload = await api("/api/auth/demo-login", {
      method: "POST",
      body: JSON.stringify({
        userId: state.currentUserId,
        name: elements.authNameInput.value.trim(),
        email: elements.authEmailInput.value.trim(),
        plan: elements.authPlanInput.value,
        lang: state.lang
      })
    });
    state.user = payload.user;
    state.currentUserId = payload.user.id;
    state.admin = payload.admin;
    window.localStorage.setItem("writemate-user-id", state.currentUserId);
    refreshAccountViews();
    renderPricing();
    closeModal();
    window.alert(t("loginToast"));
  } catch (error) {
    window.alert(error.message);
  }
}

async function saveDraft() {
  try {
    const payload = await api("/api/draft", {
      method: "POST",
      body: JSON.stringify({
        userId: state.currentUserId,
        task: elements.taskType.value,
        name: elements.candidateName.value.trim(),
        prompt: elements.essayPrompt.value.trim(),
        essay: elements.essayText.value,
        lang: state.lang
      })
    });
    state.draft = payload.draft;
    window.alert(t("saveDraftToast"));
  } catch (error) {
    window.alert(error.message);
  }
}

async function clearHistory() {
  try {
    const payload = await api(`/api/history?userId=${encodeURIComponent(state.currentUserId)}`, {
      method: "DELETE",
      headers: {}
    });
    state.history = payload.history || [];
    state.admin = payload.admin;
    renderHistory();
    refreshAccountViews();
    window.alert(t("clearHistoryToast"));
  } catch (error) {
    window.alert(error.message);
  }
}

async function submitEssay(event) {
  event.preventDefault();
  if (!elements.essayPrompt.value.trim() || !elements.essayText.value.trim()) {
    window.alert(t("submitGuard"));
    return;
  }

  elements.overallScore.textContent = "...";
  elements.resultsPlaceholder.classList.add("hidden");
  elements.resultsContent.classList.remove("hidden");
  elements.criteriaGrid.innerHTML = "";
  elements.strengthList.innerHTML = `<li>${t("loading")}</li>`;
  elements.improveList.innerHTML = "";
  elements.rewriteSuggestion.innerHTML = t("loading");
  elements.coachSummary.textContent = "";

  try {
    const payload = await api("/api/grade", {
      method: "POST",
      body: JSON.stringify({
        userId: state.currentUserId,
        task: elements.taskType.value,
        candidateName: elements.candidateName.value.trim(),
        prompt: elements.essayPrompt.value.trim(),
        essay: elements.essayText.value,
        lang: state.lang
      })
    });
    state.history = payload.history || [];
    state.admin = payload.admin;
    state.currentProvider = payload.provider || state.currentProvider;
    renderHistory();
    refreshAccountViews();
    renderResults(payload.report);
  } catch (error) {
    elements.resultsContent.classList.add("hidden");
    elements.resultsPlaceholder.classList.remove("hidden");
    window.alert(error.message === "QUOTA_EXCEEDED" ? t("quotaError") : error.message);
  }
}

elements.essayText.addEventListener("input", updateWordCount);
elements.langToggle.addEventListener("click", () => setLanguage(state.lang === "zh" ? "en" : "zh"));
elements.authButton.addEventListener("click", openModal);
elements.authForm.addEventListener("submit", submitAuth);
elements.saveDraftButton.addEventListener("click", saveDraft);
elements.clearHistoryButton.addEventListener("click", clearHistory);
elements.essayForm.addEventListener("submit", submitEssay);

document.querySelectorAll("[data-scroll-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(button.dataset.scrollTarget);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.querySelectorAll("[data-close-modal]").forEach((node) => {
  node.addEventListener("click", closeModal);
});

setLanguage("zh");
updateWordCount();
bootstrap();
