const GAOKAO_MVP = (() => {
  const currentExamKey = "gaokaobao-current-exam";
  const mockExams = [
    { id: "mock-exam-1", name: "2026年4月月考", date: "2026-04-10", subject: "高二数学", className: "高二(3)班", studentCount: 28, averageScore: 87.5, hotspot: "导数应用" },
    { id: "mock-exam-2", name: "2026年3月周测", date: "2026-03-28", subject: "高二数学", className: "高二(3)班", studentCount: 28, averageScore: 82.3, hotspot: "三角函数" },
    { id: "mock-exam-3", name: "2026年3月联考", date: "2026-03-15", subject: "高二数学", className: "高二(3)班", studentCount: 28, averageScore: 79.8, hotspot: "数列求和" }
  ];
  const mockStudentReport = {
    student: { id: "mock-student-1", name: "李同学", className: "高二(3)班", studentNo: "20260318" },
    latestExam: { id: "mock-exam-1", name: "2026年4月月考", date: "2026-04-10", totalScore: 81 },
    weakPoints: ["导数单调性", "三角函数变形", "数列求和"],
    weakAbilities: ["条件转化", "规范书写", "分类讨论"],
    wrongDetails: [
      { questionNo: "7", knowledgePoint: "导数应用", mainErrorType: "方法问题", teacherFeedback: "导函数求出后不会继续做区间讨论。" },
      { questionNo: "3", knowledgePoint: "三角函数", mainErrorType: "步骤问题", teacherFeedback: "公式方向选错，导致后续变形中断。" }
    ],
    actionList: ["先补导数单调性 3 题。", "三角函数变形专项 2 题。", "每次订正必须写完整步骤。"],
    focusTasks: ["导数单调性判断专项", "三角函数公式选择专项", "中档题规范书写回测"],
    trackingSummary: "该生连续两次在导数和三角函数模块失分较多，建议本周优先跟进。",
    trend: [
      { examName: "2026年3月联考", date: "2026-03-15", totalScore: 88 },
      { examName: "2026年3月周测", date: "2026-03-28", totalScore: 84 },
      { examName: "2026年4月月考", date: "2026-04-10", totalScore: 81 }
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
    questionStats: [
      { questionId: "q7", questionNo: "7", score: 18, knowledgePoint: "导数应用", questionType: "解答题", difficulty: "中高", errorRate: 68, topReason: "方法问题", standardSteps: "求导 -> 解不等式 -> 分区间讨论 -> 写结论" },
      { questionId: "q2", questionNo: "2", score: 12, knowledgePoint: "三角函数", questionType: "选择题", difficulty: "基础", errorRate: 54, topReason: "步骤问题", standardSteps: "识别结构 -> 选择公式 -> 完成变形 -> 检查范围" },
      { questionId: "q4", questionNo: "4", score: 12, knowledgePoint: "数列求和", questionType: "填空题", difficulty: "中档", errorRate: 46, topReason: "计算错误", standardSteps: "提取条件 -> 建立公式 -> 代入求和 -> 检查结果" }
    ],
    highRiskStudents: [
      { id: "mock-student-1", name: "李同学", totalScore: 81, tag: "重点跟进" },
      { id: "mock-student-2", name: "张同学", totalScore: 79, tag: "重点跟进" },
      { id: "mock-student-3", name: "王同学", totalScore: 77, tag: "重点跟进" }
    ]
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

  async function loadExams(select) {
    const payload = await api("/api/exams/list");
    const exams = payload.exams?.length ? payload.exams : mockExams;
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
          <strong>${exam.averageScore}</strong>
        </div>
        <div class="pill-row">
          <span class="pill">学生 ${exam.studentCount} 人</span>
          <span class="pill">均分 ${exam.averageScore}</span>
          <span class="pill warn">⚠️ ${exam.hotspot || "导数应用"}</span>
        </div>
        <div class="actions-row">
          <a class="button-ghost" href="/gaokao/exam-analysis.html?examId=${exam.id}">查看分析</a>
          <a class="button-ghost" href="/gaokao/exam-upload.html?examId=${exam.id}">继续上传</a>
        </div>
      </article>
    `).join("");
  }

  async function initTeacherDashboard() {
    navify("teacher-dashboard");
    const exams = await loadExams();
    renderExamList(document.querySelector("#examList"), exams);
    const stats = exams === mockExams ? {
      exams: 3,
      students: 28,
      average: "87.5",
      followUp: 6
    } : {
      exams: exams.length,
      students: exams.reduce((sum, exam) => sum + Number(exam.studentCount || 0), 0),
      average: exams.length ? (exams.reduce((sum, exam) => sum + Number(exam.averageScore || 0), 0) / exams.length).toFixed(1) : "0.0",
      followUp: Math.max(0, Math.round(exams.reduce((sum, exam) => sum + Number(exam.studentCount || 0), 0) * 0.2))
    };
    document.querySelector("#statExamCount").textContent = String(stats.exams);
    document.querySelector("#statAverage").textContent = String(stats.average);
    document.querySelector("#statStudents").textContent = String(stats.students);
    document.querySelector("#statFollowUp").textContent = String(stats.followUp);
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
      status.innerHTML = `考试已创建。<a href="/gaokao/exam-upload.html?examId=${created.exam.id}">继续上传学生答题卡</a>`;
    });
  }

  async function initExamUpload() {
    navify("exam-upload");
    const select = document.querySelector("#examSelect");
    const status = document.querySelector("#uploadStatus");
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
        </div>
        <p class="item-meta">标准步骤：${item.standardSteps}</p>
      </article>
    `).join("");
    document.querySelector("#highRiskStudents").innerHTML = payload.highRiskStudents.map((item) => `
      <article class="item">
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
    `).join("");
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
    document.querySelector("#weakPoints").innerHTML = (payload.weakPoints || []).map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#weakAbilities").innerHTML = (payload.weakAbilities || []).map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#actionList").innerHTML = (payload.actionList || []).map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#focusTasks").innerHTML = (payload.focusTasks || []).map((item) => `<li>${item}</li>`).join("");
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
    document.querySelector("#trendList").innerHTML = (payload.trend || []).map((item) => `
      <article class="item">
        <div class="item-head">
          <div>
            <h3 class="item-title">${item.examName}</h3>
            <p class="item-meta">${item.date}</p>
          </div>
          <strong>${item.totalScore}</strong>
        </div>
      </article>
    `).join("");
    document.querySelector("#trackWeakPoints").innerHTML = (payload.weakPoints || []).map((item) => `<li>${item}</li>`).join("");
    document.querySelector("#trackTasks").innerHTML = (payload.focusTasks || []).map((item) => `<li>${item}</li>`).join("");
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
