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
const AI_PROVIDER = (process.env.AI_PROVIDER || "auto").toLowerCase();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const OCR_PROVIDER = (process.env.OCR_PROVIDER || "auto").toLowerCase();
const BAIDU_OCR_API_KEY = process.env.BAIDU_OCR_API_KEY || "";
const BAIDU_OCR_SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY || "";
const BAIDU_OCR_ENDPOINT = process.env.BAIDU_OCR_ENDPOINT || "general_basic";
const ACTIVATION_CODES = process.env.ACTIVATION_CODES || "";

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
    CREATE TABLE IF NOT EXISTS shenlun_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      question_type TEXT NOT NULL,
      question_label TEXT NOT NULL,
      max_score INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      material TEXT NOT NULL,
      answer TEXT NOT NULL,
      scaled_score INTEGER NOT NULL,
      percent_score INTEGER NOT NULL,
      dimensions_json TEXT NOT NULL,
      strengths_json TEXT NOT NULL,
      weaknesses_json TEXT NOT NULL,
      missing_points_json TEXT NOT NULL,
      rewrite TEXT NOT NULL,
      provider TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS shenlun_rubrics (
      question_type TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      dimensions_json TEXT NOT NULL,
      focus_points_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activation_codes (
      code TEXT PRIMARY KEY,
      plan TEXT NOT NULL DEFAULT 'pro',
      note TEXT NOT NULL DEFAULT '',
      redeemed_by TEXT DEFAULT NULL,
      redeemed_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge_snippets (
      id TEXT PRIMARY KEY,
      product TEXT NOT NULL,
      scenario TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS user_learning_profiles (
      user_id TEXT NOT NULL,
      product TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(user_id, product),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  migrateJsonIfNeeded(db);
  ensureMeta(db);
  seedShenlunRubrics(db);
  seedActivationCodes(db);
  seedKnowledgeSnippets(db);
  return db;
}

function ensureMeta(db) {
  const existing = db.prepare("SELECT value FROM app_meta WHERE key = ?").get("simulated_users");
  if (!existing) {
    db.prepare("INSERT INTO app_meta (key, value) VALUES (?, ?)").run("simulated_users", "128");
  }
}

function seedShenlunRubrics(db) {
  const rubrics = [
    {
      questionType: "summary",
      label: "归纳概括",
      dimensions: ["审题准确", "要点覆盖", "材料提炼", "条理分层", "语言凝练", "字数控制"],
      focusPoints: ["概括对象", "问题表现", "原因归纳", "材料原词", "分层表达"]
    },
    {
      questionType: "solution",
      label: "提出对策",
      dimensions: ["问题对应", "措施可行", "主体明确", "逻辑结构", "语言规范", "材料依据"],
      focusPoints: ["问题对应", "主体责任", "可操作措施", "长效机制", "群众反馈"]
    },
    {
      questionType: "analysis",
      label: "综合分析",
      dimensions: ["观点明确", "原因分析", "影响分析", "辩证表达", "材料联系", "结论回扣"],
      focusPoints: ["观点表态", "原因分析", "影响分析", "辩证表达", "结论回扣"]
    },
    {
      questionType: "official",
      label: "贯彻执行",
      dimensions: ["文种格式", "对象意识", "任务目标", "措施安排", "语言场景", "号召总结"],
      focusPoints: ["发文对象", "格式规范", "工作目标", "具体措施", "号召总结"]
    },
    {
      questionType: "essay",
      label: "申论大作文",
      dimensions: ["中心论点", "分论点", "论证深度", "材料联系", "政策高度", "语言表达"],
      focusPoints: ["中心论点", "分论点", "材料联系", "政策高度", "结尾升华"]
    },
    {
      questionType: "interview",
      label: "公务员面试",
      dimensions: ["内容契合", "表达流畅", "语言自然", "声音状态", "表情仪态", "临场感"],
      focusPoints: ["审题回应", "观点结构", "自然表达", "声音底气", "表情管理", "岗位匹配"]
    }
  ];
  const stmt = db.prepare("INSERT OR IGNORE INTO shenlun_rubrics (question_type, label, dimensions_json, focus_points_json) VALUES (?, ?, ?, ?)");
  rubrics.forEach((rubric) => {
    stmt.run(rubric.questionType, rubric.label, JSON.stringify(rubric.dimensions), JSON.stringify(rubric.focusPoints));
  });
}

function seedActivationCodes(db) {
  const codes = [];
  ACTIVATION_CODES.split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
    .forEach((code, index) => codes.push([code, "pro", `环境变量激活码 ${index + 1}`]));
  if (!codes.length) return;
  const stmt = db.prepare("INSERT OR IGNORE INTO activation_codes (code, plan, note, created_at) VALUES (?, ?, ?, ?)");
  codes.forEach(([code, plan, note]) => {
    stmt.run(code, plan, note, new Date().toISOString());
  });
}

function seedKnowledgeSnippets(db) {
  const snippets = [
    {
      id: "shenlun-essay-balance",
      product: "shenlun",
      scenario: "essay",
      title: "大作文常见高分写法",
      content: "大作文更看重中心论点是否抓住材料深层张力，分论点之间是否有递进或并列关系，材料细节能否被提炼成治理原则，而不是简单罗列案例。",
      tags: ["大作文", "张力", "立意", "材料转化"]
    },
    {
      id: "shenlun-essay-penalty",
      product: "shenlun",
      scenario: "essay",
      title: "大作文常见扣分点",
      content: "常见扣分点包括：只写套话口号、材料使用弱、分论点重复、口语化明显、只讲提升治理能力却不分析矛盾关系。",
      tags: ["大作文", "扣分点", "套话", "口语化"]
    },
    {
      id: "shenlun-summary-compact",
      product: "shenlun",
      scenario: "summary",
      title: "归纳概括优先级",
      content: "归纳概括题要优先抓对象、问题、原因、措施和结果，尽量贴近材料原词，分层表达，避免加入过多主观发挥。",
      tags: ["归纳概括", "对象", "原因", "措施"]
    },
    {
      id: "shenlun-interview-natural",
      product: "shenlun",
      scenario: "interview",
      title: "面试高分关键",
      content: "公务员面试看内容，也看自然表达、交流感、声音底气和岗位匹配。高分回答通常结构清楚、回应具体、语速稳定，不像背稿。",
      tags: ["面试", "自然表达", "声音", "岗位匹配"]
    },
    {
      id: "shenlun-interview-followup",
      product: "shenlun",
      scenario: "interview",
      title: "追问应对",
      content: "遇到追问时，不要重复第一轮答案，应该补场景、补步骤、补边界，体现规则意识、沟通能力和解决问题能力。",
      tags: ["面试", "追问", "规则意识", "沟通"]
    }
  ];
  const stmt = db.prepare("INSERT OR IGNORE INTO knowledge_snippets (id, product, scenario, title, content, tags_json) VALUES (?, ?, ?, ?, ?, ?)");
  snippets.forEach((item) => {
    stmt.run(item.id, item.product, item.scenario, item.title, item.content, JSON.stringify(item.tags));
  });
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

function textProvider() {
  if (AI_PROVIDER === "deepseek") return DEEPSEEK_API_KEY ? "deepseek" : (OPENAI_API_KEY ? "openai" : "demo");
  if (AI_PROVIDER === "openai") return OPENAI_API_KEY ? "openai" : (DEEPSEEK_API_KEY ? "deepseek" : "demo");
  if (DEEPSEEK_API_KEY) return "deepseek";
  if (OPENAI_API_KEY) return "openai";
  return "demo";
}

function imageOcrProvider() {
  if (OCR_PROVIDER === "baidu") return BAIDU_OCR_API_KEY && BAIDU_OCR_SECRET_KEY ? "baidu" : (OPENAI_API_KEY ? "openai" : "none");
  if (OCR_PROVIDER === "openai") return OPENAI_API_KEY ? "openai" : (BAIDU_OCR_API_KEY && BAIDU_OCR_SECRET_KEY ? "baidu" : "none");
  if (BAIDU_OCR_API_KEY && BAIDU_OCR_SECRET_KEY) return "baidu";
  if (OPENAI_API_KEY) return "openai";
  return "none";
}

function safeJsonParse(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("EMPTY_MODEL_RESPONSE");
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw error;
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 8_000_000) {
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

function redeemActivationCode(userId, rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) {
    throw new Error("ACTIVATION_CODE_REQUIRED");
  }
  const row = db.prepare("SELECT * FROM activation_codes WHERE code = ?").get(code);
  if (!row) {
    throw new Error("ACTIVATION_CODE_INVALID");
  }
  if (row.redeemed_by) {
    throw new Error("ACTIVATION_CODE_USED");
  }
  const plan = plans[row.plan] ? row.plan : "pro";
  const redeemedAt = new Date().toISOString();
  db.prepare("UPDATE activation_codes SET redeemed_by = ?, redeemed_at = ? WHERE code = ?").run(userId, redeemedAt, code);
  db.prepare("UPDATE users SET plan = ? WHERE id = ?").run(plan, userId);
  return { code, plan, redeemedAt };
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

function getShenlunRubric(questionType) {
  const row = db.prepare("SELECT * FROM shenlun_rubrics WHERE question_type = ?").get(questionType);
  if (!row) {
    return {
      questionType: "summary",
      label: "归纳概括",
      dimensions: ["审题准确", "要点覆盖", "材料提炼", "条理分层", "语言凝练", "字数控制"],
      focusPoints: ["概括对象", "问题表现", "原因归纳", "材料原词", "分层表达"]
    };
  }
  return {
    questionType: row.question_type,
    label: row.label,
    dimensions: JSON.parse(row.dimensions_json),
    focusPoints: JSON.parse(row.focus_points_json)
  };
}

function mapShenlunReport(row) {
  return {
    id: row.id,
    userId: row.user_id,
    timestamp: row.timestamp,
    type: row.question_type,
    questionLabel: row.question_label,
    targetMax: row.max_score,
    prompt: row.prompt,
    material: row.material,
    answer: row.answer,
    scaledScore: row.scaled_score,
    percentScore: row.percent_score,
    dimensions: JSON.parse(row.dimensions_json),
    strengths: JSON.parse(row.strengths_json),
    weaknesses: JSON.parse(row.weaknesses_json),
    missing: JSON.parse(row.missing_points_json),
    rewrite: row.rewrite,
    provider: row.provider
  };
}

function getShenlunHistory(userId) {
  return db.prepare("SELECT * FROM shenlun_reports WHERE user_id = ? ORDER BY timestamp ASC").all(userId).map(mapShenlunReport);
}

function getLearningProfile(userId, product) {
  const row = db.prepare("SELECT * FROM user_learning_profiles WHERE user_id = ? AND product = ?").get(userId, product);
  if (!row) return null;
  return {
    userId,
    product,
    updatedAt: row.updated_at,
    ...JSON.parse(row.summary_json)
  };
}

function saveLearningProfile(userId, product, summary) {
  db.prepare(`
    INSERT OR REPLACE INTO user_learning_profiles (user_id, product, summary_json, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, product, JSON.stringify(summary), new Date().toISOString());
}

function rankTags(items = [], limit = 6) {
  const counts = new Map();
  items.flat().filter(Boolean).forEach((item) => {
    const key = String(item).trim();
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function buildShenlunLearningProfile(userId) {
  const history = getShenlunHistory(userId);
  if (!history.length) {
    return {
      totalReports: 0,
      averagePercent: 0,
      recentTrend: "暂无训练记录",
      strongestAreas: [],
      weakestAreas: [],
      recurringIssues: [],
      focusTags: [],
      nextActions: ["先完成 1 次批改，再开始建立个人训练档案。"]
    };
  }

  const recent = history.slice(-8);
  const typeCounts = rankTags(recent.map((item) => [item.questionLabel]), 4);
  const dimensionBuckets = new Map();
  recent.forEach((report) => {
    (report.dimensions || []).forEach((dimension) => {
      if (!dimensionBuckets.has(dimension.label)) dimensionBuckets.set(dimension.label, []);
      dimensionBuckets.get(dimension.label).push(Number(dimension.score || 0));
    });
  });
  const dimensionAverages = Array.from(dimensionBuckets.entries()).map(([label, scores]) => ({
    label,
    score: Math.round(scores.reduce((sum, value) => sum + value, 0) / Math.max(scores.length, 1))
  }));
  const strongestAreas = dimensionAverages.slice().sort((a, b) => b.score - a.score).slice(0, 3);
  const weakestAreas = dimensionAverages.slice().sort((a, b) => a.score - b.score).slice(0, 3);
  const recurringIssues = rankTags(recent.map((item) => item.weaknesses || []), 5);
  const focusTags = rankTags([
    ...recent.map((item) => item.missing || []),
    ...weakestAreas.map((item) => item.label),
    ...typeCounts.map((item) => item.label)
  ], 6).map((item) => item.label);
  const recentScores = recent.map((item) => Number(item.percentScore || 0));
  const firstAvg = recentScores.slice(0, Math.max(1, Math.floor(recentScores.length / 2))).reduce((sum, value) => sum + value, 0) / Math.max(1, Math.floor(recentScores.length / 2));
  const secondChunk = recentScores.slice(Math.max(1, Math.floor(recentScores.length / 2)));
  const secondAvg = secondChunk.reduce((sum, value) => sum + value, 0) / Math.max(secondChunk.length, 1);
  const diff = Math.round(secondAvg - firstAvg);
  const recentTrend = diff >= 4 ? "近期有明显提升" : diff <= -4 ? "近期波动偏大，需要重新稳住" : "整体稳定，建议继续针对弱项补齐";

  return {
    totalReports: history.length,
    averagePercent: Math.round(history.reduce((sum, item) => sum + Number(item.percentScore || 0), 0) / history.length),
    recentTrend,
    strongestAreas,
    weakestAreas,
    recurringIssues: recurringIssues.map((item) => item.label),
    focusTags,
    nextActions: [
      weakestAreas[0] ? `下一次优先补 ${weakestAreas[0].label}。` : "继续保持当前训练节奏。",
      typeCounts[0] ? `最近高频练习的是${typeCounts[0].label}，建议搭配另一类题型交叉训练。` : "建议补足不同题型的训练样本。",
      recurringIssues[0] ? `你最常被指出的问题是“${recurringIssues[0].label}”，下一次作答前先针对它列提纲。` : "建议训练前先列结构和材料要点。"
    ]
  };
}

function getKnowledgeSnippets(product, scenario, queryText = "") {
  const rows = db.prepare("SELECT * FROM knowledge_snippets WHERE product = ? AND scenario = ?").all(product, scenario);
  const query = String(queryText || "");
  return rows
    .map((row) => {
      const tags = JSON.parse(row.tags_json || "[]");
      const score = tags.reduce((sum, tag) => sum + (query.includes(tag) ? 2 : 0), 0) + (query.includes(row.title) ? 1 : 0);
      return {
        title: row.title,
        content: row.content,
        tags,
        score
      };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "zh-CN"))
    .slice(0, 3);
}

function insertShenlunReport(record) {
  db.prepare(`
    INSERT INTO shenlun_reports (
      id, user_id, timestamp, question_type, question_label, max_score, prompt, material, answer,
      scaled_score, percent_score, dimensions_json, strengths_json, weaknesses_json,
      missing_points_json, rewrite, provider
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.userId,
    record.timestamp,
    record.type,
    record.questionLabel,
    record.targetMax,
    record.prompt,
    record.material,
    record.answer,
    record.scaledScore,
    record.percentScore,
    JSON.stringify(record.dimensions),
    JSON.stringify(record.strengths),
    JSON.stringify(record.weaknesses),
    JSON.stringify(record.missing),
    record.rewrite,
    record.provider
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

async function deepSeekJsonChat({ systemPrompt, userPrompt, fallbackError = "DeepSeek request failed" }) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      stream: false
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || fallbackError);
  }
  return safeJsonParse(payload?.choices?.[0]?.message?.content || "");
}

async function deepSeekReport({ task, candidateName, prompt, essay, lang }) {
  const isZh = lang === "zh";
  const parsed = await deepSeekJsonChat({
    systemPrompt: [
      isZh
        ? "你是一位专业的 IELTS Writing examiner。请根据雅思写作评分标准给出接近真实考试的分数和反馈，输出简体中文。"
        : "You are a professional IELTS Writing examiner. Score the essay using IELTS-style logic and return concise, practical feedback in English.",
      "只返回 JSON，不要输出 Markdown。",
      "JSON 字段必须包含：overall, taskResponse, coherence, lexical, grammar, taskResponseFeedback, coherenceFeedback, lexicalFeedback, grammarFeedback, strengths, improvements, rewriteSuggestion, coachSummary。",
      "overall/taskResponse/coherence/lexical/grammar 为 0-9 数字，允许 0.5；strengths/improvements 为字符串数组，各 3 条。"
    ].join("\n"),
    userPrompt: [
      `Task type: ${task}`,
      `Candidate: ${candidateName || "Anonymous"}`,
      `Prompt: ${prompt}`,
      "Essay:",
      essay
    ].join("\n"),
    fallbackError: "DeepSeek IELTS request failed"
  });

  return {
    name: candidateName || (isZh ? "匿名考生" : "Anonymous Candidate"),
    task,
    taskLabel: task === "task1" ? "Task 1" : "Task 2",
    prompt,
    essay,
    overall: band(Number(parsed.overall)),
    taskResponse: band(Number(parsed.taskResponse)),
    coherence: band(Number(parsed.coherence)),
    lexical: band(Number(parsed.lexical)),
    grammar: band(Number(parsed.grammar)),
    taskResponseFeedback: parsed.taskResponseFeedback || "",
    coherenceFeedback: parsed.coherenceFeedback || "",
    lexicalFeedback: parsed.lexicalFeedback || "",
    grammarFeedback: parsed.grammarFeedback || "",
    strengths: (parsed.strengths || []).slice(0, 3),
    improvements: (parsed.improvements || []).slice(0, 3),
    rewriteSuggestion: parsed.rewriteSuggestion || "",
    coachSummary: parsed.coachSummary || ""
  };
}

async function gradeEssay(body, user) {
  const history = getUserHistory(user.id);
  const plan = plans[user.plan] || plans.free;
  if (history.length >= plan.quota) {
    throw new Error("QUOTA_EXCEEDED");
  }

  const provider = textProvider();
  const report = provider === "deepseek"
    ? await deepSeekReport(body)
    : provider === "openai"
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

function tokenizeChinese(text) {
  return Array.from(new Set(
    String(text || "")
      .replace(/[，。；：、“”‘’（）《》？！\s]/g, "")
      .split("")
      .filter(Boolean)
  ));
}

function chineseCoverage(source, answer) {
  const tokens = tokenizeChinese(source);
  if (!tokens.length) return 0.75;
  const compactAnswer = String(answer || "").replace(/\s/g, "");
  const matched = tokens.filter((token) => compactAnswer.includes(token)).length;
  return matched / tokens.length;
}

function countChinesePolicyWords(text) {
  const words = [
    "机制", "平台", "协同", "治理", "服务", "监督", "反馈", "考核", "群众", "基层", "落实", "规范", "责任", "制度", "统筹",
    "问题", "原因", "对策", "矛盾", "张力", "温度", "效率", "差异", "精准", "弹性", "公共", "民生", "执行", "参与"
  ];
  return words.filter((word) => String(text || "").includes(word)).length;
}

function countMatches(text, patterns) {
  const source = String(text || "");
  return patterns.reduce((sum, pattern) => sum + (pattern.test(source) ? 1 : 0), 0);
}

function countSentences(text) {
  return String(text || "").split(/[。！？!?；;]+/).map((part) => part.trim()).filter(Boolean).length;
}

function countMaterialMarkers(text) {
  return countMatches(text, [/材料一|材料1|材料二|材料2|材料三|材料3|材料四|材料4/, /加装电梯|电梯/, /智能水表|智能电表|数字乡村|数据/, /水冲式公厕|垃圾分类|村规民约|一刀切/, /效率与温度|统一与差异|技术理性|人文关怀/]);
}

function essayStyleProfile(answerText) {
  const charTotal = answerText.replace(/\s/g, "").length;
  const paragraphCount = answerText.split(/\n+/).filter((part) => part.trim()).length;
  const sentenceCount = countSentences(answerText);
  const avgSentenceLength = sentenceCount ? charTotal / sentenceCount : charTotal;
  const hasTitle = /^.{4,40}\n/.test(answerText.trim());
  const hasCentralThesis = /我认为|关键在于|核心在于|本质上|归根到底|必须|应当|要在/.test(answerText);
  const hasTension = /效率.*温度|温度.*效率|统一.*差异|差异.*统一|技术.*人文|人文.*技术|利益.*情感|规则.*情感|张力|平衡/.test(answerText);
  const hasPolicyLanding = /制度|机制|协商|参与|因地制宜|分类施策|群众|基层干部|治理现代化|公共服务|执行/.test(answerText);
  const materialMarkers = countMaterialMarkers(answerText);
  const colloquialHits = countMatches(answerText, [/说实话|脑子里|打脸|土得掉渣|白嫖|玄学|很香|救场|狂喜/]);
  const emptySloganHits = countMatches(answerText, [/高度重视|加大力度|多措并举|久久为功|形成合力|相关部门|提升能力|完善机制/g]);
  return {
    charTotal,
    paragraphCount,
    avgSentenceLength,
    hasTitle,
    hasCentralThesis,
    hasTension,
    hasPolicyLanding,
    materialMarkers,
    colloquialHits,
    emptySloganHits
  };
}

function strictScore(score, penalties = 0, bonus = 0) {
  return Math.round(Math.min(88, Math.max(32, score + bonus - penalties)));
}

function shenlunScoringGuide(rubric, targetMax) {
  return [
    "评分必须偏严格，按真实申论阅卷口径，不要鼓励式打高分。",
    "不要让所有维度分数接近或相同；除非答案高度均衡，否则最高维度与最低维度至少拉开 8 分。",
    "总分校准：普通但完整的答案通常在 58-70；有明确立意和材料转化但仍有不足通常在 70-78；只有立意深刻、结构稳定、材料使用充分、语言规范的答案才能超过 80；空泛套话、材料使用弱、结构散乱应低于 60。",
    "大作文高分特征：标题能承载中心论点；开头能从材料抽象出核心矛盾；分论点之间有递进或并列逻辑；能把材料细节转化为治理原则；结尾能回扣主题而不是喊口号。",
    "大作文扣分点：只写提升治理能力但没有矛盾分析；材料只堆例子不提炼；分论点互相重复；口语化过重；大量万能套话；没有联系现实治理场景。",
    `本题型评分维度：${rubric.dimensions.join("、")}；目标分值：${targetMax}。`
  ].join("\n");
}

function demoShenlunReport({ questionType, maxScore, prompt, material, answer }) {
  const rubric = getShenlunRubric(questionType);
  const answerText = String(answer || "");
  const charTotal = answerText.replace(/\s/g, "").length;
  const materialCoverage = chineseCoverage(material, answerText);
  const promptCoverageValue = chineseCoverage(prompt, answerText);
  const paragraphCount = answerText.split(/\n+/).filter((part) => part.trim()).length;
  const policyWords = countChinesePolicyWords(answerText);
  const hasNumbering = /一是|二是|三是|首先|其次|再次|第一|第二|第三/.test(answerText);
  const style = essayStyleProfile(answerText);
  const isEssay = questionType === "essay" || Number(maxScore || 0) >= 80;
  const lengthPenalty = isEssay
    ? (style.charTotal < 800 ? 12 : style.charTotal < 1000 ? 5 : style.charTotal > 1250 ? 4 : 0)
    : (style.charTotal < 120 ? 8 : 0);
  const stylePenalty = (style.colloquialHits * 3) + Math.min(style.emptySloganHits * 2, 8);
  const essayBonus = isEssay
    ? (style.hasTitle ? 4 : -4) + (style.hasTension ? 8 : -6) + Math.min(style.materialMarkers * 3, 12) + (style.hasPolicyLanding ? 4 : -3)
    : 0;

  const rawDimensions = isEssay ? [
    { label: rubric.dimensions[0], score: 54 + promptCoverageValue * 18 + (style.hasCentralThesis ? 8 : -5) + (style.hasTension ? 8 : -6), comment: style.hasTension ? "中心论点能够触及材料背后的治理张力，但还要进一步压实政策表达。" : "立意仍偏表层，建议从材料中提炼更明确的核心矛盾。" },
    { label: rubric.dimensions[1], score: 52 + (paragraphCount >= 5 ? 12 : 4) + (style.hasTension ? 8 : 0) + Math.min(policyWords, 8), comment: paragraphCount >= 5 ? "分论点结构基本清楚，但分论点之间的递进关系仍可增强。" : "分论点层次不够稳定，建议用更清晰的并列或递进结构展开。" },
    { label: rubric.dimensions[2], score: 50 + Math.min(style.materialMarkers * 6, 24) + (style.hasPolicyLanding ? 8 : -4), comment: style.materialMarkers >= 3 ? "能够调用材料细节支撑观点，但部分材料还可进一步抽象为治理原则。" : "材料使用偏弱，容易显得空泛或脱离给定资料。" },
    { label: rubric.dimensions[3], score: 52 + materialCoverage * 18 + Math.min(policyWords, 10), comment: "材料联系需要服务于论证，不宜只罗列故事或只提口号。" },
    { label: rubric.dimensions[4], score: 50 + (style.hasPolicyLanding ? 14 : 4) + (style.hasTension ? 6 : 0), comment: style.hasPolicyLanding ? "能落到治理机制与群众参与，但政策高度还可更稳。" : "建议把个人感受进一步转化为制度弹性、协商治理等公共治理表达。" },
    { label: rubric.dimensions[5], score: 60 + Math.min(charTotal / 90, 10) - style.colloquialHits * 4 - Math.min(style.emptySloganHits, 6), comment: style.colloquialHits ? "部分表达偏口语化，正式考场文章需更稳健。" : "语言整体较通顺，但仍要避免万能套话。" }
  ] : [
    { label: rubric.dimensions[0], score: 56 + promptCoverageValue * 22, comment: "基本能够围绕题干作答，但还可进一步拆解限制条件与作答对象。" },
    { label: rubric.dimensions[1], score: 52 + materialCoverage * 28 + Math.min(policyWords, 8), comment: "覆盖了部分核心信息，建议继续补齐材料中的关键对象、问题和措施。" },
    { label: rubric.dimensions[2], score: 52 + materialCoverage * 24 + Math.min(policyWords, 10), comment: "能够联系材料，但提炼还可以更凝练、更贴近材料原意。" },
    { label: rubric.dimensions[3], score: 54 + (hasNumbering ? 12 : 2) + Math.min(paragraphCount * 3, 10), comment: hasNumbering ? "分层较明显，阅卷识别度较好。" : "建议使用“一是、二是、三是”等结构标志增强条理。" },
    { label: rubric.dimensions[4], score: 60 + Math.min(charTotal / 35, 10) - style.colloquialHits * 3, comment: "表达基本规范，可继续减少口语化和泛泛表述。" },
    { label: rubric.dimensions[5], score: 62 + (questionType === "official" && !/通知|倡议|讲话|提纲|简报/.test(answerText) ? -12 : 3), comment: "整体符合基本作答要求，特殊题型需进一步注意格式。" }
  ].map((item) => ({
    ...item,
    score: strictScore(item.score, lengthPenalty + stylePenalty, essayBonus)
  }));

  const spreadAdjusted = rawDimensions.map((item, index) => ({
    ...item,
    score: strictScore(item.score + [-3, 2, -2, 3, -1, 1][index % 6])
  }));
  const percentScore = Math.round(spreadAdjusted.reduce((sum, item) => sum + item.score, 0) / spreadAdjusted.length);
  const targetMax = Number(maxScore || 30);
  const scaledScore = Math.round((percentScore / 100) * targetMax);
  const missing = rubric.focusPoints.filter((point) => !answerText.includes(point.slice(0, 2))).slice(0, 4);

  return {
    type: rubric.questionType,
    questionLabel: rubric.label,
    targetMax,
    prompt,
    material,
    answer,
    scaledScore,
    percentScore,
    dimensions: spreadAdjusted,
    strengths: [
      hasNumbering ? "答案有明显分层，阅卷时更容易识别要点。" : "答案基本回应了题目要求，具备初步作答方向。",
      materialCoverage > 0.46 ? "能够提取部分材料信息，未完全脱离给定资料。" : "已经围绕题目作答，但材料提炼还可以更充分。",
      policyWords >= 4 ? "使用了一定政策表达，语言有申论规范感。" : "表达较为清楚，具备继续优化的基础。"
    ],
    weaknesses: [
      materialCoverage < 0.5 ? "材料要点覆盖不足，建议回到材料中提炼更多关键词。" : "要点仍可进一步压缩和合并，避免表达松散。",
      !hasNumbering ? "层次标志不够明显，建议使用“一是、二是、三是”增强条理。" : "部分要点之间的逻辑递进还可以更清晰。",
      charTotal < (isEssay ? 900 : 180) ? "作答篇幅偏短，可能导致要点展开不足。" : "可以进一步提升语言的机关表达和对策可操作性。",
      isEssay && style.colloquialHits ? "个别表达偏口语化，建议改成更稳健的议论文表达。" : "评分会继续按立意、材料转化和表达规范拉开维度差距。"
    ],
    missing: missing.length ? missing : ["材料关键词", "分层表达"],
    rewrite: `建议围绕“${rubric.focusPoints.slice(0, 3).join("、")}”重新组织答案。作答时要尽量使用材料关键词，把问题、原因、影响和对策分层呈现，避免只写泛泛口号。`
  };
}

async function openAiShenlunReport({ questionType, maxScore, prompt, material, answer }) {
  const rubric = getShenlunRubric(questionType);
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["scaledScore", "percentScore", "dimensions", "strengths", "weaknesses", "missing", "rewrite"],
    properties: {
      scaledScore: { type: "integer", minimum: 0, maximum: Number(maxScore || 100) },
      percentScore: { type: "integer", minimum: 0, maximum: 100 },
      dimensions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "score", "comment"],
          properties: {
            label: { type: "string" },
            score: { type: "integer", minimum: 0, maximum: 100 },
            comment: { type: "string" }
          }
        }
      },
      strengths: { type: "array", items: { type: "string" } },
      weaknesses: { type: "array", items: { type: "string" } },
      missing: { type: "array", items: { type: "string" } },
      rewrite: { type: "string" }
    }
  };

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
              text: [
                "你是一位中国公务员考试申论阅卷与教研专家。",
                "请按申论阅卷逻辑批改，不要按普通作文泛泛评价。",
                shenlunScoringGuide(rubric, maxScore),
                `题型：${rubric.label}`,
                `目标分值：${maxScore}`,
                `评分维度：${rubric.dimensions.join("、")}`,
                `核心关注点：${rubric.focusPoints.join("、")}`,
                "输出必须是简体中文，反馈要具体、可操作、适合考生提分。",
                "如果答案只是套话完整但材料转化弱，分数必须控制在中等区间；如果口语化明显，要在语言表达或论证深度中扣分。"
              ].join("\n")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `题目要求：${prompt}`,
                `给定资料：${material}`,
                `考生作答：${answer}`
              ].join("\n\n")
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "shenlun_report",
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
    type: rubric.questionType,
    questionLabel: rubric.label,
    targetMax: Number(maxScore || 30),
    prompt,
    material,
    answer,
    scaledScore: parsed.scaledScore,
    percentScore: parsed.percentScore,
    dimensions: parsed.dimensions.slice(0, 6),
    strengths: parsed.strengths.slice(0, 4),
    weaknesses: parsed.weaknesses.slice(0, 4),
    missing: parsed.missing.slice(0, 5),
    rewrite: parsed.rewrite
  };
}

async function deepSeekShenlunReport({ questionType, maxScore, prompt, material, answer, userProfile }) {
  const rubric = getShenlunRubric(questionType);
  const targetMax = Number(maxScore || 30);
  const snippets = getKnowledgeSnippets("shenlun", rubric.questionType, `${prompt}\n${material}\n${answer}`);
  const parsed = await deepSeekJsonChat({
    systemPrompt: [
      "你是一位中国公务员考试申论阅卷与教研专家。",
      "请按申论阅卷逻辑批改，不要按普通作文泛泛评价。",
      shenlunScoringGuide(rubric, targetMax),
      `题型：${rubric.label}`,
      `目标分值：${targetMax}`,
      `评分维度：${rubric.dimensions.join("、")}`,
      `核心关注点：${rubric.focusPoints.join("、")}`,
      userProfile ? `该考生已有训练档案：${JSON.stringify(userProfile)}` : "该考生暂无历史训练档案。",
      snippets.length ? `内部教研提示：${snippets.map((item) => `${item.title}：${item.content}`).join("\n")}` : "内部教研提示：无。",
      "只返回 JSON，不要输出 Markdown。",
      "JSON 字段必须包含：scaledScore, percentScore, dimensions, strengths, weaknesses, missing, rewrite。",
      "scaledScore 为 0 到目标分值的整数；percentScore 为 0 到 100 的整数；dimensions 是数组，每项包含 label, score, comment；strengths/weaknesses/missing 是字符串数组；rewrite 是参考优化建议。",
      "必须先指出最主要扣分原因，再给优点；评分要有区分度，不要所有维度都给相同或相近分。",
      "如果有历史训练档案，请把本次建议尽量和长期弱项衔接。"
    ].join("\n"),
    userPrompt: [
      `题目要求：${prompt}`,
      `给定资料：${material}`,
      `考生作答：${answer}`
    ].join("\n\n"),
    fallbackError: "DeepSeek Shenlun request failed"
  });

  return {
    type: rubric.questionType,
    questionLabel: rubric.label,
    targetMax,
    prompt,
    material,
    answer,
    scaledScore: Math.max(0, Math.min(targetMax, Math.round(Number(parsed.scaledScore || 0)))),
    percentScore: Math.max(0, Math.min(100, Math.round(Number(parsed.percentScore || 0)))),
    dimensions: (parsed.dimensions || []).slice(0, 6),
    strengths: (parsed.strengths || []).slice(0, 4),
    weaknesses: (parsed.weaknesses || []).slice(0, 4),
    missing: (parsed.missing || []).slice(0, 5),
    rewrite: parsed.rewrite || ""
  };
}

async function gradeShenlun(body, user) {
  const history = getShenlunHistory(user.id);
  const plan = plans[user.plan] || plans.free;
  if (history.length >= plan.quota) {
    throw new Error("QUOTA_EXCEEDED");
  }

  const previousProfile = getLearningProfile(user.id, "shenlun");
  const provider = textProvider();
  const report = provider === "deepseek"
    ? await deepSeekShenlunReport({ ...body, userProfile: previousProfile })
    : provider === "openai"
      ? await openAiShenlunReport(body)
      : demoShenlunReport(body);
  const record = {
    id: randomUUID(),
    userId: user.id,
    timestamp: new Date().toLocaleString(),
    provider,
    ...report
  };
  insertShenlunReport(record);
  const profile = buildShenlunLearningProfile(user.id);
  saveLearningProfile(user.id, "shenlun", profile);
  return {
    provider,
    report: record,
    history: getShenlunHistory(user.id),
    profile
  };
}

function normalizeInterviewInput(body) {
  return {
    questionType: "interview",
    maxScore: 100,
    prompt: body.prompt || body.question || "",
    material: [
      `语音状态：${body.voiceSignal || "未说明"}`,
      `视频状态：${body.videoSignal || "未说明"}`,
      `流畅度：${body.fluencySignal || "未说明"}`,
      body.context ? `考试场景：${body.context}` : ""
    ].filter(Boolean).join("\n"),
    answer: body.answer || ""
  };
}

function demoInterviewReport(body) {
  const normalized = normalizeInterviewInput(body);
  const rubric = getShenlunRubric("interview");
  const answerText = String(normalized.answer || "");
  const charTotal = answerText.replace(/\s/g, "").length;
  const sentenceCount = countSentences(answerText);
  const hasStructure = /第一|第二|第三|首先|其次|最后|一方面|另一方面|我认为|我的理解|具体来说/.test(answerText);
  const hasPublicService = /群众|基层|服务|责任|担当|沟通|协商|问题|落实|政策|岗位|公共/.test(answerText);
  const colloquialHits = countMatches(answerText, [/嗯|啊|然后然后|就是就是|这个这个|那个那个|说白了|咋说/]);
  const voiceSignal = String(body.voiceSignal || "");
  const videoSignal = String(body.videoSignal || "");
  const fluencySignal = String(body.fluencySignal || "");
  const weakVoice = /偏小|发虚|紧张|停顿多|不稳/.test(voiceSignal);
  const strongVoice = /底气足|稳定|清楚/.test(voiceSignal);
  const weakVideo = /表情僵|眼神飘|晃动|低头|不自然/.test(videoSignal);
  const strongVideo = /自然|合适|稳定/.test(videoSignal);
  const weakFluency = /明显卡顿|停顿较多|停顿多|重复|过快|过慢/.test(fluencySignal);
  const strongFluency = /流畅|节奏/.test(fluencySignal);
  const lengthPenalty = charTotal < 140 ? 8 : charTotal < 220 ? 4 : charTotal > 900 ? 5 : 0;
  const contentBonus = (hasStructure ? 5 : -5) + (hasPublicService ? 5 : -4);

  const dimensions = [
    {
      label: "内容契合",
      score: 74 + contentBonus - lengthPenalty,
      comment: hasPublicService ? "能够围绕公共服务或基层治理展开，但还需要更贴近题干情境。" : "内容回应偏泛，建议把观点落到具体岗位、群众诉求和治理场景。"
    },
    {
      label: "表达流畅",
      score: 76 + (strongFluency ? 5 : 0) - (weakFluency ? 8 : 0) - colloquialHits * 3,
      comment: weakFluency ? "表达节奏有卡顿或重复，面试中会影响考官接收信息。" : "表达基本连贯，下一步要减少重复铺垫。"
    },
    {
      label: "语言自然",
      score: 75 + (sentenceCount >= 4 ? 3 : -3) - colloquialHits * 4,
      comment: colloquialHits ? "口头填充词偏多，建议把“嗯、然后、就是”等替换成更稳定的连接表达。" : "语言比较自然，但仍要避免背稿感。"
    },
    {
      label: "声音状态",
      score: 76 + (strongVoice ? 6 : 0) - (weakVoice ? 9 : 0),
      comment: weakVoice ? "声音底气不足或稳定性偏弱，建议训练开头 15 秒的音量和停顿。" : "声音状态基本可用，注意保持句尾不下坠。"
    },
    {
      label: "表情仪态",
      score: 75 + (strongVideo ? 5 : 0) - (weakVideo ? 8 : 0),
      comment: weakVideo ? "表情和眼神管理会影响亲和力，建议练习看镜头、轻微点头和稳定坐姿。" : "表情仪态风险不高，注意不要全程僵住。"
    },
    {
      label: "临场感",
      score: 74 + (hasStructure ? 4 : -4) + (strongVoice ? 2 : 0) - (weakFluency ? 5 : 0),
      comment: "面试分数不仅看内容，还看能不能像现场交流一样稳定输出。"
    }
  ].map((item, index) => ({
    ...item,
    score: Math.max(58, Math.min(88, Math.round(item.score + [-2, 2, -1, 1, -3, 3][index])))
  }));

  const percentScore = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);
  return {
    type: "interview",
    questionLabel: rubric.label,
    targetMax: 100,
    prompt: normalized.prompt,
    material: normalized.material,
    answer: normalized.answer,
    scaledScore: percentScore,
    percentScore,
    dimensions,
    strengths: [
      hasStructure ? "回答有基本结构，考官能较快抓到层次。" : "已经形成初步回答，但结构标志还不够清楚。",
      hasPublicService ? "内容能联系公共服务、群众或基层治理语境。" : "作答有主题意识，但公共服务和岗位匹配表达不足。",
      strongVoice ? "声音状态较稳定，有一定底气。" : "声音表现仍有提升空间，适合用短题反复练开头。"
    ],
    weaknesses: [
      weakFluency ? "流畅度是主要扣分点，建议先把答题框架练熟，再追求表达高级。" : "主要问题是内容还可以更具体，不要停留在原则性表态。",
      weakVideo ? "视频表现中表情或眼神管理偏弱，会拉低整体面试观感。" : "仪态风险可控，但仍要保持自然交流感。",
      charTotal < 220 ? "作答信息量偏少，容易给人准备不足的感觉。" : "建议进一步压缩重复表达，让每句话都服务于观点。"
    ],
    missing: ["自然表达", "声音底气", "表情管理", "岗位匹配"].filter((point) => !normalized.answer.includes(point.slice(0, 2))).slice(0, 4),
    rewrite: "建议按“亮明观点—分析原因—结合岗位—提出做法—自然收束”的顺序重组。开头控制在 10-15 秒内，先稳住声音和节奏，再展开两到三层内容。"
  };
}

function interviewScoringGuide() {
  return [
    "你是一位公务员结构化面试考官和备考教研专家。",
    "请按真实面试观感严苛评分，不要给鼓励式高分。",
    "常规可用但不突出的回答通常在 73-80；内容清楚、表达自然、声音稳定可到 80-85；只有内容深刻、表达非常稳定、仪态自然才可高于 85；空泛、卡顿、声音发虚或仪态明显紧张应低于 73。",
    "评分必须覆盖：内容契合、表达流畅、语言自然、声音状态、表情仪态、临场感。",
    "必须明确指出：说话是否自然、表情是否合适、表达是否流畅、声音是否有底气。",
    "不要所有维度给相同分数，最高和最低维度应有明显差距。"
  ].join("\n");
}

async function deepSeekInterviewReport(body) {
  const normalized = normalizeInterviewInput(body);
  const profile = body.userProfile || null;
  const snippets = getKnowledgeSnippets("shenlun", "interview", `${normalized.prompt}\n${normalized.answer}\n${normalized.material}`);
  const parsed = await deepSeekJsonChat({
    systemPrompt: [
      interviewScoringGuide(),
      profile ? `该考生已有面试/申论训练档案：${JSON.stringify(profile)}` : "该考生暂无历史训练档案。",
      snippets.length ? `内部教研提示：${snippets.map((item) => `${item.title}：${item.content}`).join("\n")}` : "内部教研提示：无。",
      "只返回 JSON，不要输出 Markdown。",
      "JSON 字段必须包含：scaledScore, percentScore, dimensions, strengths, weaknesses, missing, rewrite。",
      "scaledScore 和 percentScore 都是 0-100 的整数；dimensions 是数组，每项包含 label, score, comment；strengths/weaknesses/missing 是字符串数组；rewrite 是下一次面试训练建议。",
      "如果有历史训练档案，请延续长期问题，不要每次都像第一次测评。"
    ].join("\n"),
    userPrompt: [
      `面试题目：${normalized.prompt}`,
      `作答文字：${normalized.answer}`,
      normalized.material
    ].join("\n\n"),
    fallbackError: "DeepSeek interview request failed"
  });

  const percentScore = Math.max(0, Math.min(100, Math.round(Number(parsed.percentScore || parsed.scaledScore || 0))));
  return {
    type: "interview",
    questionLabel: "公务员面试",
    targetMax: 100,
    prompt: normalized.prompt,
    material: normalized.material,
    answer: normalized.answer,
    scaledScore: Math.max(0, Math.min(100, Math.round(Number(parsed.scaledScore || percentScore)))),
    percentScore,
    dimensions: (parsed.dimensions || []).slice(0, 6),
    strengths: (parsed.strengths || []).slice(0, 4),
    weaknesses: (parsed.weaknesses || []).slice(0, 4),
    missing: (parsed.missing || []).slice(0, 5),
    rewrite: parsed.rewrite || ""
  };
}

function demoInterviewFollowup(body) {
  const answer = String(body.answer || "");
  if (/群众|基层|沟通|协商/.test(answer)) {
    return {
      followup: "如果群众诉求与现行政策规定存在冲突，你会如何现场沟通并推动问题解决？",
      focus: "考察规则意识、群众沟通和解决问题能力。"
    };
  }
  if (/原则|制度|规定/.test(answer)) {
    return {
      followup: "请结合一个基层工作场景，说明你如何在坚持原则的同时体现服务温度。",
      focus: "考察情境化表达和岗位匹配度。"
    };
  }
  return {
    followup: "如果考官继续追问你“这项做法如何落地”，你会补充哪些具体措施？",
    focus: "考察追问压力下的逻辑延展和措施可操作性。"
  };
}

async function deepSeekInterviewFollowup(body) {
  const parsed = await deepSeekJsonChat({
    systemPrompt: [
      "你是一位公务员结构化面试考官。",
      "请根据题目和考生第一轮回答，生成 1 个自然、具体、有区分度的追问。",
      "追问要像真实考官问的，不要太长，不要重复原题。",
      "只返回 JSON，不要输出 Markdown。",
      "JSON 字段必须包含：followup, focus。"
    ].join("\n"),
    userPrompt: [
      `原始题目：${body.question || ""}`,
      `考生第一轮回答：${body.answer || ""}`
    ].join("\n\n"),
    fallbackError: "DeepSeek interview followup request failed"
  });
  return {
    followup: parsed.followup || demoInterviewFollowup(body).followup,
    focus: parsed.focus || demoInterviewFollowup(body).focus
  };
}

async function createInterviewFollowup(body) {
  const provider = textProvider();
  const result = provider === "deepseek" ? await deepSeekInterviewFollowup(body) : demoInterviewFollowup(body);
  return { provider, ...result };
}

async function gradeInterview(body, user) {
  const history = getShenlunHistory(user.id);
  const plan = plans[user.plan] || plans.free;
  if (history.length >= plan.quota) {
    throw new Error("QUOTA_EXCEEDED");
  }
  const previousProfile = getLearningProfile(user.id, "shenlun");
  const provider = textProvider();
  const report = provider === "deepseek" ? await deepSeekInterviewReport({ ...body, userProfile: previousProfile }) : demoInterviewReport(body);
  const record = {
    id: randomUUID(),
    userId: user.id,
    timestamp: new Date().toLocaleString(),
    provider,
    ...report
  };
  insertShenlunReport(record);
  const profile = buildShenlunLearningProfile(user.id);
  saveLearningProfile(user.id, "shenlun", profile);
  return {
    provider,
    report: record,
    history: getShenlunHistory(user.id),
    profile
  };
}

async function extractShenlunImage({ imageDataUrl }) {
  const provider = imageOcrProvider();
  if (provider === "baidu") {
    return baiduOcrShenlunImage({ imageDataUrl });
  }
  if (!OPENAI_API_KEY) {
    throw new Error("OCR_REQUIRES_OPENAI_API_KEY");
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["prompt", "material", "answer", "notes"],
    properties: {
      prompt: { type: "string" },
      material: { type: "string" },
      answer: { type: "string" },
      notes: { type: "string" }
    }
  };

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
              text: [
                "你是一个中文 OCR 和申论题目整理助手。",
                "请识别图片中的文字，并尽量区分：题目要求、给定资料/材料、考生作答。",
                "如果图片里只有其中一部分，就把能识别的内容填入对应字段，其他字段留空。",
                "不要编造图片里没有的内容。输出简体中文 JSON。"
              ].join("\n")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "请识别这张图片中的申论相关文字，并整理为 prompt/material/answer。"
            },
            {
              type: "input_image",
              image_url: imageDataUrl
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "shenlun_ocr",
          strict: true,
          schema
        }
      }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "OpenAI OCR request failed");
  }
  return JSON.parse(payload.output_text);
}

function stripDataUrlPrefix(imageDataUrl) {
  return String(imageDataUrl || "").replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

let baiduAccessTokenCache = { token: "", expiresAt: 0 };

async function getBaiduAccessToken() {
  const now = Date.now();
  if (baiduAccessTokenCache.token && baiduAccessTokenCache.expiresAt > now + 60_000) {
    return baiduAccessTokenCache.token;
  }

  const tokenUrl = new URL("https://aip.baidubce.com/oauth/2.0/token");
  tokenUrl.searchParams.set("grant_type", "client_credentials");
  tokenUrl.searchParams.set("client_id", BAIDU_OCR_API_KEY);
  tokenUrl.searchParams.set("client_secret", BAIDU_OCR_SECRET_KEY);

  const response = await fetch(tokenUrl);
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload?.error_description || payload?.error || "BAIDU_OCR_TOKEN_FAILED");
  }

  baiduAccessTokenCache = {
    token: payload.access_token,
    expiresAt: now + Number(payload.expires_in || 2_592_000) * 1000
  };
  return baiduAccessTokenCache.token;
}

async function baiduOcrShenlunImage({ imageDataUrl }) {
  if (!BAIDU_OCR_API_KEY || !BAIDU_OCR_SECRET_KEY) {
    throw new Error("BAIDU_OCR_REQUIRES_KEYS");
  }

  const accessToken = await getBaiduAccessToken();
  const endpoint = String(BAIDU_OCR_ENDPOINT || "general_basic").replace(/[^a-z_]/g, "") || "general_basic";
  const ocrUrl = new URL(`https://aip.baidubce.com/rest/2.0/ocr/v1/${endpoint}`);
  ocrUrl.searchParams.set("access_token", accessToken);

  const body = new URLSearchParams();
  body.set("image", stripDataUrlPrefix(imageDataUrl));
  body.set("paragraph", "true");

  const response = await fetch(ocrUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await response.json();
  if (!response.ok || payload.error_code) {
    throw new Error(payload?.error_msg || "BAIDU_OCR_REQUEST_FAILED");
  }

  const words = (payload.words_result || []).map((item) => item.words).filter(Boolean);
  const text = words.join("\n").trim();
  return {
    prompt: "",
    material: text,
    answer: "",
    notes: text
      ? "百度 OCR 识别完成，已先填入材料框。请按图片内容把题目/材料/作答再校对一下。"
      : "百度 OCR 没有识别到明显文字，请换一张更清晰的图片。"
  };
}

function serveStatic(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  let filePath = pathname === "/" ? path.join(ROOT, "index.html") : path.join(ROOT, pathname);

  if (!filePath.startsWith(ROOT)) {
    json(res, 403, { error: "Forbidden" });
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
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
      json(res, 200, { ok: true, storage: "sqlite", provider: textProvider(), ocrProvider: imageOcrProvider() });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/bootstrap") {
      const user = getOrCreateUser(url.searchParams.get("userId"));
      json(res, 200, {
        provider: OPENAI_API_KEY ? "openai" : "demo",
        user,
        plans,
        history: getUserHistory(user.id),
        shenlunProfile: getLearningProfile(user.id, "shenlun") || buildShenlunLearningProfile(user.id),
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

    if (req.method === "POST" && url.pathname === "/api/activate") {
      const body = await parseBody(req);
      const user = getOrCreateUser(body.userId);
      const activation = redeemActivationCode(user.id, body.code);
      const updatedUser = getOrCreateUser(user.id);
      json(res, 200, { user: updatedUser, activation });
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
      db.prepare("DELETE FROM user_learning_profiles WHERE user_id = ? AND product = ?").run(user.id, "english");
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

    if (req.method === "GET" && url.pathname === "/api/shenlun/history") {
      const user = getOrCreateUser(url.searchParams.get("userId"));
      json(res, 200, { history: getShenlunHistory(user.id) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/shenlun/profile") {
      const user = getOrCreateUser(url.searchParams.get("userId"));
      json(res, 200, { profile: getLearningProfile(user.id, "shenlun") || buildShenlunLearningProfile(user.id) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/shenlun/grade") {
      const body = await parseBody(req);
      const user = getOrCreateUser(body.userId);
      const result = await gradeShenlun({
        questionType: body.questionType || "summary",
        maxScore: body.maxScore || 30,
        prompt: body.prompt || "",
        material: body.material || "",
        answer: body.answer || ""
      }, user);
      json(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/shenlun/interview") {
      const body = await parseBody(req);
      const user = getOrCreateUser(body.userId);
      const result = await gradeInterview({
        question: body.question || "",
        answer: body.answer || "",
        voiceSignal: body.voiceSignal || "",
        videoSignal: body.videoSignal || "",
        fluencySignal: body.fluencySignal || "",
        context: body.context || ""
      }, user);
      json(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/shenlun/interview/followup") {
      const body = await parseBody(req);
      const result = await createInterviewFollowup({
        question: body.question || "",
        answer: body.answer || ""
      });
      json(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/shenlun/ocr") {
      const body = await parseBody(req);
      const result = await extractShenlunImage({
        imageDataUrl: body.imageDataUrl || ""
      });
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
  const providerLabel = textProvider() === "deepseek"
    ? `DeepSeek (${DEEPSEEK_MODEL})`
    : textProvider() === "openai"
      ? `OpenAI (${OPENAI_MODEL})`
      : "demo fallback";
  console.log(`Provider mode: ${providerLabel}`);
  console.log(`Storage mode: SQLite at ${SQLITE_DB_PATH}`);
});
