const GAOKAO_MVP = (() => {
  const currentExamKey = "gaokaobao-current-exam";
  const mockExams = [
    { id: "mock-exam-1", name: "2026年4月月考", date: "2026-04-10", subject: "高二数学", className: "高二(3)班", studentCount: 28, averageScore: 87.5, scoreChange: "-4.2", changeTrend: "down", hotspot: "导数应用" },
    { id: "mock-exam-2", name: "2026年3月周测", date: "2026-03-28", subject: "高二数学", className: "高二(3)班", studentCount: 28, averageScore: 82.3, scoreChange: "+2.5", changeTrend: "up", hotspot: "三角函数" },
    { id: "mock-exam-3", name: "2026年3月联考", date: "2026-03-15", subject: "高二数学", className: "高二(3)班", studentCount: 28, averageScore: 79.8, scoreChange: "-3.1", changeTrend: "down", hotspot: "数列求和" }
  ];
  const mockDashboardFocus = [
    { rank: 1, level: "warn", title: "高二(3)班平均分下滑 4.2 分", copy: "主因集中在解析几何和导数应用，建议先看考试分析页的讲评优先级。" },
    { rank: 2, title: "6 名学生连续两次成绩下滑", copy: "这批学生的问题不是知识点散乱，而是同一个步骤反复出错，优先进入学生跟踪页。" },
    { rank: 3, title: "导数应用已成为本月最高频失分模块", copy: "建议本周统一做一次导数应用专题讲评，再配 3 道回测题。" }
  ];
  const mockClassCompare = [
    { className: "高二(1)班", averageScore: 90.8, change: "+2.1", trend: "up" },
    { className: "高二(2)班", averageScore: 88.9, change: "+0.7", trend: "up" },
    { className: "高二(3)班", averageScore: 87.5, change: "-4.2", trend: "down" }
  ];
  const mockStudentReport = {
    student: { id: "mock-student-1", name: "李同学", className: "高二(3)班", studentNo: "20260318" },
    latestExam: { id: "mock-exam-1", name: "2026年4月月考", date: "2026-04-10", totalScore: 81 },
    stepReached: "第 3 步",
    repeatStatus: "重复出现",
    pathSummary: "这次真正拉低分数的不是“不会求导”，而是在导数应用题里，做完求导后不会继续把条件转成区间判断，所以总卡在第二步。",
    weakPoints: ["导数单调性", "三角函数变形", "数列求和"],
    weakAbilities: ["条件转化", "规范书写", "分类讨论"],
    wrongDetails: [
      { questionNo: "7", knowledgePoint: "导数应用", mainErrorType: "方法问题", teacherFeedback: "导函数求出后不会继续做区间讨论。" },
      { questionNo: "3", knowledgePoint: "三角函数", mainErrorType: "步骤问题", teacherFeedback: "公式方向选错，导致后续变形中断。" }
    ],
    actionList: ["今天先做 3 道导数单调性专项题，只练“列出区间并判断符号”这一步。", "明天做 2 道三角函数变形题，重点练公式入口判断。", "周五回做原卷第 7 题，订正时必须写完整步骤。"],
    focusTasks: ["导数单调性判断专项 3 题：只练区间讨论", "三角函数公式选择专项 2 题：只练变形入口", "中档题规范书写回测 1 次：按步骤分写完整"],
    trackingSummary: "该生连续两次在导数和三角函数模块失分较多，建议本周优先跟进。",
    trend: [
      { examName: "2026年3月联考", date: "2026-03-15", totalScore: 88 },
      { examName: "2026年3月周测", date: "2026-03-28", totalScore: 84 },
      { examName: "2026年4月月考", date: "2026-04-10", totalScore: 81 }
    ],
    conclusion: [
      "这个问题上次考试已经出现过，这次仍然没有完全改善。",
      "建议老师不要再泛泛讲“导数”，而是只盯“区间讨论这一步”。",
      "如果本周 3 道专项题仍错 2 道以上，下周要单独面批。"
    ],
    stepPath: ["识别题型", "求导", "区间讨论", "写结论"],
    progress: [
      { label: "导数应用", status: "连续 2 次出现", trend: "down" },
      { label: "规范书写", status: "比上次略有改善", trend: "up" },
      { label: "三角函数变形", status: "仍需继续跟进", trend: "down" }
    ]
  };
  const mockExamAnalysis = {
    exam: { id: "mock-exam-1", name: "2026年4月月考", date: "2026-04-10", subject: "高二数学", className: "高二(3)班" },
    studentCount: 28,
    averageScore: 87.5,
    topIssues: [
      { label: "方法问题", count: 12 },
      { label: "计算错误", count: 9 },
      { label: "规范书写", count: 7 }
    ],
    lectureSuggestions: [
      "先讲导数应用题第一步的切入方式，再讲第二问分类讨论。",
      "把三角函数公式选择错误当作班级共性问题单独讲 10 分钟。",
      "对重点学生布置 3 道导数应用回测题，第二天收订正。"
    ],
    lecturePriority: [
      { rank: 1, level: "warn", title: "第 7 题导数应用", copy: "错误率最高，而且大多数学生不是不会求导，而是不会把条件继续转成区间判断。讲评时先示范第二步。" },
      { rank: 2, title: "第 2 题三角函数", copy: "班级主要问题不是公式背错，而是看不出题目该先化简还是先求性质，建议从题型识别切入。" },
      { rank: 3, title: "第 4 题数列求和", copy: "这题错误主要集中在公式代入后的计算粗心，讲评时间不必太长，重点提醒易错点。" }
    ],
    errorDistribution: [
      { label: "审题偏差", count: 6 },
      { label: "建模步骤断裂", count: 11 },
      { label: "计算错误", count: 9 },
      { label: "规范书写失分", count: 7 }
    ],
    errorDistributionNote: "本次月考的主矛盾不是单纯知识点不会，而是建模步骤断裂和计算粗心同时存在。",
    questionStats: [
      { questionId: "q7", questionNo: "7", score: 18, knowledgePoint: "导数应用", questionType: "解答题", difficulty: "中高", errorRate: 68, topReason: "方法问题", standardSteps: "求导 -> 解不等式 -> 分区间讨论 -> 写结论", whyWrong: "大多数学生会求导，但不会把题目条件继续转成区间判断。", teachFocus: "课堂上重点示范“求导之后怎么判断符号”这一步。", priority: "高" },
      { questionId: "q2", questionNo: "2", score: 12, knowledgePoint: "三角函数", questionType: "选择题", difficulty: "基础", errorRate: 54, topReason: "步骤问题", standardSteps: "识别结构 -> 选择公式 -> 完成变形 -> 检查范围", whyWrong: "学生看不出这是先化简再求性质的题，第一步方向错。", teachFocus: "先讲题型识别，再讲公式入口，不要只讲答案。", priority: "中" },
      { questionId: "q4", questionNo: "4", score: 12, knowledgePoint: "数列求和", questionType: "填空题", difficulty: "中档", errorRate: 46, topReason: "计算错误", standardSteps: "提取条件 -> 建立公式 -> 代入求和 -> 检查结果", whyWrong: "多数学生到最后一步才错，属于公式会用但结果不稳。", teachFocus: "讲评时带着学生复盘最后两步的计算与检查。", priority: "中" }
    ],
    highRiskStudents: [
      { id: "mock-student-1", name: "李同学", totalScore: 81, tag: "重点跟进 · 导数应用连续失分" },
      { id: "mock-student-2", name: "张同学", totalScore: 79, tag: "重点跟进 · 三角函数方向判断反复出错" },
      { id: "mock-student-3", name: "王同学", totalScore: 77, tag: "重点跟进 · 解析几何建模步骤断裂" },
      { id: "mock-student-4", name: "赵同学", totalScore: 74, tag: "高风险 · 连续三次下滑" },
      { id: "mock-student-5", name: "刘同学", totalScore: 91, tag: "改善中 · 数列模块已明显提升" }
    ],
    scoreDistribution: [
      { range: "60分以下", count: 1, type: "warn" },
      { range: "60-70", count: 2, type: "warn" },
      { range: "70-80", count: 5, type: "" },
      { range: "80-90", count: 12, type: "" },
      { range: "90-100", count: 8, type: "highlight" }
    ],
    scoreDistNote: "全班28人中，90分以上8人（28.6%），80-90分12人（42.9%），70分以下3人需重点跟进。"
  };

  async function api(url, options = {}) {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "请求失败");
    return payload;
  }

  function query(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function setCurrentExamId(examId) {
    if (examId) window.localStorage.setItem(currentExamKey, examId);
  }

  function getCurrentExamId() {
    return query("examId") || window.localStorage.getItem(currentExamKey) || "";
  }

  function dataUrlFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsDataURL(file);
    });
  }

  function fileStem(name) {
    return String(name || "").replace(/\.[^.]+$/, "");
  }

  function navify(currentPage) {
    document.querySelectorAll("[data-nav-page]").forEach((link) => {
      if (link.dataset.navPage === currentPage) {
        link.classList.add("active");
      }
    });
  }

  function enrichExamChanges(exams = []) {
    return exams.map((exam, index) => {
      if (Object.prototype.hasOwnProperty.call(exam, "scoreChange")) return exam;
      const nextOlder = exams[index + 1];
      if (!nextOlder) return { ...exam, scoreChange: "", changeTrend: "" };
      const diff = Number(exam.averageScore || 0) - Number(nextOlder.averageScore || 0);
      return {
        ...exam,
        scoreChange: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}`,
        changeTrend: diff >= 0 ? "up" : "down"
      };
    });
  }

  async function loadExams(select) {
    const payload = await api("/api/exams/list");
    const exams = enrichExamChanges(payload.exams?.length ? payload.exams : mockExams);
    if (!select) return exams;
    select.innerHTML = exams.map((exam) => `
      <option value="${exam.id}">${exam.name} · ${exam.className} · ${exam.date}</option>
    `).join("");
    const currentExamId = getCurrentExamId();
    if (currentExamId) select.value = currentExamId;
    return exams;
  }

  function renderExamList(container, exams = []) {
    if (!container) return;
    if (!exams.length) {
      container.innerHTML = `<div class="empty">还没有考试，请先新建考试。</div>`;
      return;
    }
    container.innerHTML = exams.map((exam) => `
      <article class="item">
        <div class="item-head">
          <div>
            <h3 class="item-title">${exam.name}</h3>
            <p class="item-meta">${exam.subject} · ${exam.className} · ${exam.date}</p>
          </div>
          <div style="text-align:right">
            <strong>${exam.averageScore}</strong>
            ${exam.scoreChange ? `<div class="compare-change ${exam.changeTrend}" style="font-size:13px">${exam.scoreChange}</div>` : ""}
          </div>
        </div>
        <div class="pill-row">
          <span class="pill">学生 ${exam.studentCount} 人</span>
          <span class="pill">均分 ${exam.averageScore}</span>
          <span class="pill warn">⚠️ ${exam.hotspot || "导数应用"}</span>
        </div>
        <div class="actions-row">
          <a class="button-ghost" href="/gaokao/exam-analysis.html?examId=${exam.id}">查看分析</a>
          <a class="button-ghost" href="/gaokao/exam-scores.html?examId=${exam.id}">录入成绩</a>
          <a class="button-ghost" href="/gaokao/exam-upload.html?examId=${exam.id}">继续上传</a>
        </div>
      </article>
    `).join("");
  }

  function renderPriorityList(container, items = []) {
    if (!container) return;
    container.innerHTML = items.map((item) => `
      <article class="priority-item ${item.level || ""}">
        <span class="priority-rank">${item.rank}</span>
        <h3 class="priority-title">${item.title}</h3>
        <p class="priority-copy">${item.copy}</p>
      </article>
    `).join("");
  }

  async function initTeacherDashboard() {
    navify("teacher-dashboard");
    function renderDashboardStats(exams) {
      const usingMock = exams.every((exam) => String(exam.id).startsWith("mock-"));
      const stats = usingMock ? {
        exams: 3,
        students: 28,
        average: "87.5",
        followUp: 6
      } : {
        exams: exams.length,
        students: exams.reduce((sum, exam) => Math.max(sum, Number(exam.studentCount || 0)), 0),
        average: exams.length ? Number(exams[0].averageScore || 0).toFixed(1) : "0.0",
        followUp: Math.max(0, Math.round((Number(exams[0]?.studentCount || 0)) * 0.25))
      };
      document.querySelector("#statExamCount").textContent = String(stats.exams);
      document.querySelector("#statAverage").textContent = String(stats.average);
      document.querySelector("#statStudents").textContent = String(stats.students);
      document.querySelector("#statFollowUp").textContent = String(stats.followUp);
    }

    async function refreshDashboard() {
      const exams = await loadExams();
      renderExamList(document.querySelector("#examList"), exams);
      renderDashboardStats(exams);
    }

    await refreshDashboard();
    renderPriorityList(document.querySelector("#principalFocusList"), mockDashboardFocus);
    document.querySelector("#classCompareList").innerHTML = mockClassCompare.map((item) => `
      <div class="compare-row">
        <strong>${item.className}</strong>
        <span>${item.averageScore}</span>
        <span class="compare-change ${item.trend}">${item.change}</span>
      </div>
    `).join("");

    const seedBtn = document.querySelector("#seedBtn");
    const seedBanner = document.querySelector("#seedBanner");
    if (seedBtn) {
      seedBtn.addEventListener("click", async () => {
        seedBtn.textContent = "正在初始化…";
        seedBtn.disabled = true;
        try {
          await api("/api/demo/seed", { method: "POST", body: "{}" });
          seedBanner.style.display = "block";
          seedBtn.style.display = "none";
          await refreshDashboard();
        } catch (_e) {
          seedBtn.textContent = "初始化失败，重试";
          seedBtn.disabled = false;
        }
      });
    }
  }

  async function initExamNew() {
    navify("exam-new");
    const form = document.querySelector("#examCreateForm");
    const status = document.querySelector("#createStatus");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      status.textContent = "正在创建考试...";
      const created = await api("/api/exams/create", {
        method: "POST",
        body: JSON.stringify({
          name: formData.get("name"),
          date: formData.get("date"),
          subject: formData.get("subject"),
          className: formData.get("className"),
          questionCount: formData.get("questionCount")
        })
      });
      setCurrentExamId(created.exam.id);
      const files = document.querySelector("#answerImages").files;
      if (files.length) {
        const images = await Promise.all(Array.from(files).map(async (file) => ({
          name: file.name,
          dataUrl: await dataUrlFromFile(file)
        })));
        await api("/api/exams/upload-answer", {
          method: "POST",
          body: JSON.stringify({
            examId: created.exam.id,
            images
          })
        });
      }
      status.innerHTML = `考试已创建。
        <a href="/gaokao/exam-scores.html?examId=${created.exam.id}" style="margin-left:8px">▶ 立即录入学生成绩</a>
        <a href="/gaokao/exam-upload.html?examId=${created.exam.id}" style="margin-left:8px">上传答题卡图片</a>`;
    });
  }

  async function initExamScores() {
    const examId = getCurrentExamId();
    const status = document.querySelector("#submitStatus");

    let exam = null;
    let questions = [];
    try {
      const examList = await api("/api/exams/list");
      const exams = enrichExamChanges(examList.exams || []);
      exam = exams.find((e) => e.id === examId);
    } catch (_error) {}

    if (!exam) {
      status.textContent = "找不到考试，请先新建考试。";
      return;
    }

    document.querySelector("#scoresTitle").textContent = `录入成绩 · ${exam.name}`;
    document.querySelector("#examInfoText").textContent = `${exam.subject} · ${exam.className} · ${exam.date}`;
    document.querySelector("#analysisLink").href = `/gaokao/exam-analysis.html?examId=${exam.id}`;

    try {
      const analysis = await api(`/api/exams/${examId}/analysis`);
      questions = analysis.questionStats || [];
    } catch (_error) {
      questions = [1, 2, 3, 4, 5, 6, 7, 8].map((n, i) => ({
        questionNo: String(n),
        score: [12, 12, 12, 12, 18, 18, 18, 16][i],
        knowledgePoint: ["函数与导数", "三角函数", "数列", "概率统计", "立体几何", "解析几何", "导数", "压轴综合"][i]
      }));
    }

    const thead = document.querySelector("#tableHead");
    thead.innerHTML = `<tr>
      <th>姓名</th>
      ${questions.map((q) =>
        `<th>第${q.questionNo}题<br><span style="font-weight:400;color:var(--muted)">(满分${q.score})</span></th>`
      ).join("")}
      <th>合计</th>
    </tr>`;

    let rowCount = 0;
    function addRow(name = "", scores = {}) {
      rowCount += 1;
      const rid = `row-${rowCount}`;
      const tr = document.createElement("tr");
      tr.dataset.rid = rid;
      tr.innerHTML = `
        <td><input type="text" placeholder="学生姓名" value="${name}" class="student-name-input" required></td>
        ${questions.map((q) => {
          const v = scores[q.questionNo] !== undefined ? scores[q.questionNo] : "";
          return `<td><input type="number" min="0" max="${q.score}" step="0.5" value="${v}"
            data-qno="${q.questionNo}" data-max="${q.score}" class="score-input"></td>`;
        }).join("")}
        <td class="total-cell" id="total-${rid}">0</td>
      `;
      document.querySelector("#tableBody").appendChild(tr);

      tr.querySelectorAll(".score-input").forEach((input) => {
        input.addEventListener("input", () => {
          const total = [...tr.querySelectorAll(".score-input")]
            .reduce((sum, el) => sum + (parseFloat(el.value) || 0), 0);
          document.querySelector(`#total-${rid}`).textContent = total.toFixed(1);
        });
      });

      tr.querySelectorAll(".score-input")[0]?.dispatchEvent(new Event("input"));
    }

    ["", "", "", "", ""].forEach(() => addRow());

    document.querySelector("#addRowBtn").addEventListener("click", () => addRow());

    document.querySelector("#submitBtn").addEventListener("click", async () => {
      const rows = [];
      document.querySelectorAll("#tableBody tr").forEach((tr) => {
        const name = tr.querySelector(".student-name-input")?.value?.trim();
        if (!name) return;
        const scores = {};
        tr.querySelectorAll(".score-input").forEach((input) => {
          const v = parseFloat(input.value);
          if (!isNaN(v)) scores[input.dataset.qno] = v;
        });
        rows.push({ name, scores });
      });

      if (!rows.length) {
        status.textContent = "请至少录入一名学生的成绩。";
        return;
      }

      status.textContent = `正在保存 ${rows.length} 名学生的成绩…`;
      document.querySelector("#submitBtn").disabled = true;

      try {
        const result = await api("/api/exams/import-scores", {
          method: "POST",
          body: JSON.stringify({ examId, rows })
        });
        status.innerHTML = `✅ 已保存 ${result.imported} 名学生成绩。
          <a href="/gaokao/exam-analysis.html?examId=${examId}" style="margin-left:12px">查看考试分析 →</a>`;
      } catch (err) {
        status.textContent = `保存失败：${err.message}`;
        document.querySelector("#submitBtn").disabled = false;
      }
    });
  }

  async function initExamUpload() {
    navify("exam-upload");
    const select = document.querySelector("#examSelect");
    const status = document.querySelector("#uploadStatus");
    try {
      const statusRes = await api("/api/ai-status");
      const banner = document.querySelector("#aiStatusBanner");
      if (banner && statusRes) {
        banner.style.display = "block";
        if (statusRes.visionReady) {
          banner.style.background = "#dcfce7";
          banner.style.color = "#15803d";
          banner.textContent = `✅ 真实AI视觉分析已启用（${statusRes.provider}）— 上传图片后将真正读取学生作答内容`;
        } else {
          banner.style.background = "#fff8db";
          banner.style.color = "#8a5a00";
          banner.textContent = "⚠️ 当前使用规则库分析（未配置AI Key）— 建议配置 OPENAI_API_KEY 启用真实视觉分析";
        }
      }
    } catch (_error) {}
    await loadExams(select);
    const currentExamId = getCurrentExamId();
    if (currentExamId) select.value = currentExamId;
    document.querySelector("#uploadForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const examId = select.value;
      if (!examId) {
        status.textContent = "请先选择考试。";
        return;
      }
      setCurrentExamId(examId);
      const files = Array.from(document.querySelector("#cardImages").files || []);
      if (!files.length) {
        status.textContent = "请先选择学生答题卡图片。";
        return;
      }
      status.textContent = "正在上传并生成 mock 分析...";
      const cards = await Promise.all(files.map(async (file, index) => ({
        studentName: fileStem(file.name) || `学生 ${index + 1}`,
        studentNo: `AUTO-${index + 1}`,
        imageDataUrl: await dataUrlFromFile(file)
      })));
      const payload = await api("/api/exams/upload-cards", {
        method: "POST",
        body: JSON.stringify({ examId, cards })
      });
      status.innerHTML = `已处理 ${payload.uploaded} 份答题卡。<a href="/gaokao/exam-analysis.html?examId=${examId}">查看考试分析</a>`;
    });
  }

  async function initExamAnalysis() {
    navify("exam-analysis");
    const examId = getCurrentExamId();
    const status = document.querySelector("#analysisStatus");
    let payload = mockExamAnalysis;
    if (examId && !String(examId).startsWith("mock-")) {
      setCurrentExamId(examId);
      try {
        payload = await api(`/api/exams/${examId}/analysis`);
      } catch (_error) {
        payload = mockExamAnalysis;
      }
    }
    document.querySelector("#analysisTitle").textContent = `${payload.exam.name} · ${payload.exam.className}`;
    document.querySelector("#analysisMeta").textContent = `${payload.exam.subject} · ${payload.exam.date}`;
    document.querySelector("#analysisAverage").textContent = String(payload.averageScore);
    document.querySelector("#analysisStudents").textContent = String(payload.studentCount);
    renderPriorityList(document.querySelector("#lecturePriorityList"), payload.lecturePriority || []);
    const maxCount = Math.max(...(payload.errorDistribution || []).map((i) => i.count), 1);
    document.querySelector("#errorDistribution").innerHTML = `<div class="bar-chart">${
      (payload.errorDistribution || []).map((item) => {
        const pct = Math.round((item.count / maxCount) * 100);
        const isDanger = item.label.includes("断裂") || item.label.includes("审题");
        return `<div class="bar-row">
          <span>${item.label}</span>
          <div class="bar-track"><div class="bar-fill ${isDanger ? "danger" : ""}" style="width:${pct}%"></div></div>
          <span class="bar-count">${item.count}人</span>
        </div>`;
      }).join("")
    }</div>`;
    document.querySelector("#errorDistributionNote").textContent = payload.errorDistributionNote || "";
    document.querySelector("#issueList").innerHTML = payload.topIssues.map((item) => `<li>${item.label} · ${item.count} 次</li>`).join("");
    document.querySelector("#lectureSuggestions").innerHTML = payload.lectureSuggestions.map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#questionStats").innerHTML = payload.questionStats.map((item) => `
      <article class="item">
        <div class="item-head">
          <div>
            <h3 class="item-title">第 ${item.questionNo} 题 · ${item.knowledgePoint}</h3>
            <p class="item-meta">${item.questionType} · ${item.difficulty}</p>
          </div>
          <strong>${item.errorRate}%</strong>
        </div>
        <div class="pill-row">
          <span class="pill">高频错因 ${item.topReason}</span>
          <span class="pill">分值 ${item.score}</span>
          <span class="pill ${item.priority === "高" ? "danger" : ""}">讲评优先级 ${item.priority || "中"}</span>
        </div>
        <p class="item-meta">标准步骤：${item.standardSteps}</p>
        <div class="section-divider"></div>
        <p class="item-meta"><strong>为什么全班会错：</strong>${item.whyWrong || ""}</p>
        <p class="item-meta"><strong>讲评重点：</strong>${item.teachFocus || ""}</p>
      </article>
    `).join("");
    document.querySelector("#highRiskStudents").innerHTML = payload.highRiskStudents.map((item) => {
      const isImproving = item.tag.includes("改善中");
      return `
      <article class="item ${isImproving ? "improving" : ""}">
        <div class="item-head">
          <div>
            <h3 class="item-title">${item.name}</h3>
            <p class="item-meta">${item.tag}</p>
          </div>
          <strong>${item.totalScore}</strong>
        </div>
        <div class="actions-row">
          <a class="button-ghost" href="/gaokao/student-report.html?studentId=${item.id}&examId=${payload.exam.id}">查看报告</a>
          <a class="button-ghost" href="/gaokao/student-track.html?studentId=${item.id}&examId=${payload.exam.id}">查看跟踪</a>
        </div>
      </article>
    `;
    }).join("");
    const distData = payload.scoreDistribution || [];
    if (distData.length) {
      const maxDistCount = Math.max(...distData.map((d) => d.count));
      const chartH = 88;
      document.querySelector("#scoreDistChart").innerHTML = distData.map((item) => {
        const barH = Math.max(4, Math.round((item.count / maxDistCount) * chartH));
        return `<div class="dist-col">
          <span class="dist-count">${item.count}人</span>
          <div class="dist-bar ${item.type}" style="height:${barH}px"></div>
          <span class="dist-label">${item.range}</span>
        </div>`;
      }).join("");
      const noteEl = document.querySelector("#scoreDistNote");
      if (noteEl) noteEl.textContent = payload.scoreDistNote || "";
    }
    status.textContent = "考试分析已生成。当前页面可在无真实数据时展示 mock 演示内容。";
  }

  async function loadStudentReport() {
    const studentId = query("studentId");
    const examId = query("examId") || getCurrentExamId();
    if (!studentId || String(studentId).startsWith("mock-")) return mockStudentReport;
    try {
      return await api(`/api/students/${studentId}/report?examId=${encodeURIComponent(examId || "")}`);
    } catch (_error) {
      return mockStudentReport;
    }
  }

  async function initStudentReport() {
    navify("student-report");
    const payload = await loadStudentReport();
    document.querySelector("#studentTitle").textContent = `${payload.student.name} · 个人报告`;
    document.querySelector("#studentMeta").textContent = `${payload.student.className} · ${payload.latestExam?.name || "暂无考试"}`;
    document.querySelector("#studentScore").textContent = payload.latestExam?.totalScore ?? "--";
    document.querySelector("#stepReached").textContent = payload.stepReached || "--";
    document.querySelector("#repeatStatus").textContent = payload.repeatStatus || "--";
    document.querySelector("#pathSummary").textContent = payload.pathSummary || "";
    document.querySelector("#stepPath").innerHTML = (payload.stepPath || []).map((item, index) => {
      // stepReached 格式是"第 N 步"，提取 N 得到 1-based 步骤序号，转换成 0-based index
      const reachedStr = payload.stepReached || "";
      const reachedNum = parseInt(reachedStr.replace(/[^\d]/g, ""), 10);
      const stuckAt = isNaN(reachedNum) ? 2 : reachedNum - 1; // 转成0-based
      const cls = index < stuckAt ? "done" : index === stuckAt ? "current" : "blocked";
      return `<span class="step-chip ${cls}">${item}</span>`;
    }).join("");
    document.querySelector("#weakPoints").innerHTML = (payload.weakPoints || []).map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#weakAbilities").innerHTML = (payload.weakAbilities || []).map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#actionList").innerHTML = (payload.actionList || []).map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#focusTasks").innerHTML = (payload.focusTasks || []).map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#studentTrendList").innerHTML = (payload.trend || []).map((item, index, arr) => {
      const prev = arr[index - 1]?.totalScore;
      const trendClass = prev == null ? "up" : item.totalScore >= prev ? "up" : "down";
      const trendLabel = prev == null ? "起点" : item.totalScore >= prev ? "有改善" : "仍在下滑";
      return `
        <article class="item">
          <div class="item-head">
            <div>
              <h3 class="item-title">${item.examName}</h3>
              <p class="item-meta">${item.date}</p>
            </div>
            <div>
              <strong>${item.totalScore}</strong>
              <div class="trend-badge ${trendClass}">${trendLabel}</div>
            </div>
          </div>
        </article>
      `;
    }).join("");
    document.querySelector("#reportConclusion").innerHTML = (payload.conclusion || []).map((item) => `<div class="guide-item">${item}</div>`).join("");
    document.querySelector("#wrongDetails").innerHTML = (payload.wrongDetails || []).map((item) => `
      <div class="row">
        <strong>第 ${item.questionNo} 题</strong>
        <div>
          <div>${item.knowledgePoint} · ${item.mainErrorType}</div>
          <div class="meta">${item.teacherFeedback}</div>
        </div>
      </div>
    `).join("");
    document.querySelector("#trackLink").href = `/gaokao/student-track.html?studentId=${payload.student.id}&examId=${payload.latestExam?.id || ""}`;
  }

  async function initStudentTrack() {
    navify("student-track");
    const payload = await loadStudentReport();
    document.querySelector("#trackTitle").textContent = `${payload.student.name} · 一对一跟踪`;
    document.querySelector("#trackSummary").textContent = payload.trackingSummary || "暂无跟踪结论。";
    document.querySelector("#trendList").innerHTML = (payload.trend || []).map((item, index, arr) => {
      const prev = arr[index - 1]?.totalScore;
      const trendClass = prev == null ? "up" : item.totalScore >= prev ? "up" : "down";
      const trendLabel = prev == null ? "起点" : item.totalScore >= prev ? "改善" : "下滑";
      return `
      <article class="item">
        <div class="item-head">
          <div>
            <h3 class="item-title">${item.examName}</h3>
            <p class="item-meta">${item.date}</p>
          </div>
          <div>
            <strong>${item.totalScore}</strong>
            <div class="trend-badge ${trendClass}">${trendLabel}</div>
          </div>
        </div>
      </article>
    `;
    }).join("");
    document.querySelector("#trackWeakPoints").innerHTML = (payload.weakPoints || []).map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#trackTasks").innerHTML = (payload.focusTasks || []).map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#trackProgress").innerHTML = (payload.progress || []).map((item) => `
      <div class="guide-item">
        <strong>${item.label}</strong>
        <div class="mini-note">${item.status}</div>
        <div class="trend-badge ${item.trend}">${item.trend === "up" ? "改善中" : "需继续跟进"}</div>
      </div>
    `).join("");

    const canvas = document.querySelector("#trendChart");
    if (canvas && payload.trend?.length) {
      const ctx = canvas.getContext("2d");
      const scores = payload.trend.map((t) => t.totalScore);
      const min = Math.min(...scores) - 5;
      const max = Math.max(...scores) + 5;
      const W = canvas.width;
      const H = canvas.height;
      const pad = { l: 30, r: 20, t: 16, b: 24 };
      const toX = (i) => pad.l + i * (W - pad.l - pad.r) / Math.max(scores.length - 1, 1);
      const toY = (v) => pad.t + (1 - (v - min) / Math.max(max - min, 1)) * (H - pad.t - pad.b);
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "#e0e7ef";
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75, 1].forEach((r) => {
        const y = pad.t + r * (H - pad.t - pad.b);
        ctx.beginPath();
        ctx.moveTo(pad.l, y);
        ctx.lineTo(W - pad.r, y);
        ctx.stroke();
      });
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      scores.forEach((s, i) => i === 0 ? ctx.moveTo(toX(i), toY(s)) : ctx.lineTo(toX(i), toY(s)));
      ctx.stroke();
      scores.forEach((s, i) => {
        const isDown = i > 0 && s < scores[i - 1];
        ctx.beginPath();
        ctx.arc(toX(i), toY(s), 5, 0, Math.PI * 2);
        ctx.fillStyle = isDown ? "#dc2626" : "#2563eb";
        ctx.fill();
        ctx.fillStyle = "#17324d";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(s, toX(i), toY(s) - 10);
      });
      payload.trend.forEach((t, i) => {
        ctx.fillStyle = "#6b7280";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(t.examName.replace("2026年", ""), toX(i), H - 6);
      });
    }
  }

  async function initStudentHome() {
    const payload = await loadStudentReport();
    document.querySelector("#mobileStudentName").textContent = payload.student.name;
    document.querySelector("#mobileExamName").textContent = payload.latestExam?.name || "暂无考试";
    document.querySelector("#mobileScore").textContent = payload.latestExam?.totalScore ?? "--";
    document.querySelector("#mobileWeakPoints").innerHTML = (payload.weakPoints || []).map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#mobileTrackSummary").textContent = payload.trackingSummary || "暂无跟踪结论。";
    document.querySelector("#taskLink").href = `/gaokao/student-task.html?studentId=${payload.student.id}&examId=${payload.latestExam?.id || ""}`;
  }

  async function initStudentTask() {
    const payload = await loadStudentReport();
    document.querySelector("#taskStudentName").textContent = `${payload.student.name} · 我的训练任务`;
    document.querySelector("#mobileFocusTasks").innerHTML = (payload.focusTasks || []).map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#mobileActionList").innerHTML = (payload.actionList || []).map((item) => `<li>${item}</li>`).join("");
  }

  async function initPage() {
    const page = document.body.dataset.page;
    if (page === "teacher-dashboard") await initTeacherDashboard();
    if (page === "exam-new") await initExamNew();
    if (page === "exam-scores") await initExamScores();
    if (page === "exam-upload") await initExamUpload();
    if (page === "exam-analysis") await initExamAnalysis();
    if (page === "student-report") await initStudentReport();
    if (page === "student-track") await initStudentTrack();
    if (page === "student-home") await initStudentHome();
    if (page === "student-task") await initStudentTask();
  }

  return { initPage };
})();

window.addEventListener("DOMContentLoaded", () => {
  GAOKAO_MVP.initPage().catch((error) => {
    const status = document.querySelector("[data-status]");
    if (status) {
      status.textContent = error.message || "页面初始化失败";
    }
  });
});
