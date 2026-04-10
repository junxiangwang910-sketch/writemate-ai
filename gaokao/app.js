const state = {
  userId: window.localStorage.getItem("writemate-user-id") || "",
  history: [],
  profile: null,
  principalSummary: null,
  provider: "demo",
  isSubmitting: false
};

const samples = {
  chinese: {
    examType: "material-essay",
    prompt: "阅读下面的材料，根据要求写作。\n有人说，真正的成长不是把自己变得和别人一样，而是在喧闹中逐渐找到自己的节奏。也有人认为，个人节奏固然重要，但在群体、规则与时代要求面前，青年更应学会与外部世界同频共振。\n以上材料引发了你怎样的联想与思考？请写一篇文章。",
    requirements: "要求：选准角度，确定立意，明确文体，自拟标题；不要套作，不得抄袭；不少于 800 字。",
    essay: "找到自己的节奏，也学会与时代同频\n\n成长从来不是一条标准流水线。有人走得快，有人走得慢；有人擅长表达，有人习惯沉思。如果只用同一个节拍衡量所有人，成长很容易变成一场焦虑的追赶。但如果只强调个人感受，不愿意听见时代和社会的召唤，成长又可能滑向自我封闭。因此，真正成熟的青年，既要找到自己的节奏，也要学会在大时代中与外部世界形成有意义的共振。\n\n找到自己的节奏，是为了不被外界喧哗轻易带偏。现实中，总有人被“别人都在做什么”牵着走：别人报班，我也报；别人刷题，我也刷；别人选择热门专业，我也盲目跟随。看似热闹，实则失去了判断。每个人的基础、兴趣、目标并不完全相同，成长若没有自我认知，就容易在比较中迷失。真正稳的成长，往往从承认自己的特点开始，知道自己哪里薄弱，哪里擅长，愿意在适合自己的节奏中一点点积累。\n\n但成长也不能只停留在“我喜欢怎样”这一层面。青年终究生活在社会之中，要面对规则、责任和时代命题。一个人即使再有个性，也不能脱离集体需要；再强调自我，也不能拒绝公共责任。今天的青年面对科技发展、社会服务、乡村振兴、文化传承等现实任务，如果只沉浸在小小的个人世界里，就很难真正完成从“长大”到“成熟”的跨越。与时代同频，不是放弃自我，而是让个人节奏在更广阔的坐标中找到方向。\n\n因此，更理想的成长，不是二选一，而是把二者结合起来。一方面，要保留独立判断，不盲从、不焦躁，找到适合自己的学习方式和成长路径；另一方面，也要把个人努力放进时代需求之中，理解规则、承担责任、回应社会。只有这样，成长才不是被动追赶，也不是孤立自赏，而是在自我完善与时代回应之间不断校准、不断前行。\n\n青年最终要面对的，不只是“我是谁”，还包括“我能为这个时代做什么”。当一个人既能守住自己的节奏，又能主动与时代同频，他的成长才真正有了厚度、方向和力量。",
    studentName: "李同学",
    schoolName: "市一中",
    className: "高三 1 班",
    targetTrack: "作文冲刺 50+",
    currentIssue: "容易空泛，没有例证",
    teacherComment: "结构基本有，但发展等级拉不上去",
    selfAssessment: "思路有，但下笔容易空",
    motivationStyle: "适合明确任务清单"
  },
  english: {
    examType: "task-writing",
    prompt: "假定你是李华，你校英语报正在征集主题为 \"How to Study Efficiently in Senior Three\" 的稿件。请你写一篇短文投稿，内容包括：1. 你的观点；2. 两到三条具体建议；3. 你的鼓励。",
    requirements: "词数 100 左右，可适当增加细节，以使行文连贯。",
    essay: "How to Study Efficiently in Senior Three\n\nSenior Three is a busy but meaningful year, so studying efficiently is more important than simply studying longer. In my opinion, a clear plan and a calm mind are the keys to good performance.\n\nFirst, students should make a practical daily plan. It helps us know what to do in each period and avoid wasting time. Second, we should review mistakes regularly instead of doing exercises blindly. By correcting the same problems again and again, we can make real progress. Third, it is necessary to keep a healthy lifestyle. Enough sleep and proper exercise can make us more focused in class.\n\nAlthough Senior Three is challenging, we should stay confident. If we work step by step and keep improving, we will surely become better and achieve our goals.",
    studentName: "Amy",
    schoolName: "市一中",
    className: "高三 1 班",
    targetTrack: "英语作文稳定 20+",
    currentIssue: "句子不敢写复杂",
    teacherComment: "基础较稳，但段落不够清楚",
    selfAssessment: "基础还可以，想冲更高分",
    motivationStyle: "适合对标班级优秀样本"
  }
};

const subject = document.querySelector("#subject");
const examType = document.querySelector("#examType");
const gradeLevel = document.querySelector("#gradeLevel");
const schoolName = document.querySelector("#schoolName");
const className = document.querySelector("#className");
const studentName = document.querySelector("#studentName");
const targetTrack = document.querySelector("#targetTrack");
const currentIssue = document.querySelector("#currentIssue");
const teacherComment = document.querySelector("#teacherComment");
const selfAssessment = document.querySelector("#selfAssessment");
const motivationStyle = document.querySelector("#motivationStyle");
const promptField = document.querySelector("#prompt");
const requirements = document.querySelector("#requirements");
const essay = document.querySelector("#essay");
const sampleButton = document.querySelector("#sampleButton");
const submitButton = document.querySelector("#submitButton");
const lengthCount = document.querySelector("#lengthCount");
const imageInput = document.querySelector("#imageInput");
const ocrButton = document.querySelector("#ocrButton");
const ocrStatus = document.querySelector("#ocrStatus");

const profileTotal = document.querySelector("#profileTotal");
const profileAverage = document.querySelector("#profileAverage");
const profileTrend = document.querySelector("#profileTrend");
const profileTags = document.querySelector("#profileTags");
const profileActions = document.querySelector("#profileActions");
const emptyState = document.querySelector("#emptyState");
const reportContent = document.querySelector("#reportContent");
const reportTitle = document.querySelector("#reportTitle");
const overallScore = document.querySelector("#overallScore");
const scoreRange = document.querySelector("#scoreRange");
const scoreConfidence = document.querySelector("#scoreConfidence");
const cohortStrip = document.querySelector("#cohortStrip");
const dimensionGrid = document.querySelector("#dimensionGrid");
const strengthList = document.querySelector("#strengthList");
const issueList = document.querySelector("#issueList");
const actionList = document.querySelector("#actionList");
const revisionGuidance = document.querySelector("#revisionGuidance");
const coachingFocus = document.querySelector("#coachingFocus");
const selfCorrectionPrompts = document.querySelector("#selfCorrectionPrompts");
const teacherCheckpoints = document.querySelector("#teacherCheckpoints");
const historyGrid = document.querySelector("#historyGrid");

const classNameInput = document.querySelector("#classNameInput");
const classSubject = document.querySelector("#classSubject");
const classSummaryButton = document.querySelector("#classSummaryButton");
const classSummaryStatus = document.querySelector("#classSummaryStatus");
const classSummary = document.querySelector("#classSummary");

const heroReportCount = document.querySelector("#heroReportCount");
const heroSchoolCount = document.querySelector("#heroSchoolCount");
const heroClassCount = document.querySelector("#heroClassCount");
const heroAverage = document.querySelector("#heroAverage");
const heroServiceMode = document.querySelector("#heroServiceMode");
const heroProviderNote = document.querySelector("#heroProviderNote");
const barrierList = document.querySelector("#barrierList");
const valueList = document.querySelector("#valueList");
const serviceNarrative = document.querySelector("#serviceNarrative");
const principalIssues = document.querySelector("#principalIssues");

function renderProvider(provider) {
  state.provider = provider || "demo";
  const label = state.provider === "deepseek"
    ? "DeepSeek 蒸馏"
    : state.provider === "openai"
      ? "OpenAI 蒸馏"
      : "演示模式";
  heroServiceMode.textContent = label;
  heroProviderNote.textContent = state.provider === "demo"
    ? "当前是演示评分模式，可继续保留独立高考宝网页做流程演示。"
    : `当前高考宝独立网页已接入 ${label}，会返回真实批改与蒸馏反馈。`;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || "请求失败");
  }
  return payload;
}

function syncExamTypeOptions() {
  examType.innerHTML = subject.value === "english"
    ? `
      <option value="task-writing">应用写作</option>
      <option value="continuation">读后续写</option>
    `
    : `
      <option value="material-essay">材料作文</option>
      <option value="topic-essay">命题 / 话题作文</option>
    `;
}

function countLength() {
  if (subject.value === "english") {
    lengthCount.textContent = `${essay.value.trim().split(/\s+/).filter(Boolean).length} 词`;
  } else {
    lengthCount.textContent = `${essay.value.replace(/\s/g, "").length} 字`;
  }
}

function renderList(element, items = []) {
  element.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function renderTags(element, items = []) {
  element.innerHTML = items.map((item) => `<span>${item}</span>`).join("");
}

function renderProfile(profile) {
  state.profile = profile;
  profileTotal.textContent = String(profile?.totalReports || 0);
  profileAverage.textContent = String(profile?.averageScore || 0);
  profileTrend.textContent = profile?.trendText || "先完成第一次作文批改，系统再开始生成个人提分画像。";
  renderTags(profileTags, profile?.focusTags || []);
  renderList(profileActions, profile?.nextActions || []);
}

function renderPrincipalSummary(summary) {
  state.principalSummary = summary;
  heroReportCount.textContent = String(summary?.reportCount || 0);
  heroSchoolCount.textContent = String(summary?.schoolCount || 0);
  heroClassCount.textContent = String(summary?.classCount || 0);
  heroAverage.textContent = String(summary?.averageScore || 0);
  barrierList.innerHTML = (summary?.highBarrierPoints || []).map((item) => `<li>${item}</li>`).join("");
  valueList.innerHTML = (summary?.strategicValue || []).map((item) => `<li>${item}</li>`).join("");
  serviceNarrative.textContent = summary?.serviceNarrative || "系统会把单篇批改、班级讲评和学校数据库沉淀连接起来。";
  renderTags(principalIssues, [...(summary?.commonIssues || []), ...(summary?.focusDimensions || [])].slice(0, 6));
}

function renderCohort(report) {
  const cohort = report?.cohortSnapshot || {};
  const chips = [];
  if (cohort.classAverage != null) chips.push(`<span>班级均分 ${cohort.classAverage}</span>`);
  if (cohort.allAverage != null) chips.push(`<span>全库均分 ${cohort.allAverage}</span>`);
  if (cohort.classSize) chips.push(`<span>班级样本 ${cohort.classSize}</span>`);
  if (cohort.rank) chips.push(`<span>班级排名 ${cohort.rank}</span>`);
  if (cohort.percentile != null) chips.push(`<span>班级百分位 ${cohort.percentile}%</span>`);
  cohortStrip.innerHTML = chips.join("");
}

function renderReport(report) {
  emptyState.classList.add("hidden");
  reportContent.classList.remove("hidden");
  reportTitle.textContent = `${report.studentName || "学生"} · ${report.subjectLabel}成长诊断`;
  overallScore.textContent = `${report.scaledScore}/${report.targetMax}`;
  scoreRange.textContent = `${report.estimatedLow}-${report.estimatedHigh}`;
  scoreConfidence.textContent = `${report.scoreConfidence}%`;
  renderCohort(report);

  dimensionGrid.innerHTML = (report.dimensions || []).map((item) => `
    <article class="dimension-card">
      <div class="dimension-top">
        <h4>${item.label}</h4>
        <strong>${item.score}/${item.maxScore}</strong>
      </div>
      <p>${item.comment}</p>
    </article>
  `).join("");

  renderList(strengthList, report.strengths || []);
  renderList(issueList, report.issues || []);
  renderList(actionList, report.actionItems || []);
  revisionGuidance.textContent = report.revisionGuidance || "";
  renderList(coachingFocus, report.coachingFocus || []);
  renderList(selfCorrectionPrompts, report.selfCorrectionPrompts || []);
  renderList(teacherCheckpoints, report.teacherCheckpoints || []);
}

function renderHistory(history) {
  state.history = history || [];
  if (!state.history.length) {
    historyGrid.innerHTML = `
      <article class="history-empty">
        <p>还没有批改记录</p>
        <span>先完成一篇作文诊断，系统就会开始积累学校自己的样本数据库。</span>
      </article>
    `;
    return;
  }

  historyGrid.innerHTML = state.history.slice().reverse().map((item) => `
    <article class="history-card">
      <div class="history-head">
        <div>
          <p>${item.studentName || "未命名学生"}</p>
          <span>${item.subjectLabel} · ${item.className || item.schoolName || "未分班"}</span>
        </div>
        <strong>${item.scaledScore}/${item.targetMax}</strong>
      </div>
      <p class="history-time">${item.timestamp}</p>
      <p class="history-range">建议区间 ${item.estimatedLow}-${item.estimatedHigh}</p>
      <button class="secondary-button small-history-button" type="button" data-load-id="${item.id}">载入报告</button>
    </article>
  `).join("");

  document.querySelectorAll("[data-load-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const report = state.history.find((item) => item.id === button.dataset.loadId);
      if (report) renderReport(report);
    });
  });
}

function fillSample() {
  const sample = samples[subject.value];
  syncExamTypeOptions();
  examType.value = sample.examType;
  promptField.value = sample.prompt;
  requirements.value = sample.requirements;
  essay.value = sample.essay;
  studentName.value = sample.studentName;
  schoolName.value = sample.schoolName;
  className.value = sample.className;
  classNameInput.value = sample.className;
  targetTrack.value = sample.targetTrack;
  currentIssue.value = sample.currentIssue;
  teacherComment.value = sample.teacherComment;
  selfAssessment.value = sample.selfAssessment;
  motivationStyle.value = sample.motivationStyle;
  countLength();
}

function getStudentProfilePayload() {
  return {
    targetTrack: targetTrack.value.trim(),
    currentIssue: currentIssue.value.trim(),
    teacherComment: teacherComment.value.trim(),
    selfAssessment: selfAssessment.value,
    motivationStyle: motivationStyle.value
  };
}

async function bootstrap() {
  const query = state.userId ? `?userId=${encodeURIComponent(state.userId)}` : "";
  const payload = await api(`/api/gaokao/bootstrap${query}`, { method: "GET", headers: {} });
  state.userId = payload.user.id;
  window.localStorage.setItem("writemate-user-id", state.userId);
  renderProvider(payload.provider);
  renderProfile(payload.profile);
  renderHistory(payload.history);
  renderPrincipalSummary(payload.principalSummary || {});
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

async function runOcr() {
  const file = imageInput.files?.[0];
  if (!file) {
    window.alert("请先选择一张答题卡图片。");
    return;
  }
  ocrButton.disabled = true;
  ocrButton.textContent = "识别中...";
  ocrStatus.textContent = "正在识别图片文字与作文起始位置，请稍候。";
  try {
    const imageDataUrl = await readFileAsDataUrl(file);
    const payload = await api("/api/gaokao/ocr", {
      method: "POST",
      body: JSON.stringify({ subject: subject.value, imageDataUrl })
    });
    if (payload.prompt && !promptField.value.trim()) promptField.value = payload.prompt;
    if (payload.requirements && !requirements.value.trim()) requirements.value = payload.requirements;
    if (payload.essay) essay.value = payload.essay;
    ocrStatus.textContent = payload.notes || "识别完成，请人工校对后再提交。";
    countLength();
  } catch (error) {
    ocrStatus.textContent = error.message || "识别失败，请换一张更清晰的图片。";
  } finally {
    ocrButton.disabled = false;
    ocrButton.textContent = "图片转文字";
  }
}

async function submit() {
  if (state.isSubmitting) return;
  if (!promptField.value.trim() || !essay.value.trim()) {
    window.alert("请先填写题目和作文内容。");
    return;
  }
  state.isSubmitting = true;
  submitButton.disabled = true;
  submitButton.textContent = "诊断中...";
  try {
    const payload = await api("/api/gaokao/grade", {
      method: "POST",
      body: JSON.stringify({
        userId: state.userId,
        subject: subject.value,
        examType: examType.value,
        gradeLevel: gradeLevel.value,
        schoolName: schoolName.value.trim(),
        className: className.value.trim(),
        studentName: studentName.value.trim(),
        prompt: promptField.value.trim(),
        requirements: requirements.value.trim(),
        essay: essay.value.trim(),
        studentProfile: getStudentProfilePayload()
      })
    });
    renderReport(payload.report);
    renderProvider(payload.provider);
    renderProfile(payload.profile);
    renderHistory(payload.history);
    const principalPayload = await api("/api/gaokao/principal-summary", { method: "GET", headers: {} });
    renderPrincipalSummary(principalPayload.summary);
  } catch (error) {
    window.alert(error.message || "批改失败，请稍后再试。");
  } finally {
    state.isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = "生成诊断报告";
  }
}

function renderClassSummary(summary) {
  classSummary.classList.remove("hidden");
  if (!summary.totalStudents) {
    classSummary.innerHTML = `
      <div class="history-empty">
        <p>这个班级还没有可用数据</p>
        <span>先给这个班的学生做几次批改，再生成讲评建议。</span>
      </div>
    `;
    return;
  }

  classSummary.innerHTML = `
    <section class="class-brief">
      <div class="profile-grid">
        <div><span>学生数</span><strong>${summary.totalStudents}</strong></div>
        <div><span>平均分</span><strong>${summary.averageScore}</strong></div>
      </div>
      <p class="profile-note">${summary.teacherBrief}</p>
      <div class="tag-row">${(summary.commonIssues || []).map((item) => `<span>${item}</span>`).join("")}</div>
      <ul class="profile-list">${(summary.briefingPoints || []).map((item) => `<li>${item}</li>`).join("")}</ul>
    </section>
    <section class="student-grid">
      ${(summary.students || []).map((student) => `
        <article class="student-card">
          <div class="history-head">
            <div>
              <p>${student.studentName}</p>
              <span>${student.subjectLabel}</span>
            </div>
            <strong>${student.score}/${student.targetMax}</strong>
          </div>
          <p class="history-range">建议区间 ${student.scoreRange}</p>
          <div class="student-block">
            <h4>主要问题</h4>
            <ul>${(student.keyIssues || []).map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
          <div class="student-block">
            <h4>个性化建议</h4>
            <ul>${(student.personalizedAdvice || []).map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
          <div class="student-block">
            <h4>成长推动点</h4>
            <ul>${(student.coachingFocus || []).map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
          <div class="student-block">
            <h4>让学生自己回答</h4>
            <ul>${(student.selfCorrectionPrompts || []).map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
          <p class="rewrite-text">${student.guidance || ""}</p>
        </article>
      `).join("")}
    </section>
  `;
}

async function loadClassSummary() {
  const selectedClassName = classNameInput.value.trim() || className.value.trim();
  if (!selectedClassName) {
    window.alert("请先输入班级名称。");
    return;
  }
  classSummaryButton.disabled = true;
  classSummaryButton.textContent = "生成中...";
  classSummaryStatus.textContent = "正在汇总班级最近作文记录。";
  try {
    const query = new URLSearchParams({
      className: selectedClassName,
      subject: classSubject.value
    });
    const payload = await api(`/api/gaokao/class-summary?${query.toString()}`, { method: "GET", headers: {} });
    renderClassSummary(payload.summary);
    classSummaryStatus.textContent = "班级讲评建议已生成，可以直接用于讲评课和个性化反馈发放。";
  } catch (error) {
    classSummaryStatus.textContent = error.message || "班级讲评生成失败。";
  } finally {
    classSummaryButton.disabled = false;
    classSummaryButton.textContent = "生成班级讲评建议";
  }
}

subject.addEventListener("change", () => {
  syncExamTypeOptions();
  countLength();
});
essay.addEventListener("input", countLength);
sampleButton.addEventListener("click", fillSample);
submitButton.addEventListener("click", submit);
ocrButton.addEventListener("click", runOcr);
classSummaryButton.addEventListener("click", loadClassSummary);

syncExamTypeOptions();
fillSample();
bootstrap().catch((error) => {
  window.alert(error.message || "初始化失败，请确认服务已启动。");
});
