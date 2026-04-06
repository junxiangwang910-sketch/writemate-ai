const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const JSON_DB_PATH = path.join(DATA_DIR, "app-data.json");
const SQLITE_DB_PATH = path.join(DATA_DIR, "app-data.sqlite");
const ENV_PATH = path.join(ROOT, ".env");

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return;
  const lines = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const plans = {
  free: { key: "free", price: 0, quota: 3, badge: "Starter", featured: false },
  pro: { key: "pro", price: 19, quota: 50, badge: "Best Seller", featured: true },
  team: { key: "team", price: 79, quota: 300, badge: "For Schools", featured: false }
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function openDatabase() {
  ensureDataDir();
  const db = new DatabaseSync(SQLITE_DB_PATH);

  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS drafts (
      user_id TEXT PRIMARY KEY,
      task TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL DEFAULT '',
      essay TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      plan TEXT NOT NULL,
      name TEXT NOT NULL,
      task TEXT NOT NULL,
      task_label TEXT NOT NULL,
      prompt TEXT NOT NULL,
      essay TEXT NOT NULL,
      overall REAL NOT NULL,
      task_response REAL NOT NULL,
      coherence REAL NOT NULL,
      lexical REAL NOT NULL,
      grammar REAL NOT NULL,
      task_response_feedback TEXT NOT NULL,
      coherence_feedback TEXT NOT NULL,
      lexical_feedback TEXT NOT NULL,
      grammar_feedback TEXT NOT NULL,
      strengths_json TEXT NOT NULL,
      improvements_json TEXT NOT NULL,
      rewrite_suggestion TEXT NOT NULL,
      coach_summary TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  migrateJsonIfNeeded(db);
  ensureMeta(db);
  return db;
}

function ensureMeta(db) {
  const existing = db.prepare("SELECT value FROM app_meta WHERE key = ?").get("simulated_users");
  if (!existing) {
    db.prepare("INSERT INTO app_meta (key, value) VALUES (?, ?)").run("simulated_users", "128");
  }
}

function migrateJsonIfNeeded(db) {
  const existingUsers = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const existingSubs = db.prepare("SELECT COUNT(*) AS count FROM submissions").get().count;
  if ((existingUsers > 0 || existingSubs > 0) || !fs.existsSync(JSON_DB_PATH)) {
    return;
  }

  const raw = JSON.parse(fs.readFileSync(JSON_DB_PATH, "utf8"));
  const insertUser = db.prepare("INSERT OR IGNORE INTO users (id, name, email, plan, created_at) VALUES (?, ?, ?, ?, ?)");
  const insertDraft = db.prepare("INSERT OR REPLACE INTO drafts (user_id, task, name, prompt, essay, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
  const insertSubmission = db.prepare(`
    INSERT OR IGNORE INTO submissions (
      id, user_id, timestamp, plan, name, task, task_label, prompt, essay, overall,
      task_response, coherence, lexical, grammar, task_response_feedback, coherence_feedback,
      lexical_feedback, grammar_feedback, strengths_json, improvements_json, rewrite_suggestion, coach_summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    (raw.users || []).forEach((user) => {
      insertUser.run(user.id, user.name || "Guest", user.email || "", user.plan || "free", user.createdAt || new Date().toISOString());
    });

    Object.entries(raw.drafts || {}).forEach(([userId, draft]) => {
      insertDraft.run(userId, draft.task || "task2", draft.name || "", draft.prompt || "", draft.essay || "", new Date().toISOString());
    });

    (raw.submissions || []).forEach((item) => {
      insertSubmission.run(
        item.id,
        item.userId,
        item.timestamp,
        item.plan || "free",
        item.name || "Anonymous Candidate",
        item.task || "task2",
        item.taskLabel || "Task 2",
        item.prompt || "",
        item.essay || "",
        Number(item.overall || 0),
        Number(item.taskResponse || 0),
        Number(item.coherence || 0),
        Number(item.lexical || 0),
        Number(item.grammar || 0),
        item.taskResponseFeedback || "",
        item.coherenceFeedback || "",
        item.lexicalFeedback || "",
        item.grammarFeedback || "",
        JSON.stringify(item.strengths || []),
        JSON.stringify(item.improvements || []),
        item.rewriteSuggestion || "",
        item.coachSummary || ""
      );
    });

    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)").run(
      "simulated_users",
      String(raw.simulatedUsers || 128)
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

const db = openDatabase();

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (_error) {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
}

function getWords(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function countParagraphs(text) {
  return text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean).length;
}

function countLongSentences(text) {
  return text.split(/[.!?]+/).map((sentence) => getWords(sentence).length).filter((length) => length >= 28).length;
}

function countConnectors(text) {
  const connectors = [
    "however", "therefore", "moreover", "furthermore", "in addition", "for example",
    "for instance", "on the one hand", "on the other hand", "in conclusion", "overall",
    "because", "although", "while", "thus", "consequently", "meanwhile", "besides"
  ];
  const lower = text.toLowerCase();
  return connectors.reduce((sum, phrase) => sum + (lower.includes(phrase) ? 1 : 0), 0);
}

function promptCoverage(prompt, essay) {
  const promptWords = Array.from(new Set(
    prompt.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((word) => word.length > 4)
  ));
  if (!promptWords.length) return 80;
  const essayLower = essay.toLowerCase();
  const matches = promptWords.filter((word) => essayLower.includes(word)).length;
  return Math.round((matches / promptWords.length) * 100);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function band(value) {
  return Math.round(value * 2) / 2;
}

function createGuestUser() {
  const user = {
    id: randomUUID(),
    name: "Guest",
    email: "",
    plan: "free",
    createdAt: new Date().toISOString()
  };
  db.prepare("INSERT INTO users (id, name, email, plan, created_at) VALUES (?, ?, ?, ?, ?)").run(
    user.id,
    user.name,
    user.email,
    user.plan,
    user.createdAt
  );
  return user;
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    plan: row.plan,
    createdAt: row.created_at
  };
}

function mapSubmission(row) {
  return {
    id: row.id,
    userId: row.user_id,
    timestamp: row.timestamp,
    plan: row.plan,
    name: row.name,
    task: row.task,
    taskLabel: row.task_label,
    prompt: row.prompt,
    essay: row.essay,
    overall: row.overall,
    taskResponse: row.task_response,
    coherence: row.coherence,
    lexical: row.lexical,
    grammar: row.grammar,
    taskResponseFeedback: row.task_response_feedback,
    coherenceFeedback: row.coherence_feedback,
    lexicalFeedback: row.lexical_feedback,
    grammarFeedback: row.grammar_feedback,
    strengths: JSON.parse(row.strengths_json),
    improvements: JSON.parse(row.improvements_json),
    rewriteSuggestion: row.rewrite_suggestion,
    coachSummary: row.coach_summary
  };
}

function getOrCreateUser(userId) {
  const existing = userId ? db.prepare("SELECT * FROM users WHERE id = ?").get(userId) : null;
  return mapUser(existing) || createGuestUser();
}

function saveUser(user) {
  db.prepare("INSERT OR REPLACE INTO users (id, name, email, plan, created_at) VALUES (?, ?, ?, ?, ?)").run(
    user.id,
    user.name,
    user.email,
    user.plan,
    user.createdAt
  );
}

function saveDraft(userId, draft) {
  db.prepare("INSERT OR REPLACE INTO drafts (user_id, task, name, prompt, essay, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    userId,
    draft.task,
    draft.name || "",
    draft.prompt || "",
    draft.essay || "",
    new Date().toISOString()
  );
}

function getDraft(userId) {
  const row = db.prepare("SELECT * FROM drafts WHERE user_id = ?").get(userId);
  if (!row) return null;
  return {
    task: row.task,
    name: row.name,
    prompt: row.prompt,
    essay: row.essay
  };
}

function getUserHistory(userId) {
  const rows = db.prepare("SELECT * FROM submissions WHERE user_id = ? ORDER BY timestamp ASC").all(userId);
  return rows.map(mapSubmission);
}

function clearUserHistory(userId) {
  db.prepare("DELETE FROM submissions WHERE user_id = ?").run(userId);
}

function insertSubmission(record) {
  db.prepare(`
    INSERT INTO submissions (
      id, user_id, timestamp, plan, name, task, task_label, prompt, essay, overall,
      task_response, coherence, lexical, grammar, task_response_feedback, coherence_feedback,
      lexical_feedback, grammar_feedback, strengths_json, improvements_json, rewrite_suggestion, coach_summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.userId,
    record.timestamp,
    record.plan,
    record.name,
    record.task,
    record.taskLabel,
    record.prompt,
    record.essay,
    record.overall,
    record.taskResponse,
    record.coherence,
    record.lexical,
    record.grammar,
    record.taskResponseFeedback,
    record.coherenceFeedback,
    record.lexicalFeedback,
    record.grammarFeedback,
    JSON.stringify(record.strengths),
    JSON.stringify(record.improvements),
    record.rewriteSuggestion,
    record.coachSummary
  );
}

function simulatedUsers() {
  return Number(db.prepare("SELECT value FROM app_meta WHERE key = ?").get("simulated_users")?.value || "128");
}

function incrementSimulatedUsers() {
  db.prepare("UPDATE app_meta SET value = ? WHERE key = ?").run(String(simulatedUsers() + 1), "simulated_users");
}

function adminStats() {
  const totalReports = Number(db.prepare("SELECT COUNT(*) AS count FROM submissions").get().count);
  const totalUsers = Number(db.prepare("SELECT COUNT(*) AS count FROM users").get().count);
  const paidUsers = Number(db.prepare("SELECT COUNT(*) AS count FROM users WHERE plan != 'free'").get().count);
  const avgBand = db.prepare("SELECT AVG(overall) AS avg FROM submissions").get().avg || 7.1;
  const topPlan = db.prepare(`
    SELECT plan, COUNT(*) AS count
    FROM users
    GROUP BY plan
    ORDER BY count DESC, plan ASC
    LIMIT 1
  `).get()?.plan || "free";

  return {
    totalReports,
    totalUsers: Math.max(totalUsers, simulatedUsers()),
    avgBand,
    paidConversion: Math.max(12, Math.round((paidUsers / Math.max(totalUsers, 1)) * 100)),
    topPlan
  };
}

function heuristicReport({ task, candidateName, prompt, essay, lang }) {
  const words = getWords(essay);
  const wordTotal = words.length;
  const connectorCount = countConnectors(essay);
  const paragraphCount = countParagraphs(essay);
  const longSentenceCount = countLongSentences(essay);
  const coverage = promptCoverage(prompt, essay);
  const minWords = task === "task1" ? 150 : 250;

  let taskResponse = 5 + (wordTotal >= minWords ? 1.2 : 0) + (coverage >= 65 ? 0.9 : coverage >= 45 ? 0.4 : 0);
  let coherence = 5 + (connectorCount >= 5 ? 1.1 : connectorCount >= 3 ? 0.7 : 0.2) + (paragraphCount >= 4 ? 0.9 : paragraphCount >= 3 ? 0.5 : 0);
  let lexical = 5 + (wordTotal >= minWords + 30 ? 1.0 : 0.5);
  let grammar = 5 + (longSentenceCount <= 2 ? 1.1 : longSentenceCount <= 4 ? 0.6 : 0.2);

  taskResponse = band(clamp(taskResponse, 4.5, 8.5));
  coherence = band(clamp(coherence, 4.5, 8.5));
  lexical = band(clamp(lexical, 4.5, 8.0));
  grammar = band(clamp(grammar, 4.5, 8.0));

  const overall = band((taskResponse + coherence + lexical + grammar) / 4);
  const taskLabel = task === "task1" ? "Task 1" : "Task 2";

  if (lang === "zh") {
    return {
      name: candidateName || "匿名考生",
      task,
      taskLabel,
      prompt,
      essay,
      overall,
      taskResponse,
      coherence,
      lexical,
      grammar,
      taskResponseFeedback: "整体能够回应题目，但可以把论点展开得更具体。",
      coherenceFeedback: "段落结构基本清楚，连接方式较自然。",
      lexicalFeedback: "词汇达到中上水平，但还可以增加同义替换。",
      grammarFeedback: "句式有变化，需继续提升复杂句的准确性。",
      strengths: [
        `文章约 ${wordTotal} 词，基础篇幅达标。`,
        `检测到 ${paragraphCount} 个段落，结构相对完整。`,
        `使用了约 ${connectorCount} 个明显衔接词，连贯性较好。`
      ],
      improvements: [
        `题目关键词覆盖率约 ${coverage}%，建议更直接回应题目要求。`,
        "部分长句仍可拆分，以减少语法负担。",
        "论证可以增加更具体的例子与解释。"
      ],
      rewriteSuggestion: "建议把一条过长句拆成两句，并将抽象表达替换成更具体的论证细节。",
      coachSummary: `这篇 ${taskLabel} 已有约 ${overall.toFixed(1)} 分基础。下一步优先加强题目回应的直接性、例子细节和复杂句准确率。`
    };
  }

  return {
    name: candidateName || "Anonymous Candidate",
    task,
    taskLabel,
    prompt,
    essay,
    overall,
    taskResponse,
    coherence,
    lexical,
    grammar,
    taskResponseFeedback: "The task is addressed reasonably well, but ideas can be developed more directly.",
    coherenceFeedback: "Paragraphing is clear and transitions are generally natural.",
    lexicalFeedback: "Vocabulary is adequate to strong, though more paraphrasing would help.",
    grammarFeedback: "Sentence variety is present, but complex sentence accuracy can still improve.",
    strengths: [
      `The essay reaches about ${wordTotal} words and broadly meets the expected length.`,
      `${paragraphCount} paragraphs were detected, giving the response a workable structure.`,
      `About ${connectorCount} clear linking devices support cohesion.`
    ],
    improvements: [
      `Prompt keyword coverage is about ${coverage}%, so the response could address the task more directly.`,
      "Some long sentences should be split for better accuracy.",
      "Examples and support could be more specific."
    ],
    rewriteSuggestion: "Split an overly long sentence into two parts and replace abstract wording with more concrete support.",
    coachSummary: `This ${taskLabel} response already shows a foundation around band ${overall.toFixed(1)}. The next step is to sharpen task response, specificity, and accuracy in complex sentences.`
  };
}

async function openAiReport({ task, candidateName, prompt, essay, lang }) {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: [
      "overall", "taskResponse", "coherence", "lexical", "grammar",
      "taskResponseFeedback", "coherenceFeedback", "lexicalFeedback", "grammarFeedback",
      "strengths", "improvements", "rewriteSuggestion", "coachSummary"
    ],
    properties: {
      overall: { type: "number", minimum: 0, maximum: 9 },
      taskResponse: { type: "number", minimum: 0, maximum: 9 },
      coherence: { type: "number", minimum: 0, maximum: 9 },
      lexical: { type: "number", minimum: 0, maximum: 9 },
      grammar: { type: "number", minimum: 0, maximum: 9 },
      taskResponseFeedback: { type: "string" },
      coherenceFeedback: { type: "string" },
      lexicalFeedback: { type: "string" },
      grammarFeedback: { type: "string" },
      strengths: { type: "array", items: { type: "string" } },
      improvements: { type: "array", items: { type: "string" } },
      rewriteSuggestion: { type: "string" },
      coachSummary: { type: "string" }
    }
  };

  const instructions = lang === "zh"
    ? "你是一位专业的 IELTS Writing examiner。请根据考生作文给出接近雅思评分标准的分数和反馈。输出语言全部使用简体中文。分数允许使用 0.5。反馈要具体、可操作、适合商业产品展示。"
    : "You are a professional IELTS Writing examiner. Score the essay using IELTS-style logic and return concise, practical feedback in English. Scores may use 0.5 increments and should feel product-ready.";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: `${instructions} Return JSON that matches the provided schema.`
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Task type: ${task}`,
                `Candidate: ${candidateName || "Anonymous"}`,
                `Prompt: ${prompt}`,
                "Essay:",
                essay
              ].join("\n")
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ielts_report",
          strict: true,
          schema
        }
      }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "OpenAI request failed");
  }

  const parsed = JSON.parse(payload.output_text);
  return {
    name: candidateName || (lang === "zh" ? "匿名考生" : "Anonymous Candidate"),
    task,
    taskLabel: task === "task1" ? "Task 1" : "Task 2",
    prompt,
    essay,
    overall: band(Number(parsed.overall)),
    taskResponse: band(Number(parsed.taskResponse)),
    coherence: band(Number(parsed.coherence)),
    lexical: band(Number(parsed.lexical)),
    grammar: band(Number(parsed.grammar)),
    taskResponseFeedback: parsed.taskResponseFeedback,
    coherenceFeedback: parsed.coherenceFeedback,
    lexicalFeedback: parsed.lexicalFeedback,
    grammarFeedback: parsed.grammarFeedback,
    strengths: parsed.strengths.slice(0, 3),
    improvements: parsed.improvements.slice(0, 3),
    rewriteSuggestion: parsed.rewriteSuggestion,
    coachSummary: parsed.coachSummary
  };
}

async function gradeEssay(body, user) {
  const history = getUserHistory(user.id);
  const plan = plans[user.plan] || plans.free;
  if (history.length >= plan.quota) {
    throw new Error("QUOTA_EXCEEDED");
  }

  const provider = OPENAI_API_KEY ? "openai" : "demo";
  const report = OPENAI_API_KEY
    ? await openAiReport(body)
    : heuristicReport(body);

  const record = {
    id: randomUUID(),
    userId: user.id,
    timestamp: new Date().toLocaleString(),
    plan: user.plan,
    ...report
  };

  insertSubmission(record);
  return {
    provider,
    report: record,
    history: getUserHistory(user.id),
    admin: adminStats()
  };
}

function serveStatic(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const filePath = pathname === "/" ? path.join(ROOT, "index.html") : path.join(ROOT, pathname);

  if (!filePath.startsWith(ROOT)) {
    json(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      json(res, 404, { error: "Not found" });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain; charset=utf-8" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true, storage: "sqlite", provider: OPENAI_API_KEY ? "openai" : "demo" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/bootstrap") {
      const user = getOrCreateUser(url.searchParams.get("userId"));
      json(res, 200, {
        provider: OPENAI_API_KEY ? "openai" : "demo",
        user,
        plans,
        history: getUserHistory(user.id),
        draft: getDraft(user.id) || {
          task: "task2",
          name: user.name === "Guest" ? "" : user.name,
          prompt: "请粘贴 IELTS Writing 题目",
          essay: ""
        },
        admin: adminStats()
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/demo-login") {
      const body = await parseBody(req);
      const user = getOrCreateUser(body.userId);
      user.name = body.name || user.name;
      user.email = body.email || user.email;
      user.plan = body.plan || user.plan;
      saveUser(user);
      incrementSimulatedUsers();
      json(res, 200, { user, admin: adminStats() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/plan") {
      const body = await parseBody(req);
      const user = getOrCreateUser(body.userId);
      if (!plans[body.plan]) {
        json(res, 400, { error: "Invalid plan" });
        return;
      }
      user.plan = body.plan;
      saveUser(user);
      json(res, 200, { user });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/draft") {
      const body = await parseBody(req);
      const user = getOrCreateUser(body.userId);
      const draft = {
        task: body.task || "task2",
        name: body.name || "",
        prompt: body.prompt || "",
        essay: body.essay || ""
      };
      saveDraft(user.id, draft);
      json(res, 200, { draft });
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/api/history") {
      const user = getOrCreateUser(url.searchParams.get("userId"));
      clearUserHistory(user.id);
      json(res, 200, { history: [], admin: adminStats() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/grade") {
      const body = await parseBody(req);
      const user = getOrCreateUser(body.userId);
      const result = await gradeEssay({
        task: body.task,
        candidateName: body.candidateName,
        prompt: body.prompt,
        essay: body.essay,
        lang: body.lang || "zh"
      }, user);
      json(res, 200, result);
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    json(res, error.message === "QUOTA_EXCEEDED" ? 403 : 500, { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`WriteMate AI server running at http://${HOST}:${PORT}`);
  console.log(`Provider mode: ${OPENAI_API_KEY ? `OpenAI (${OPENAI_MODEL})` : "demo fallback"}`);
  console.log(`Storage mode: SQLite at ${SQLITE_DB_PATH}`);
});
