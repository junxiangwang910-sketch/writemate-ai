const typeLabels = {
  summary: "归纳概括",
  solution: "提出对策",
  analysis: "综合分析",
  official: "贯彻执行",
  essay: "申论大作文"
};

const typeFocus = {
  summary: ["概括对象", "问题表现", "原因归纳", "条理分层", "材料原词"],
  solution: ["问题对应", "主体责任", "可操作措施", "长效机制", "群众反馈"],
  analysis: ["观点表态", "原因分析", "影响分析", "辩证表达", "结论回扣"],
  official: ["发文对象", "格式规范", "工作目标", "具体措施", "号召总结"],
  essay: ["中心论点", "分论点", "材料联系", "政策高度", "结尾升华"]
};

const dimensions = [
  { key: "relevance", label: "审题准确" },
  { key: "coverage", label: "要点覆盖" },
  { key: "logic", label: "逻辑结构" },
  { key: "material", label: "材料提炼" },
  { key: "language", label: "语言规范" },
  { key: "format", label: "格式要求" }
];

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

function tokenize(text) {
  return Array.from(new Set(
    text
      .replace(/[，。；：、“”‘’（）《》？！\s]/g, "")
      .split("")
      .filter(Boolean)
  ));
}

function coverageRatio(source, answer) {
  const tokens = tokenize(source);
  if (!tokens.length) return 0.75;
  const answerTextValue = answer.replace(/\s/g, "");
  const matched = tokens.filter((token) => answerTextValue.includes(token)).length;
  return matched / tokens.length;
}

function countPolicyWords(text) {
  const words = ["机制", "平台", "协同", "治理", "服务", "监督", "反馈", "考核", "群众", "基层", "落实", "规范", "责任"];
  return words.filter((word) => text.includes(word)).length;
}

function scoreReport() {
  const type = questionType.value;
  const answer = answerText.value.trim();
  const prompt = promptText.value.trim();
  const material = materialText.value.trim();
  const charTotal = countChars(answer);
  const materialCoverage = coverageRatio(material, answer);
  const promptCoverage = coverageRatio(prompt, answer);
  const paragraphCount = answer.split(/\n+/).filter((part) => part.trim()).length;
  const policyWords = countPolicyWords(answer);
  const hasNumbering = /一是|二是|三是|首先|其次|再次|第一|第二|第三/.test(answer);
  const targetMax = Number(maxScore.value);

  const raw = {
    relevance: 62 + promptCoverage * 25,
    coverage: 58 + materialCoverage * 30 + Math.min(policyWords, 8),
    logic: 60 + (hasNumbering ? 14 : 4) + Math.min(paragraphCount * 3, 12),
    material: 56 + materialCoverage * 28 + Math.min(policyWords, 10),
    language: 66 + Math.min(charTotal / 30, 12) - (charTotal > 650 ? 6 : 0),
    format: 68 + (type === "official" ? (answer.includes("通知") || answer.includes("倡议") ? 12 : -6) : 6)
  };

  const scores = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Math.round(Math.min(92, Math.max(48, value)))])
  );

  const average = Object.values(scores).reduce((sum, item) => sum + item, 0) / Object.values(scores).length;
  const percentScore = Math.round(average);
  const scaledScore = Math.round((percentScore / 100) * targetMax);
  const focusWords = typeFocus[type];
  const missing = focusWords.filter((word) => !answer.includes(word.slice(0, 2))).slice(0, 4);

  return {
    type,
    targetMax,
    percentScore,
    scaledScore,
    scores,
    missing: missing.length ? missing : ["材料关键词", "分层表达"],
    strengths: [
      hasNumbering ? "答案有明显分层，阅卷时更容易识别要点。" : "答案基本回应了题目要求，具备初步作答方向。",
      materialCoverage > 0.46 ? "能够提取部分材料信息，未完全脱离给定资料。" : "已经围绕题目作答，但材料提炼还可以更充分。",
      policyWords >= 4 ? "使用了一定政策表达，语言有申论规范感。" : "表达较为清楚，具备继续优化的基础。"
    ],
    weaknesses: [
      materialCoverage < 0.5 ? "材料要点覆盖不足，建议回到材料中提炼更多关键词。" : "要点仍可进一步压缩和合并，避免表达松散。",
      !hasNumbering ? "层次标志不够明显，建议使用“一是、二是、三是”增强条理。" : "部分要点之间的逻辑递进还可以更清晰。",
      charTotal < 180 ? "作答篇幅偏短，可能导致要点展开不足。" : "可以进一步提升语言的机关表达和对策可操作性。"
    ],
    rewrite: buildRewrite(type)
  };
}

function buildRewrite(type) {
  const starts = {
    summary: "建议改为：当前基层治理主要存在服务意识不强、平台重复填报、部门协同不足、群众诉求响应慢等问题。",
    solution: "建议改为：针对上述问题，应从压实责任、整合平台、优化流程、强化协同和完善反馈机制等方面综合施策。",
    analysis: "建议改为：这一现象反映出基层治理从粗放管理向精细服务转型过程中的结构性矛盾，需要辩证看待。",
    official: "建议改为：围绕工作目标、主要任务、责任分工和落实要求展开，突出对象明确、格式规范、措施具体。",
    essay: "建议改为：以基层治理现代化为中心论点，从服务理念、数字治理、协同机制和群众参与四个层面展开论证。"
  };
  return `${starts[type]} 作答时要尽量使用材料中的关键词，并把问题、原因、影响和对策分层呈现，避免只写泛泛口号。`;
}

function renderReport(report) {
  emptyState.classList.add("hidden");
  reportContent.classList.remove("hidden");
  reportTitle.textContent = `${typeLabels[report.type]}批改报告`;
  overallScore.textContent = `${report.scaledScore}/${report.targetMax}`;
  heroScore.textContent = String(report.percentScore);

  dimensionGrid.innerHTML = dimensions.map((dimension) => `
    <article class="dimension-card">
      <h4>${dimension.label}</h4>
      <strong>${report.scores[dimension.key]}</strong>
      <p>${dimensionText(dimension.key, report.scores[dimension.key])}</p>
    </article>
  `).join("");

  strengthList.innerHTML = report.strengths.map((item) => `<li>${item}</li>`).join("");
  weaknessList.innerHTML = report.weaknesses.map((item) => `<li>${item}</li>`).join("");
  missingTags.innerHTML = report.missing.map((item) => `<span>${item}</span>`).join("");
  rewriteText.textContent = report.rewrite;
}

function dimensionText(key, score) {
  const high = score >= 78;
  const map = {
    relevance: high ? "审题方向较准确，基本扣住题干要求。" : "审题仍需更精准，建议拆解题干关键词。",
    coverage: high ? "要点覆盖较好，能抓住材料主要信息。" : "要点覆盖不足，建议补充材料中的关键对象与措施。",
    logic: high ? "层次较清晰，结构便于阅卷识别。" : "结构还不够鲜明，需要增加分层标志。",
    material: high ? "材料提炼较充分，能转化为规范表达。" : "材料提炼偏少，存在泛泛作答风险。",
    language: high ? "表达较规范，有一定机关文风。" : "语言还可更凝练，减少口语化表达。",
    format: high ? "基本符合题型格式和作答要求。" : "格式意识还需加强，尤其贯彻执行题要注意文种。"
  };
  return map[key];
}

function updateCount() {
  charCount.textContent = String(countChars(answerText.value));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderReport(scoreReport());
});

answerText.addEventListener("input", updateCount);

document.querySelectorAll("[data-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(button.dataset.target);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

updateCount();
