const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { execFileSync } = require("child_process");
const { DatabaseSync } = require("node:sqlite");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
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
const HOST = process.env.HOST || "0.0.0.0";
const AI_PROVIDER = (process.env.AI_PROVIDER || "auto").toLowerCase();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
// Qwen-VL via SiliconFlow（比OpenAI便宜3-5倍，中文数学识别能力强）
const QWEN_API_KEY = process.env.QWEN_API_KEY || "";
const QWEN_MODEL = process.env.QWEN_MODEL || "Qwen/Qwen2.5-VL-7B-Instruct";
const OCR_PROVIDER = (process.env.OCR_PROVIDER || "auto").toLowerCase();
const BAIDU_OCR_API_KEY = process.env.BAIDU_OCR_API_KEY || "";
const BAIDU_OCR_SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY || "";
const BAIDU_OCR_ENDPOINT = process.env.BAIDU_OCR_ENDPOINT || "general_basic";
const ACTIVATION_CODES = process.env.ACTIVATION_CODES || "";
const SITE_VARIANT = (process.env.SITE_VARIANT || "shenlun").toLowerCase();
const USDT_TRC20_ADDRESS = process.env.USDT_TRC20_ADDRESS || "TTnPHLdS2x5tPBMTdi4Gktr1ExAfET7HDB";
const USDT_ERC20_ADDRESS = process.env.USDT_ERC20_ADDRESS || "";
const USDT_BEP20_ADDRESS = process.env.USDT_BEP20_ADDRESS || "";
const AUD_CNY_FX = Number(process.env.AUD_CNY_FX || 4.72);
const AEMO_PRICE_CACHE_MS = Number(process.env.AEMO_PRICE_CACHE_MS || 5 * 60 * 1000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf"
};

function defaultHomePath() {
  if (SITE_VARIANT === "gaokao") return path.join(ROOT, "gaokao", "index.html");
  return path.join(ROOT, "shenlun", "index.html");
}

const plans = {
  free: { key: "free", price: 0, quota: 3, badge: "Starter", featured: false },
  pro: { key: "pro", price: 19, quota: 50, badge: "Best Seller", featured: true },
  team: { key: "team", price: 79, quota: 300, badge: "For Schools", featured: false }
};

const tradeInstruments = [
  { symbol: "BTCUSDT", asset: "BTC", name: "Bitcoin", marketType: "spot", source: "binance_live", basePrice: 71026.17, amplitude: 0.012, volume: "3581.25" },
  { symbol: "ETHUSDT", asset: "ETH", name: "Ethereum", marketType: "spot", source: "binance_live", basePrice: 2183.16, amplitude: 0.015, volume: "1970.69" },
  { symbol: "SOLUSDT", asset: "SOL", name: "Solana", marketType: "spot", source: "binance_live", basePrice: 82.43, amplitude: 0.022, volume: "720.00" },
  { symbol: "DOGEUSDT", asset: "DOGE", name: "Dogecoin", marketType: "spot", source: "binance_live", basePrice: 0.09149, amplitude: 0.03, volume: "152.59" },
  { symbol: "SHIBUSDT", asset: "SHIB", name: "Shiba Inu", marketType: "spot", source: "binance_live", basePrice: 0.0000402, amplitude: 0.036, volume: "18.67" },
  { symbol: "PEPEUSDT", asset: "PEPE", name: "Pepe", marketType: "spot", source: "binance_live", basePrice: 0.00001668, amplitude: 0.04, volume: "11.42" },
  { symbol: "ADAUSDT", asset: "ADA", name: "Cardano", marketType: "spot", source: "binance_live", basePrice: 0.2516, amplitude: 0.026, volume: "81.17" },
  { symbol: "XRPUSDT", asset: "XRP", name: "Ripple", marketType: "spot", source: "binance_live", basePrice: 1.3327, amplitude: 0.023, volume: "603.98" },
  { symbol: "TRXUSDT", asset: "TRX", name: "TRON", marketType: "spot", source: "binance_live", basePrice: 0.317, amplitude: 0.018, volume: "186.48" },
  { symbol: "AVAXUSDT", asset: "AVAX", name: "Avalanche", marketType: "spot", source: "binance_live", basePrice: 9.10, amplitude: 0.028, volume: "78.19" },
  { symbol: "LINKUSDT", asset: "LINK", name: "Chainlink", marketType: "spot", source: "binance_live", basePrice: 8.76, amplitude: 0.021, volume: "86.58" },
  { symbol: "BTC-PERP", asset: "BTC", name: "BTC Perpetual", marketType: "perpetual", source: "internal_reference", basePrice: 70991.7, amplitude: 0.014, volume: "185.05K" },
  { symbol: "ETH-PERP", asset: "ETH", name: "ETH Perpetual", marketType: "perpetual", source: "internal_reference", basePrice: 2181.86, amplitude: 0.018, volume: "91.24K" },
  { symbol: "SOL-PERP", asset: "SOL", name: "SOL Perpetual", marketType: "perpetual", source: "internal_reference", basePrice: 82.37, amplitude: 0.023, volume: "73.62K" },
  { symbol: "GC1!", asset: "GC", name: "Gold Futures Ref", marketType: "futures", source: "internal_reference", basePrice: 2362.4, amplitude: 0.009, volume: "18.22K" },
  { symbol: "CL1!", asset: "CL", name: "Crude Futures Ref", marketType: "futures", source: "internal_reference", basePrice: 82.74, amplitude: 0.013, volume: "26.48K" },
  { symbol: "NQ1!", asset: "NQ", name: "Nasdaq Futures Ref", marketType: "futures", source: "internal_reference", basePrice: 18274.0, amplitude: 0.011, volume: "13.76K" }
];

let aemoPriceCache = {
  fetchedAt: 0,
  value: null
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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
    CREATE TABLE IF NOT EXISTS gaokao_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      subject TEXT NOT NULL,
      subject_label TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      grade_level TEXT NOT NULL,
      student_name TEXT NOT NULL,
      school_name TEXT NOT NULL,
      class_name TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL,
      requirements TEXT NOT NULL,
      essay TEXT NOT NULL,
      scaled_score REAL NOT NULL,
      target_max INTEGER NOT NULL,
      estimated_low INTEGER NOT NULL,
      estimated_high INTEGER NOT NULL,
      score_confidence INTEGER NOT NULL,
      dimensions_json TEXT NOT NULL,
      strengths_json TEXT NOT NULL,
      issues_json TEXT NOT NULL,
      action_items_json TEXT NOT NULL,
      teacher_checkpoints_json TEXT NOT NULL,
      revision_guidance TEXT NOT NULL,
      coaching_focus_json TEXT NOT NULL DEFAULT '[]',
      self_correction_json TEXT NOT NULL DEFAULT '[]',
      cohort_snapshot_json TEXT NOT NULL DEFAULT '{}',
      student_profile_json TEXT NOT NULL DEFAULT '{}',
      profile_snapshot_json TEXT NOT NULL,
      provider TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS gaokao_student_profiles (
      user_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      student_name TEXT NOT NULL,
      school_name TEXT NOT NULL DEFAULT '',
      class_name TEXT NOT NULL DEFAULT '',
      profile_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(user_id, subject, student_name, class_name),
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
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      subject TEXT NOT NULL,
      class_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      answer_assets_json TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      question_no TEXT NOT NULL,
      score REAL NOT NULL,
      knowledge_point TEXT NOT NULL,
      question_type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      standard_answer TEXT NOT NULL,
      standard_steps TEXT NOT NULL,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      student_no TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS student_scores (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      total_score REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS question_scores (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      score_got REAL NOT NULL,
      ai_analysis TEXT NOT NULL,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS ai_reports (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS trade_accounts (
      user_id TEXT PRIMARY KEY,
      cash_usdt REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS trade_spot_holdings (
      user_id TEXT NOT NULL,
      asset TEXT NOT NULL,
      quantity REAL NOT NULL,
      avg_cost REAL NOT NULL,
      PRIMARY KEY(user_id, asset),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS trade_positions (
      user_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      market_type TEXT NOT NULL,
      side TEXT NOT NULL,
      quantity REAL NOT NULL,
      entry_price REAL NOT NULL,
      leverage INTEGER NOT NULL,
      margin_used REAL NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(user_id, symbol, market_type, side),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS trade_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      market_type TEXT NOT NULL,
      action TEXT NOT NULL,
      side TEXT NOT NULL,
      order_kind TEXT NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      leverage INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS power_wallets (
      user_id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL UNIQUE,
      power_balance REAL NOT NULL DEFAULT 0,
      redeemed_kwh REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS power_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tx_hash TEXT NOT NULL UNIQUE,
      action TEXT NOT NULL,
      token_amount REAL NOT NULL,
      kwh_amount REAL NOT NULL,
      unit_price REAL NOT NULL,
      grid_region TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS exchange_profiles (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL DEFAULT '',
      telegram_handle TEXT NOT NULL DEFAULT '',
      invite_code TEXT NOT NULL UNIQUE,
      inviter_code TEXT NOT NULL DEFAULT '',
      mode TEXT NOT NULL DEFAULT 'demo',
      fee_rate REAL NOT NULL DEFAULT 0.2,
      rebate_rate REAL NOT NULL DEFAULT 0.18,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS exchange_rebate_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      rebate_amount REAL NOT NULL,
      settlement_time TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS exchange_deposits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      network TEXT NOT NULL,
      asset TEXT NOT NULL,
      amount REAL NOT NULL,
      tx_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewer_note TEXT NOT NULL DEFAULT '',
      submitted_at TEXT NOT NULL,
      reviewed_at TEXT DEFAULT '',
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  migrateJsonIfNeeded(db);
  ensureColumn(db, "gaokao_reports", "class_name", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "gaokao_reports", "coaching_focus_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "gaokao_reports", "self_correction_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "gaokao_reports", "cohort_snapshot_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "gaokao_reports", "student_profile_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureMeta(db);
  seedShenlunRubrics(db);
  seedActivationCodes(db);
  seedKnowledgeSnippets(db);
  return db;
}

function ensureColumn(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
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
      id: "shenlun-essay-argument-shape",
      product: "shenlun",
      scenario: "essay",
      title: "大作文论证成型标准",
      content: "大作文不是把三个漂亮标题拼在一起，而是总论点先压准，再让每个分论点各自承担不同任务。高分段落通常能做到观点一句、分析一句、材料或现实例证一组、回扣一句，避免整段只有态度没有论证。",
      tags: ["大作文", "总论点", "分论点", "论证", "段落"]
    },
    {
      id: "shenlun-essay-material-lift",
      product: "shenlun",
      scenario: "essay",
      title: "大作文材料转化规则",
      content: "材料使用不是把案例重新讲一遍，而是把案例提炼成治理逻辑、制度原则或价值取向。凡是只复述故事、不解释故事说明什么，都会被视为材料联系浅、论证深度弱。",
      tags: ["大作文", "材料联系", "治理逻辑", "制度原则", "论证深度"]
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
      id: "shenlun-summary-object-lock",
      product: "shenlun",
      scenario: "summary",
      title: "归纳概括先锁对象",
      content: "归纳概括题最怕答着答着对象漂移。题目让概括问题，就不要混进过多对策；题目让概括原因，就不要把现象和影响一起塞进去。高分答案往往先锁准对象，再做分类整合。",
      tags: ["归纳概括", "概括对象", "问题", "原因", "影响"]
    },
    {
      id: "shenlun-summary-material-words",
      product: "shenlun",
      scenario: "summary",
      title: "归纳概括原词优先",
      content: "概括题加工材料不是自由发挥，而是先保留材料中的稳定表述和限定词，再做合并同类项。把“平台重复填报”改写成自己想象中的抽象概念，很容易出现提炼失真和审题跑偏。",
      tags: ["归纳概括", "材料原词", "限定词", "合并同类项", "提炼"]
    },
    {
      id: "shenlun-summary-precision",
      product: "shenlun",
      scenario: "summary",
      title: "归纳概括扣分重灾区",
      content: "归纳概括最常见扣分不是漏写整段，而是把材料原词换成了自己想象的概念，或者把问题、原因、影响混写，导致概括对象发散。",
      tags: ["归纳概括", "材料原词", "对象", "扣分点"]
    },
    {
      id: "shenlun-summary-zhonggong-fourstep",
      product: "shenlun",
      scenario: "summary",
      title: "中公四步法",
      content: "归纳概括可按审题、找点、梳理、书写四步推进。高分关键在问什么答什么、要点分类、规范表达和分条呈现。",
      tags: ["归纳概括", "中公", "四步法", "分条"]
    },
    {
      id: "shenlun-solution-landing",
      product: "shenlun",
      scenario: "solution",
      title: "提出对策题提分法",
      content: "提出对策题不看口号多不多，而看措施是否真正对应材料问题、主体是否明确、是否有执行路径和长效机制。",
      tags: ["提出对策", "主体", "执行路径", "长效机制"]
    },
    {
      id: "shenlun-solution-one-to-one",
      product: "shenlun",
      scenario: "solution",
      title: "对策题一一对应原则",
      content: "对策题先找问题，再写措施，最好能形成明显的一一对应关系。没有问题支撑的措施容易显得悬空；没有主体、步骤和反馈闭环的措施，即使方向正确，也会被认为操作性不足。",
      tags: ["提出对策", "问题对应", "主体", "步骤", "反馈闭环"]
    },
    {
      id: "shenlun-solution-boundary",
      product: "shenlun",
      scenario: "solution",
      title: "对策题越权扣分点",
      content: "提出对策题常见失分是把建议写得很大，却不符合题目身份和场景边界。题目如果是基层治理场景，就要优先写基层可执行、部门可协同、群众可感知的动作，而不是空泛上升到宏大制度口号。",
      tags: ["提出对策", "越权", "场景边界", "基层治理", "可执行"]
    },
    {
      id: "shenlun-solution-offcn-standard",
      product: "shenlun",
      scenario: "solution",
      title: "中公对策评分标准",
      content: "提出对策题先看针对性，再看可行性和操作性。建议必须对应问题，不能越权，最好能写出主体、客体、手段和目的。",
      tags: ["提出对策", "中公", "针对性", "可行性", "操作性"]
    },
    {
      id: "shenlun-analysis-depth",
      product: "shenlun",
      scenario: "analysis",
      title: "综合分析题深度标准",
      content: "综合分析题要先亮观点，再拆原因、影响和辩证关系。高分答案不是只会表态，而是能把材料矛盾讲透。",
      tags: ["综合分析", "观点", "原因", "影响", "辩证"]
    },
    {
      id: "shenlun-analysis-chain",
      product: "shenlun",
      scenario: "analysis",
      title: "综合分析因果链要求",
      content: "综合分析题的关键不是态度正确，而是分析链条完整。至少要说明现象为什么出现、会造成什么影响、背后有什么张力或边界，不能只写“要高度重视”“意义重大”这种空判断。",
      tags: ["综合分析", "因果链", "影响", "张力", "边界"]
    },
    {
      id: "shenlun-analysis-balance",
      product: "shenlun",
      scenario: "analysis",
      title: "综合分析辩证表达",
      content: "遇到涉及效率与公平、技术与人文、统一与差异等关系型题目时，不能只站一边表态。高分答案通常会先承认一方价值，再补另一方边界，最后提出平衡思路。",
      tags: ["综合分析", "辩证", "效率", "公平", "平衡"]
    },
    {
      id: "shenlun-essay-wuhongmin",
      product: "shenlun",
      scenario: "essay",
      title: "吴红民大作文五关键",
      content: "申论大作文高分常抓观点、标题、结构、内容和语言表达五项。中心观点不稳、标题无力、结构散乱，都会拖累总分。",
      tags: ["大作文", "吴红民", "观点", "标题", "结构"]
    },
    {
      id: "shenlun-official-format",
      product: "shenlun",
      scenario: "official",
      title: "贯彻执行题格式要求",
      content: "贯彻执行题先看文种格式，再看对象意识、任务目标和措施安排。格式一错，哪怕内容还行，也很难拿高分。",
      tags: ["贯彻执行", "文种", "格式", "对象意识"]
    },
    {
      id: "shenlun-official-scene-language",
      product: "shenlun",
      scenario: "official",
      title: "贯彻执行题场景语言",
      content: "贯彻执行题除了格式对，还要像这个场景里真的会发出的文稿。写给群众就要通俗、可理解、可执行；写给下级单位就要任务清晰、分工明确、节点明确，不能整篇都像大作文议论文。",
      tags: ["贯彻执行", "场景语言", "群众", "下级单位", "任务分工"]
    },
    {
      id: "shenlun-official-task-arrangement",
      product: "shenlun",
      scenario: "official",
      title: "贯彻执行题安排感",
      content: "贯彻执行题高分常见于“像真文”。正文里最好出现目标、步骤、责任、时间、参与方式或注意事项中的若干项，这样才能体现任务安排，而不是只有原则口号。",
      tags: ["贯彻执行", "目标", "步骤", "责任", "时间安排"]
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
    },
    {
      id: "gaokao-chinese-review",
      product: "gaokao",
      scenario: "chinese",
      title: "高考语文作文复核重点",
      content: "语文作文先看是否偏题，再看中心是否稳定、材料是否支撑观点、结构是否有推进，最后再决定表达分是否需要上调或下调。",
      tags: ["语文", "审题", "立意", "结构", "复核"]
    },
    {
      id: "gaokao-chinese-growth",
      product: "gaokao",
      scenario: "chinese",
      title: "语文作文提分路径",
      content: "语文作文提分通常不是靠堆辞藻，而是先把中心句写准，再让每段只完成一个分任务，例子要服务观点，结尾要回扣题意。",
      tags: ["语文", "中心句", "段落", "例子", "结尾"]
    },
    {
      id: "gaokao-chinese-depth",
      product: "gaokao",
      scenario: "chinese",
      title: "语文作文名师常抓点",
      content: "名师讲评常抓四点：审题是否压准，分论点是否各司其职，例子有没有真正证明观点，结尾有没有把题目重新扣回来。",
      tags: ["语文", "审题", "分论点", "例子", "结尾"]
    },
    {
      id: "gaokao-chinese-zhengguihua",
      product: "gaokao",
      scenario: "chinese",
      title: "郑桂华思辨导向",
      content: "开放作文题不只是看会不会举例，更看能否凝练生活经验、展开反思，并在写作中形成自己的判断。",
      tags: ["语文", "郑桂华", "思辨", "生活经验", "判断"]
    },
    {
      id: "gaokao-chinese-liyanfang",
      product: "gaokao",
      scenario: "chinese",
      title: "李燕芳现实关照",
      content: "遇到科技、时代类作文题，要把现实背景、青年立场和辩证思考结合起来，不能只写技术好坏的表面态度。",
      tags: ["语文", "李燕芳", "现实关照", "青年立场", "辩证"]
    },
    {
      id: "gaokao-chinese-liuchunlei",
      product: "gaokao",
      scenario: "chinese",
      title: "刘春雷核心概念法",
      content: "面对关系型或思辨型作文，先抓材料里的核心概念，再拆它的利弊、多与少、浅与深等维度，文章才容易有层次。",
      tags: ["语文", "刘春雷", "核心概念", "思辨", "层次"]
    },
    {
      id: "gaokao-english-review",
      product: "gaokao",
      scenario: "english",
      title: "高考英语书面表达复核重点",
      content: "英语作文复核先看任务是否完成、要点是否覆盖，再看段落结构和语法准确性，最后判断词汇句式是否真正带来加分。",
      tags: ["英语", "任务完成", "要点覆盖", "语法", "复核"]
    },
    {
      id: "gaokao-english-growth",
      product: "gaokao",
      scenario: "english",
      title: "英语作文提分路径",
      content: "英语作文想稳分，先把要点写全，再用清晰连接词组织段落，优先保证基础语法正确，再逐步增加高级句式而不是一次堆太多复杂结构。",
      tags: ["英语", "要点", "连接词", "语法", "句式"]
    },
    {
      id: "gaokao-english-teacher-lens",
      product: "gaokao",
      scenario: "english",
      title: "英语作文老师复核视角",
      content: "老师复核英语作文时，先看任务是否完成，再看表达是否清楚，最后才看高级句式。基础错误多时，花哨表达通常不能加分。",
      tags: ["英语", "任务完成", "表达清楚", "高级句式", "复核"]
    },
    {
      id: "gaokao-english-beijing-experts",
      product: "gaokao",
      scenario: "english",
      title: "北京卷专家共识",
      content: "英语书面表达的高分基础是得体、准确、有效沟通。先把情境任务完成好，再用少量稳定的亮点句拉分，比堆复杂句更可靠。",
      tags: ["英语", "北京卷", "得体", "准确", "沟通"]
    }
  ];
  const stmt = db.prepare(`
    INSERT INTO knowledge_snippets (id, product, scenario, title, content, tags_json)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      product = excluded.product,
      scenario = excluded.scenario,
      title = excluded.title,
      content = excluded.content,
      tags_json = excluded.tags_json
  `);
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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function saveDataUrlAsset(dataUrl, prefix) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("INVALID_IMAGE_DATA");
  }
  const mime = match[1].toLowerCase();
  const ext = mime.includes("png") ? ".png" : mime.includes("webp") ? ".webp" : ".jpg";
  const fileName = `${slugify(prefix)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const absolutePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(absolutePath, Buffer.from(match[2], "base64"));
  return `/data/uploads/${fileName}`;
}

function generateWhyWrong(knowledgePoint, errorType, errorRate) {
  const kp = String(knowledgePoint || "");
  if (kp.includes("导数")) return "大多数学生会求导，但做完第一问后不会把导函数符号转成单调区间，卡在条件转化这一步。";
  if (kp.includes("三角")) return "学生看到题目后方向选错，不是公式背错，而是识别不出该用哪类变形入口。";
  if (kp.includes("数列")) return "通项公式建立正确，但求和时分类讨论不完整，漏掉边界情况。";
  if (kp.includes("解析几何")) return "建系和列方程没问题，但消元过程中代入方向错误或漏根，导致结果丢分。";
  if (kp.includes("立体几何")) return "证明关系步骤跳跃，缺少中间引理，步骤分损失严重。";
  if (kp.includes("概率")) return "样本空间确定正确，但在列举等可能事件时遗漏了部分情况。";
  return "该题错误集中在关键步骤的推导环节，思路方向多数正确但过程不完整。";
}

function generateTeachFocus(knowledgePoint, errorType) {
  const kp = String(knowledgePoint || "");
  if (kp.includes("导数")) return "讲评先示范\"求完导后如何判断符号和区间\"这一步，不要只讲最终答案。";
  if (kp.includes("三角")) return "先带学生判断题型（化简型还是求值型），再进公式，不要从公式开始讲。";
  if (kp.includes("数列")) return "重点讲分类讨论的触发条件，带学生一起找\"什么情况下需要分情况\"。";
  if (kp.includes("解析几何")) return "重点带学生演练消元步骤的顺序选择，减少代入错误和漏根。";
  if (kp.includes("立体几何")) return "让学生自己说出中间步骤，老师补充缺失的引理，不要直接给步骤。";
  if (kp.includes("概率")) return "在黑板上完整列出样本空间，让学生找遗漏点，再计算。";
  return "重点讲关键步骤的选择逻辑，而不是直接展示答案。";
}

function getSubjectPromptContext(knowledgePoint) {
  const templates = {
    "导数": {
      role: "你是一位专门分析高考导数题的数学老师",
      commonErrors: ["忘记验证端点", "链式法则出错", "符号处理失误", "漏讨论定义域边界"],
      analysisFocus: "重点判断学生在哪一步出现逻辑断裂，是否混淆极值与最值"
    },
    "解析几何": {
      role: "你是一位专门分析高考解析几何题的数学老师",
      commonErrors: ["设参后忘记代入约束条件", "斜率不存在未单独讨论", "韦达定理使用错误", "算术失误"],
      analysisFocus: "重点关注学生是否遗漏特殊情况讨论，以及代数运算中的错误"
    },
    "三角函数": {
      role: "你是一位专门分析高考三角函数题的数学老师",
      commonErrors: ["辅助角公式符号搞错", "相位偏移方向搞反", "忘记考虑定义域对值域的限制"],
      analysisFocus: "重点判断变形步骤是否正确，以及值域判断是否受定义域约束"
    },
    "物理受力": {
      role: "你是一位专门分析高考物理受力分析题的物理老师",
      commonErrors: ["漏力（摩擦力或支持力）", "受力方向画错", "坐标轴选取不合理", "静摩擦力方向错误"],
      analysisFocus: "重点看受力图是否完整，以及方程是否与受力图一致"
    },
    "电学": {
      role: "你是一位专门分析高考电学题的物理老师",
      commonErrors: ["串并联判断错误", "内阻遗漏", "基尔霍夫定律列式符号错误", "功率公式用错"],
      analysisFocus: "重点看电路分析逻辑是否正确，各段电压电流是否自洽"
    }
  };

  const matched = Object.keys(templates).find((k) =>
    knowledgePoint && knowledgePoint.includes(k)
  );

  return matched ? templates[matched] : {
    role: "你是一位经验丰富的高考阅卷老师",
    commonErrors: ["审题不清", "公式记忆错误", "计算失误", "答非所问"],
    analysisFocus: "判断学生主要的失分原因"
  };
}

function normalizeStandardSteps(input) {
  if (Array.isArray(input)) {
    return input.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(input || "")
    .split(/\s*->\s*|\r?\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildAnalysisPrompt(questionData, knowledgePoint) {
  const ctx = getSubjectPromptContext(knowledgePoint);
  const standardSteps = normalizeStandardSteps(questionData.standardSteps || questionData.standard_steps);
  return `
${ctx.role}，请严格按以下格式分析学生的作答。

【本题信息】
题目：${questionData.questionText || questionData.question_text || "见图片"}
满分：${questionData.fullScore || questionData.score || "未知"}分
知识点：${knowledgePoint || questionData.knowledge_point || "未标注"}
标准步骤：
${standardSteps.map((s, i) => `  第${i + 1}步：${s}`).join("\n") || "  （未录入标准步骤）"}

【本题常见错误类型】（仅供你判断参考，不要直接告诉学生）
${ctx.commonErrors.map((e) => `  - ${e}`).join("\n")}

【分析重点】
${ctx.analysisFocus}

【学生作答见附图】

请只输出以下 JSON，不要有任何其他文字：
{
  "step_reached": "学生做到了哪一步（填步骤序号和名称）",
  "main_error_type": "主要错误类型",
  "secondary_error_type": "次要错误类型（没有填null）",
  "weak_knowledge_points": ["薄弱知识点"],
  "weak_ability_points": ["薄弱能力"],
  "teacher_feedback": "给老师的专业诊断，50字以内",
  "student_feedback": "给学生的鼓励式反馈，温和语气，80字以内",
  "next_practice_focus": "下一步具体练习建议",
  "confidence": 0.0到1.0之间的小数
}
`;
}

function buildFallback(knowledgePoint, reason) {
  const fallbacks = {
    "导数": {
      teacher_feedback: "学生在导数计算或极值判断环节存在问题，建议针对性复习导数综合题",
      student_feedback: "这道导数题你已经有了正确方向！主要加强求导运算的准确性，多练几道就会了。",
      next_practice_focus: "导数求值与极值判断专项练习"
    },
    "解析几何": {
      teacher_feedback: "学生在联立方程或几何量计算环节出现问题，注意是否有特殊情况遗漏",
      student_feedback: "解析几何需要耐心，你的思路基本对！主要是计算细节再仔细一些。",
      next_practice_focus: "直线与圆锥曲线位置关系专项练习"
    },
    "三角函数": {
      teacher_feedback: "学生在三角变形或值域判断上出现偏差，建议复习辅助角公式应用",
      student_feedback: "三角函数变形很考验细心，你做到这一步已经不错了！继续加油。",
      next_practice_focus: "三角函数辅助角公式与值域专项练习"
    },
    "物理受力": {
      teacher_feedback: "学生受力分析存在遗漏或方向错误，建议重点训练隔离法",
      student_feedback: "受力分析是物理的基础，画图再仔细一点你肯定能做对！",
      next_practice_focus: "隔离法与整体法受力分析专项练习"
    },
    "电学": {
      teacher_feedback: "学生在电路判断或计算环节出现错误，建议复习串并联基本规律",
      student_feedback: "电学题计算量大，你能写出这些步骤很棒！继续巩固基本规律就好。",
      next_practice_focus: "串并联电路综合计算专项练习"
    }
  };

  const matched = Object.keys(fallbacks).find((k) => knowledgePoint && knowledgePoint.includes(k));
  const base = matched ? fallbacks[matched] : {
    teacher_feedback: "学生在本题核心步骤存在障碍，建议面批了解具体卡点",
    student_feedback: "这题有点难，但你能写出这些步骤已经很棒了！我们一起找找卡在哪里。",
    next_practice_focus: "本知识点基础题型专项复习"
  };

  return {
    step_reached: "未能确定",
    main_error_type: "待面批确认",
    secondary_error_type: null,
    weak_knowledge_points: [knowledgePoint || "待确认"],
    weak_ability_points: ["待确认"],
    confidence: 0.3,
    _is_fallback: true,
    _fallback_reason: reason,
    ...base
  };
}

function extractStepIndex(stepReached, stepsLength = 0) {
  if (typeof stepReached === "number" && Number.isFinite(stepReached)) {
    return stepReached;
  }
  const text = String(stepReached || "");
  const matched = text.match(/第?\s*(\d+)\s*步?/);
  if (matched) return Number(matched[1]);
  if (stepsLength > 0) {
    for (let i = 0; i < stepsLength; i += 1) {
      if (text.includes(`第${i + 1}步`)) return i + 1;
    }
  }
  return null;
}

function validateAndFallback(aiRawOutput, questionData, knowledgePoint) {
  let parsed;

  try {
    const rawText = typeof aiRawOutput === "string"
      ? aiRawOutput
      : JSON.stringify(aiRawOutput || {});
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    parsed = typeof aiRawOutput === "string" ? JSON.parse(cleaned) : aiRawOutput;
  } catch (e) {
    return buildFallback(knowledgePoint, "json_parse_error");
  }

  const confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence) || confidence < 0.5) {
    return buildFallback(knowledgePoint, "low_confidence");
  }

  const required = ["step_reached", "main_error_type", "teacher_feedback", "student_feedback"];
  required.forEach((k) => {
    if (!parsed[k]) {
      const fb = buildFallback(knowledgePoint, "missing_field");
      parsed[k] = fb[k];
      parsed._patched = parsed._patched || [];
      parsed._patched.push(k);
    }
  });

  const stepsLength = normalizeStandardSteps(questionData.standardSteps || questionData.standard_steps).length;
  const numericStep = extractStepIndex(parsed.step_reached, stepsLength);
  if (numericStep) {
    parsed.step_reached_label = String(parsed.step_reached);
    parsed.step_reached = numericStep;
  }

  return parsed;
}

async function analyzeWithOpenAIVision(imageDataUrl, question) {
  const questionData = {
    questionText: question.question_text || question.standard_answer || "见图片",
    fullScore: question.score,
    standardSteps: question.standard_steps,
    knowledgePoint: question.knowledge_point
  };
  const prompt = buildAnalysisPrompt(questionData, questionData.knowledgePoint);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
            { type: "text", text: prompt }
          ]
        }],
        max_tokens: 800,
        temperature: 0.1
      })
    });
    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI vision error:", response.status, err.slice(0, 200));
      return null;
    }
    const data = await response.json();
    // 记录真实token用量，解决"到底多少钱"的争议
    const usage = data.usage || {};
    console.log(`[OpenAI cost] prompt_tokens=${usage.prompt_tokens} completion_tokens=${usage.completion_tokens} total=${usage.total_tokens} est_cost_rmb=¥${((usage.prompt_tokens||0)*0.15/1e6*7.2 + (usage.completion_tokens||0)*0.6/1e6*7.2).toFixed(5)}`);
    const text = data.choices?.[0]?.message?.content || "";
    const result = validateAndFallback(text, questionData, questionData.knowledgePoint);
    if (result) result._source = "openai_vision";
    return result;
  } catch (err) {
    console.error("OpenAI vision exception:", err.message);
    return null;
  }
}

async function analyzeWithDeepSeekText(question) {
  const questionData = {
    questionText: question.question_text || question.standard_answer || "见图片",
    fullScore: question.score,
    standardSteps: question.standard_steps,
    knowledgePoint: question.knowledge_point
  };
  const prompt = buildAnalysisPrompt(questionData, questionData.knowledgePoint);
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL || "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.1
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const result = validateAndFallback(text, questionData, questionData.knowledgePoint);
    if (result) result._source = "deepseek_text";
    return result;
  } catch (err) {
    console.error("DeepSeek text error:", err.message);
    return null;
  }
}

// Qwen-VL通过SiliconFlow调用（OpenAI兼容接口）
// 申请方法：https://siliconflow.cn 注册，免费额度够测试用
async function analyzeWithQwenVL(imageDataUrl, question) {
  if (!QWEN_API_KEY) return null;
  const questionData = {
    questionText: question.question_text || question.standard_answer || "见图片",
    fullScore: question.score,
    standardSteps: question.standard_steps,
    knowledgePoint: question.knowledge_point
  };
  const prompt = buildAnalysisPrompt(questionData, questionData.knowledgePoint);
  try {
    const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: prompt }
          ]
        }],
        max_tokens: 800,
        temperature: 0.1
      })
    });
    if (!response.ok) {
      const err = await response.text();
      console.error("Qwen-VL error:", response.status, err.slice(0, 200));
      return null;
    }
    const data = await response.json();
    // 记录token用量，方便核算真实成本
    const usage = data.usage || {};
    console.log(`[Qwen-VL cost] prompt_tokens=${usage.prompt_tokens} completion_tokens=${usage.completion_tokens} total=${usage.total_tokens}`);
    const text = data.choices?.[0]?.message?.content || "";
    const result = validateAndFallback(text, questionData, questionData.knowledgePoint);
    if (result) result._source = "qwen_vision";
    return result;
  } catch (err) {
    console.error("Qwen-VL exception:", err.message);
    return null;
  }
}

async function analyzeStudentAnswer(imageDataUrl, question) {
  // 优先用Qwen-VL（便宜3-5倍），没有则用OpenAI，再没有用DeepSeek纯文字
  if (QWEN_API_KEY) {
    const result = await analyzeWithQwenVL(imageDataUrl, question);
    if (result) return result;
    // Qwen失败则降级到OpenAI
  }
  if (OPENAI_API_KEY) {
    return await analyzeWithOpenAIVision(imageDataUrl, question);
  }
  if (DEEPSEEK_API_KEY) {
    return await analyzeWithDeepSeekText(question);
  }
  return null;
}

function createMockAiAnalysis(question, scoreLevel = 0) {
  // scoreLevel: 0 = 中等失分(50-95%), 1 = 严重失分(<50%), 2 = 接近满分(>95%,小问题)
  const kp = String(question.knowledgePoint || question.knowledge_point || "");

  const profiles = {
    "导数": [
      { step_reached: 2, main_error_type: "方法问题", secondary_error_type: "条件转化失败",
        weak_knowledge_points: ["导函数符号判断", "单调区间建立"],
        weak_ability_points: ["条件转化", "不等式解法"],
        teacher_feedback: "该生能正确求出导函数，但令f'(x)>0后不会建立区间不等式，卡在第2步。讲评时重点示范\"求完导之后怎么判断正负号和区间\"。",
        student_feedback: "你已经会求导了！问题在求完导之后——要把f'(x)>0变成一个关于x的不等式再去解，这周专练这一步。",
        next_practice_focus: "导函数符号判断与区间建立专项3题" },
      { step_reached: 1, main_error_type: "步骤问题", secondary_error_type: "审题偏差",
        weak_knowledge_points: ["导数应用题型识别", "求导规则"],
        weak_ability_points: ["题型判断", "切入点选择"],
        teacher_feedback: "该生看到导数题就开始求导，但没有先判断题目问的是单调性还是极值还是最值，方向从一开始就偏了。建议先训练\"读完题先问自己题目让我干什么\"。",
        student_feedback: "这题你第一步方向就错了，不是求导的问题。先读题：题目让你求的是什么？单调区间还是极值？方向对了再下手。",
        next_practice_focus: "导数应用题型识别与切入点判断专项" },
      { step_reached: 3, main_error_type: "习惯问题", secondary_error_type: "结论不完整",
        weak_knowledge_points: ["结论规范表达"],
        weak_ability_points: ["书写完整性"],
        teacher_feedback: "该生思路和计算完全正确，失分在最后结论没有写成\"综上，f(x)在(a,b)上单调递增\"的规范格式，提醒按格式写结论。",
        student_feedback: "你方向和计算都对！最后结论按格式写：'综上，f(x)在...上单调递增'，这样就能拿满分。",
        next_practice_focus: "导数解答题结论规范书写训练" }
    ],
    "三角": [
      { step_reached: 2, main_error_type: "方法问题", secondary_error_type: "公式选择错误",
        weak_knowledge_points: ["二倍角公式", "辅助角公式", "和差化积"],
        weak_ability_points: ["公式变形方向判断", "同角转化"],
        teacher_feedback: "该生知道要用三角公式，但选择了错误的变形方向，导致式子越来越复杂。讲评时不要只讲答案，先带学生判断\"看到asinx+bcosx要想到辅助角，看到sin2x要想到二倍角\"。",
        student_feedback: "你知道要变形，但方向选错了。记住：看到sin和cos的和就想辅助角公式，看到2倍角就想降次。专练公式选择的判断。",
        next_practice_focus: "三角公式选择方向专项训练" },
      { step_reached: 1, main_error_type: "步骤问题", secondary_error_type: "题型识别失败",
        weak_knowledge_points: ["三角函数题型分类", "化简与求值的区别"],
        weak_ability_points: ["题型识别", "解题路径规划"],
        teacher_feedback: "该生看到三角式就直接套公式，没有先判断题型是\"化简\"还是\"求值\"，导致变形路径完全错误。建议从题型分类开始训练。",
        student_feedback: "先想：这道题让你化简还是求值？这两种题的方向完全不同。搞清楚再动笔。",
        next_practice_focus: "三角函数题型识别与路径选择专项" },
      { step_reached: 3, main_error_type: "习惯问题", secondary_error_type: "范围遗漏",
        weak_knowledge_points: ["角的范围核查", "定义域约束"],
        weak_ability_points: ["结果验证", "范围意识"],
        teacher_feedback: "该生变形过程完全正确，但最后忘记检查角的范围，导致答案不完整或有增根。提醒每次最后一步都要核查范围。",
        student_feedback: "算完之后要检查一步：你的角x在题目限定的范围内吗？三角函数很容易漏掉这个检查。",
        next_practice_focus: "三角函数范围核查与结果验证训练" }
    ],
    "数列": [
      { step_reached: 2, main_error_type: "方法问题", secondary_error_type: "求和方法选错",
        weak_knowledge_points: ["错位相减法", "裂项求和", "等差等比求和"],
        weak_ability_points: ["求和方法匹配", "分类意识"],
        teacher_feedback: "该生能正确写出通项公式，但在求和时方法选错（比如对n·qⁿ型用了普通等比求和），导致过程卡死。讲评时重点训练\"看到什么形式的通项选什么求和方法\"。",
        student_feedback: "通项你建对了！求和的时候要先判断是什么类型：纯等差/等比用公式，有n乘q^n的用错位相减法，记住这个分类就够了。",
        next_practice_focus: "数列求和方法识别与匹配专项" },
      { step_reached: 1, main_error_type: "步骤问题", secondary_error_type: "数列类型判断失误",
        weak_knowledge_points: ["等差数列识别", "等比数列识别", "递推关系"],
        weak_ability_points: ["条件提取", "数列类型判断"],
        teacher_feedback: "该生从已知条件无法判断是等差还是等比数列，导致公式用错。建议专练从条件特征识别数列类型。",
        student_feedback: "先看：相邻两项之差固定→等差；之比固定→等比；有递推关系→先找规律。判断对了再套公式。",
        next_practice_focus: "数列类型识别与条件分析专项" },
      { step_reached: 3, main_error_type: "习惯问题", secondary_error_type: "计算粗心",
        weak_knowledge_points: ["代入计算准确性"],
        weak_ability_points: ["运算规范", "结果检验"],
        teacher_feedback: "该生方法和路径完全正确，失分在代入计算环节粗心出错。要求写出每步计算过程，不跳步。",
        student_feedback: "方法全对！计算时把每步都写出来，不要跳步，写完验算一遍就能拿满分。",
        next_practice_focus: "数列计算规范与检验训练" }
    ],
    "解析几何": [
      { step_reached: 2, main_error_type: "方法问题", secondary_error_type: "消元策略失误",
        weak_knowledge_points: ["联立方程消元", "韦达定理应用", "判别式"],
        weak_ability_points: ["消元策略选择", "代数化简"],
        teacher_feedback: "该生能正确建立方程组，但消元时代入方向选错或漏考虑判别式，导致计算量暴增或漏根。讲评时重点演练消元顺序的选择。",
        student_feedback: "方程列对了！消元时先想：从哪个方程代入计算量最小？还有，联立方程一定要考虑判别式是否大于0。",
        next_practice_focus: "解析几何联立消元策略专项" },
      { step_reached: 1, main_error_type: "步骤问题", secondary_error_type: "建模转化失败",
        weak_knowledge_points: ["几何条件代数化", "坐标系选择", "曲线方程建立"],
        weak_ability_points: ["几何直觉", "代数建模"],
        teacher_feedback: "该生看到图形无法把几何条件转化为代数方程，卡在第一步。建议专练\"把已知几何关系翻译成坐标方程\"。",
        student_feedback: "解析几何的核心是：把所有已知条件翻译成含x和y的方程。先把题目的每句话都写成方程，再联立。",
        next_practice_focus: "几何条件代数化翻译专项训练" },
      { step_reached: 3, main_error_type: "习惯问题", secondary_error_type: "增根未验证",
        weak_knowledge_points: ["结果代回验证", "排除增根"],
        weak_ability_points: ["结果合理性检验"],
        teacher_feedback: "该生计算结果正确，但没有代回原方程检验是否满足几何条件（常见增根：直线斜率不存在的情况）。",
        student_feedback: "算完记得把结果代回去验证一遍——解析几何特别容易出增根，比如斜率不存在的情况。",
        next_practice_focus: "解析几何结果验证与增根排查专项" }
    ],
    "立体几何": [
      { step_reached: 2, main_error_type: "方法问题", secondary_error_type: "证明步骤跳跃",
        weak_knowledge_points: ["线面平行证明", "线面垂直证明", "二面角计算"],
        weak_ability_points: ["推理链完整性", "引理使用规范"],
        teacher_feedback: "该生空间关系判断正确，但证明过程跳过关键引理，导致步骤不完整失分。讲评时让学生自己补充缺少的步骤。",
        student_feedback: "你空间感是对的！但证明时每一步都要写清楚用了哪条定理，不能直接跳到结论。",
        next_practice_focus: "立体几何证明完整步骤规范训练" },
      { step_reached: 1, main_error_type: "步骤问题", secondary_error_type: "空间关系判断失误",
        weak_knowledge_points: ["空间线面位置关系", "空间想象能力"],
        weak_ability_points: ["空间可视化", "图形分析"],
        teacher_feedback: "该生空间想象能力弱，在图形中无法正确判断线面关系，导致证明方向错误。建议多画截面图辅助分析。",
        student_feedback: "碰到立体几何先画图，把所有条件标在图上，在图上找关系，比凭空想要清楚很多。",
        next_practice_focus: "立体几何空间关系识别与画图专项" },
      { step_reached: 3, main_error_type: "习惯问题", secondary_error_type: "计算粗心",
        weak_knowledge_points: ["三角计算", "空间距离公式"],
        weak_ability_points: ["计算准确性"],
        teacher_feedback: "该生证明部分完全正确，最后数值计算粗心失分。提醒写出完整计算过程不跳步。",
        student_feedback: "证明做得很好！最后计算别着急，把过程写完整，细心一点就能拿满分。",
        next_practice_focus: "立体几何计算规范训练" }
    ],
    "概率": [
      { step_reached: 2, main_error_type: "方法问题", secondary_error_type: "事件遗漏",
        weak_knowledge_points: ["古典概型列举", "条件概率", "独立事件"],
        weak_ability_points: ["事件分类完整性", "概率计算"],
        teacher_feedback: "该生确定了样本空间，但在列举目标事件时遗漏了部分情况，导致概率值偏小。讲评时用树形图或列表帮助系统列举。",
        student_feedback: "求概率时，把所有可能的情况画成树形图，一个都不能漏。",
        next_practice_focus: "概率事件系统列举与树形图专项" },
      { step_reached: 1, main_error_type: "步骤问题", secondary_error_type: "模型判断失误",
        weak_knowledge_points: ["概率模型识别", "样本空间确定"],
        weak_ability_points: ["问题建模", "随机变量理解"],
        teacher_feedback: "该生无法判断题目属于古典概型还是条件概率，从第一步就走错路。建议从概率模型分类开始训练。",
        student_feedback: "先判断：题目是等可能的古典概型，还是有条件限制的条件概率？判断对了再解题。",
        next_practice_focus: "概率模型识别与分类专项训练" },
      { step_reached: 3, main_error_type: "习惯问题", secondary_error_type: "化简出错",
        weak_knowledge_points: ["分数化简", "数值计算"],
        weak_ability_points: ["计算准确性"],
        teacher_feedback: "该生概率计算过程正确，最后分数化简出错。提醒约分要仔细。",
        student_feedback: "思路完全正确！最后约分的时候检查一下，别在最后一步丢分。",
        next_practice_focus: "概率计算与化简规范训练" }
    ]
  };

  // 匹配知识点profile
  let levels = null;
  for (const [key, val] of Object.entries(profiles)) {
    if (kp.includes(key)) { levels = val; break; }
  }

  // 通用兜底
  if (!levels) {
    levels = [
      { step_reached: 2, main_error_type: "方法问题", secondary_error_type: "步骤断裂",
        weak_knowledge_points: [kp || "核心方法"],
        weak_ability_points: ["条件转化", "方法选择"],
        teacher_feedback: `该生在${kp}题上方向正确但关键步骤断裂，建议示范关键步骤的推导过程。`,
        student_feedback: "思路方向对了，关键步骤再专项练一练。",
        next_practice_focus: `${kp}关键步骤专项练习` },
      { step_reached: 1, main_error_type: "步骤问题", secondary_error_type: "审题偏差",
        weak_knowledge_points: [kp || "基础概念"],
        weak_ability_points: ["题型识别", "切入点判断"],
        teacher_feedback: `该生在${kp}题上从切入点就出现偏差，建议从题型识别开始训练。`,
        student_feedback: "先读题搞清楚让你干什么，方向对了再动笔。",
        next_practice_focus: `${kp}题型识别专项` },
      { step_reached: 3, main_error_type: "习惯问题", secondary_error_type: "规范书写",
        weak_knowledge_points: ["书写规范"],
        weak_ability_points: ["表达完整性"],
        teacher_feedback: "该生思路正确，步骤书写不够完整导致步骤分损失。",
        student_feedback: "方向是对的，把步骤写完整就能多拿分。",
        next_practice_focus: "规范书写专项训练" }
    ];
  }

  const level = Math.max(0, Math.min(2, scoreLevel));
  return { ...levels[level], confidence: level === 1 ? "高" : "中" };
}

function buildDefaultQuestions(examId, count = 8) {
  const templates = [
    ["1", 12, "函数与导数", "选择题", "基础", "函数定义域与单调性", "识别题型 -> 提取定义域 -> 判断单调性 -> 回扣选项"],
    ["2", 12, "三角函数", "选择题", "基础", "三角恒等变换", "识别结构 -> 选择公式 -> 完成变形 -> 检查范围"],
    ["3", 12, "数列", "填空题", "中档", "等差等比数列", "提取条件 -> 建立通项/递推 -> 求目标量"],
    ["4", 12, "概率统计", "填空题", "中档", "概率与统计计算", "明确样本空间 -> 计算事件概率 -> 检查条件"],
    ["5", 18, "立体几何", "解答题", "中档", "空间线面关系", "画图 -> 设量 -> 证明关系 -> 计算结果"],
    ["6", 18, "解析几何", "解答题", "中高", "直线与圆锥曲线", "建系 -> 列方程 -> 消元 -> 回扣几何意义"],
    ["7", 18, "导数", "解答题", "中高", "单调性与极值", "求导 -> 解不等式 -> 分区间讨论 -> 写结论"],
    ["8", 16, "压轴综合", "解答题", "高", "函数综合", "识别模型 -> 设中间量 -> 分类讨论 -> 检验边界"]
  ].slice(0, count);
  const stmt = db.prepare(`
    INSERT INTO questions (
      id, exam_id, question_no, score, knowledge_point, question_type, difficulty, standard_answer, standard_steps
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  templates.forEach((item) => {
    stmt.run(
      randomUUID(),
      examId,
      item[0],
      item[1],
      item[2],
      item[3],
      item[4],
      item[5],
      item[6]
    );
  });
}

function ensureStudentRecord(name, className, studentNo) {
  const normalizedName = String(name || "").trim() || "未命名学生";
  const normalizedClass = String(className || "").trim() || "未分班";
  const normalizedNo = String(studentNo || "").trim() || `TEMP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const existing = db.prepare("SELECT * FROM students WHERE student_no = ? AND class_name = ?").get(normalizedNo, normalizedClass)
    || db.prepare("SELECT * FROM students WHERE name = ? AND class_name = ?").get(normalizedName, normalizedClass);
  if (existing) return existing;
  const row = {
    id: randomUUID(),
    name: normalizedName,
    class_name: normalizedClass,
    student_no: normalizedNo
  };
  db.prepare("INSERT INTO students (id, name, class_name, student_no) VALUES (?, ?, ?, ?)").run(
    row.id,
    row.name,
    row.class_name,
    row.student_no
  );
  return row;
}

function listExamsWithSummary() {
  const exams = db.prepare(`
    SELECT
      e.*,
      COUNT(DISTINCT ss.student_id) AS student_count,
      COALESCE(ROUND(AVG(ss.total_score), 1), 0) AS average_score
    FROM exams e
    LEFT JOIN student_scores ss ON ss.exam_id = e.id
    GROUP BY e.id
    ORDER BY e.date DESC, e.created_at DESC
  `).all();
  const mapped = exams.map((row) => ({
    id: row.id,
    name: row.name,
    date: row.date,
    subject: row.subject,
    className: row.class_name,
    createdAt: row.created_at,
    studentCount: row.student_count,
    averageScore: row.average_score
  }));
  return mapped.map((exam, index) => {
    const nextOlder = mapped[index + 1];
    if (!nextOlder) {
      return { ...exam, scoreChange: "", changeTrend: "" };
    }
    const diff = Number(exam.averageScore || 0) - Number(nextOlder.averageScore || 0);
    return {
      ...exam,
      scoreChange: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}`,
      changeTrend: diff >= 0 ? "up" : "down"
    };
  });
}

function buildExamAnalysis(examId) {
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId);
  if (!exam) throw new Error("EXAM_NOT_FOUND");
  const questions = db.prepare("SELECT * FROM questions WHERE exam_id = ? ORDER BY CAST(question_no AS INTEGER), question_no").all(examId);
  const studentRows = db.prepare(`
    SELECT
      s.id,
      s.name,
      s.class_name,
      s.student_no,
      ss.total_score
    FROM student_scores ss
    JOIN students s ON s.id = ss.student_id
    WHERE ss.exam_id = ?
    ORDER BY ss.total_score ASC, s.name ASC
  `).all(examId);
  const averageScore = studentRows.length
    ? Number((studentRows.reduce((sum, item) => sum + Number(item.total_score || 0), 0) / studentRows.length).toFixed(1))
    : 0;

  const questionStats = questions.map((question) => {
    const rows = db.prepare("SELECT score_got, ai_analysis FROM question_scores WHERE exam_id = ? AND question_id = ?").all(examId, question.id);
    const wrongCount = rows.filter((row) => Number(row.score_got) < Number(question.score)).length;
    const errorRate = rows.length ? Math.round((wrongCount / rows.length) * 100) : 0;
    const reasonCounter = new Map();
    rows.forEach((row) => {
      const parsed = safeJsonParse(row.ai_analysis || "{}");
      const label = parsed.main_error_type || "未分类";
      reasonCounter.set(label, (reasonCounter.get(label) || 0) + 1);
    });
    const topReason = [...reasonCounter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "方法问题";
    return {
      questionId: question.id,
      questionNo: question.question_no,
      score: question.score,
      knowledgePoint: question.knowledge_point,
      questionType: question.question_type,
      difficulty: question.difficulty,
      errorRate,
      topReason,
      standardSteps: question.standard_steps,
      whyWrong: generateWhyWrong(question.knowledge_point, topReason, errorRate),
      teachFocus: generateTeachFocus(question.knowledge_point, topReason),
      priority: errorRate >= 55 ? "高" : errorRate >= 35 ? "中" : "低"
    };
  });

  const issueCounter = new Map();
  db.prepare("SELECT ai_analysis FROM question_scores WHERE exam_id = ?").all(examId).forEach((row) => {
    const parsed = safeJsonParse(row.ai_analysis || "{}");
    [parsed.main_error_type, parsed.secondary_error_type].filter(Boolean).forEach((label) => {
      issueCounter.set(label, (issueCounter.get(label) || 0) + 1);
    });
  });

  const highRiskStudents = studentRows.slice(0, 5).map((student) => ({
    id: student.id,
    name: student.name,
    totalScore: student.total_score,
    tag: Number(student.total_score) < averageScore ? "重点跟进" : "观察"
  }));

  const errorTypeCounter = new Map([
    ["审题偏差", 0], ["建模步骤断裂", 0], ["计算错误", 0], ["规范书写失分", 0]
  ]);
  db.prepare("SELECT ai_analysis FROM question_scores WHERE exam_id = ?")
    .all(examId).forEach((row) => {
      const p = safeJsonParse(row.ai_analysis || "{}");
      if (p.main_error_type === "方法问题") errorTypeCounter.set("建模步骤断裂", errorTypeCounter.get("建模步骤断裂") + 1);
      if (p.main_error_type === "步骤问题") errorTypeCounter.set("审题偏差", errorTypeCounter.get("审题偏差") + 1);
      if (p.secondary_error_type === "计算错误") errorTypeCounter.set("计算错误", errorTypeCounter.get("计算错误") + 1);
      if (p.main_error_type === "习惯问题") errorTypeCounter.set("规范书写失分", errorTypeCounter.get("规范书写失分") + 1);
    });
  const errorDistribution = [...errorTypeCounter.entries()].map(([label, count]) => ({ label, count }));
  const mainIssue = [...errorTypeCounter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "建模步骤断裂";
  const errorDistributionNote = `本次月考主矛盾是"${mainIssue}"，建议讲评不要只讲答案，重点示范关键步骤的切入方式。`;

  const lecturePriority = questionStats
    .filter((q) => q.errorRate >= 30)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 3)
    .map((q, i) => ({
      rank: i + 1,
      level: i === 0 ? "warn" : "",
      title: `第${q.questionNo}题 · ${q.knowledgePoint}`,
      copy: `错误率 ${q.errorRate}%。${q.whyWrong} 讲评建议：${q.teachFocus}`
    }));

  const scoreRanges = [
    { range: "60分以下", min: 0, max: 60, type: "warn" },
    { range: "60-75分", min: 60, max: 75, type: "warn" },
    { range: "75-90分", min: 75, max: 90, type: "" },
    { range: "90-105分", min: 90, max: 105, type: "" },
    { range: "105分以上", min: 105, max: 999, type: "highlight" }
  ];
  const scoreDistribution = scoreRanges.map((r) => ({
    range: r.range,
    count: studentRows.filter((s) => Number(s.total_score) >= r.min && Number(s.total_score) < r.max).length,
    type: r.type
  })).filter((r) => r.count > 0 || studentRows.length === 0);
  const topCount = studentRows.filter((s) => Number(s.total_score) >= 105).length;
  const riskCount = studentRows.filter((s) => Number(s.total_score) < 75).length;
  const scoreDistNote = studentRows.length
    ? `全班${studentRows.length}人，105分以上${topCount}人（${Math.round(topCount / studentRows.length * 100)}%），75分以下${riskCount}人需重点跟进。`
    : "暂无成绩数据。";

  return {
    exam: {
      id: exam.id,
      name: exam.name,
      date: exam.date,
      subject: exam.subject,
      className: exam.class_name
    },
    studentCount: studentRows.length,
    averageScore,
    questionStats,
    lecturePriority,
    errorDistribution,
    errorDistributionNote,
    scoreDistribution,
    scoreDistNote,
    topIssues: [...issueCounter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count })),
    lectureSuggestions: lecturePriority.length
      ? lecturePriority.map((p) => p.copy)
      : [
          "先讲错误率最高的 2 道题，再补 1 道中档综合题。",
          "先区分知识问题和步骤问题，重点示范第一步切入方式。",
          "对重点学生优先布置 3 道同类题，第二天回收订正。"
        ],
    highRiskStudents
  };
}

function buildStudentReport(studentId, examId) {
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(studentId);
  if (!student) throw new Error("STUDENT_NOT_FOUND");
  const chosenExamId = examId || db.prepare("SELECT exam_id FROM student_scores WHERE student_id = ? ORDER BY created_at DESC LIMIT 1").get(studentId)?.exam_id;
  if (!chosenExamId) {
    return {
      student: {
        id: student.id,
        name: student.name,
        className: student.class_name,
        studentNo: student.student_no
      },
      latestExam: null,
      weakPoints: [],
      actionList: [],
      focusTasks: [],
      trend: []
    };
  }
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(chosenExamId);
  const totalScore = db.prepare("SELECT total_score FROM student_scores WHERE exam_id = ? AND student_id = ?").get(chosenExamId, studentId)?.total_score || 0;
  const questionRows = db.prepare(`
    SELECT q.question_no, q.knowledge_point, q.question_type, q.score, q.standard_steps, qs.score_got, qs.ai_analysis
    FROM question_scores qs
    JOIN questions q ON q.id = qs.question_id
    WHERE qs.exam_id = ? AND qs.student_id = ?
    ORDER BY CAST(q.question_no AS INTEGER), q.question_no
  `).all(chosenExamId, studentId);
  const weakCounter = new Map();
  const abilityCounter = new Map();
  const wrongDetails = questionRows
    .filter((row) => Number(row.score_got) < Number(row.score))
    .map((row) => {
      const parsed = safeJsonParse(row.ai_analysis || "{}");
      (parsed.weak_knowledge_points || []).forEach((item) => weakCounter.set(item, (weakCounter.get(item) || 0) + 1));
      (parsed.weak_ability_points || []).forEach((item) => abilityCounter.set(item, (abilityCounter.get(item) || 0) + 1));
      return {
        questionNo: row.question_no,
        knowledgePoint: row.knowledge_point,
        mainErrorType: parsed.main_error_type,
        teacherFeedback: parsed.teacher_feedback
      };
    });
  const reportRow = db.prepare(`
    SELECT report_json, created_at FROM ai_reports
    WHERE exam_id = ? AND student_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(chosenExamId, studentId);
  const report = reportRow ? safeJsonParse(reportRow.report_json) : {};
  const trend = db.prepare(`
    SELECT e.name, e.date, ss.total_score
    FROM student_scores ss
    JOIN exams e ON e.id = ss.exam_id
    WHERE ss.student_id = ?
    ORDER BY e.date ASC, ss.created_at ASC
    LIMIT 5
  `).all(studentId).map((row) => ({
    examName: row.name,
    date: row.date,
    totalScore: row.total_score
  }));

  const worstRow = questionRows
    .filter((r) => Number(r.score_got) < Number(r.score))
    .sort((a, b) => (Number(a.score_got) / Number(a.score)) - (Number(b.score_got) / Number(b.score)))[0];

  const worstAnalysis = worstRow ? safeJsonParse(worstRow.ai_analysis || "{}") : {};
  const stepReached = worstAnalysis.step_reached
    ? `第 ${worstAnalysis.step_reached} 步` : "第 2 步";
  const rawSteps = worstRow?.standard_steps || "识别题型 -> 核心计算 -> 整理结论 -> 回扣检查";
  const stepPath = rawSteps.split(/\s*->\s*/).filter(Boolean);
  const pathSummary = worstAnalysis.teacher_feedback
    || `该生在${worstRow?.knowledge_point || "核心题型"}上主要问题是${worstAnalysis.main_error_type || "步骤不完整"}，建议优先补这个环节。`;

  const historyWeakPoints = db.prepare(`
    SELECT report_json FROM ai_reports
    WHERE student_id = ? AND exam_id != ?
    ORDER BY created_at DESC LIMIT 3
  `).all(studentId, chosenExamId).flatMap((r) => {
    const rp = safeJsonParse(r.report_json || "{}");
    return rp.weakPoints || [];
  });
  const currentWeak = [...weakCounter.keys()];
  const hasRepeat = currentWeak.some((wp) => historyWeakPoints.includes(wp));
  const repeatStatus = hasRepeat ? "重复出现" : "首次出现";

  const allWeakPoints = [...weakCounter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const progress = allWeakPoints.map(([label]) => {
    const prevOccurred = historyWeakPoints.includes(label);
    return {
      label,
      status: prevOccurred ? "连续出现，需持续跟进" : "本次新增",
      trend: prevOccurred ? "down" : "up"
    };
  });

  const conclusion = [
    `${repeatStatus === "重复出现" ? "⚠ 该问题在上次考试中同样出现，属于反复出错的顽固薄弱点。" : "本次新出现的薄弱点，尽早介入效果最好。"}`,
    `建议老师不要泛泛讲"${currentWeak[0] || "该知识点"}"，而是只盯"${worstAnalysis.main_error_type || "关键步骤"}"这一环节。`,
    "如果本周3道专项题仍错2道以上，下周安排单独面批。"
  ];

  return {
    student: {
      id: student.id,
      name: student.name,
      className: student.class_name,
      studentNo: student.student_no
    },
    latestExam: {
      id: exam.id,
      name: exam.name,
      date: exam.date,
      totalScore
    },
    aiSource: worstAnalysis._source || "",
    stepReached,
    stepPath,
    pathSummary,
    repeatStatus,
    weakPoints: [...weakCounter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label),
    weakAbilities: [...abilityCounter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label),
    wrongDetails,
    actionList: report.actionList || [
      "先补 3 道同类基础题，再回做原题。",
      "把最近一次失分最多的题型整理成错因卡片。",
      "下一次考试重点盯住第一步切入是否正确。"
    ],
    focusTasks: report.focusTasks || [
      "导数单调性专项 3 题",
      "函数图像识别 2 题",
      "规范书写回测 1 次"
    ],
    trackingSummary: report.trackingSummary || "该生当前更需要先稳住中档题和步骤分，再逐步提升压轴前两问得分。",
    trend,
    progress,
    conclusion
  };
}

function createStudentMockReport(student, exam, totalScore, questionRows) {
  const weakPoints = [];
  const focusTasks = [];
  questionRows.forEach((row) => {
    const parsed = safeJsonParse(row.ai_analysis || "{}");
    (parsed.weak_knowledge_points || []).forEach((item) => weakPoints.push(item));
    if (parsed.next_practice_focus) focusTasks.push(parsed.next_practice_focus);
  });
  const uniqueWeakPoints = Array.from(new Set(weakPoints)).slice(0, 3);
  const uniqueTasks = Array.from(new Set(focusTasks)).slice(0, 3);
  return {
    headline: `${student.name} 本次更需要先稳住中档题步骤分`,
    summary: `${student.name} 在 ${exam.name} 中主要失分集中在方法选择和规范书写，建议先补 ${uniqueWeakPoints.join("、") || "导数与函数综合"}。`,
    actionList: [
      `本周先补 ${uniqueWeakPoints[0] || "导数单调性"} 相关题型。`,
      "先完成 3 道同类题，再做 1 道回测题。",
      "订正时必须写出完整步骤，不只改最终答案。"
    ],
    focusTasks: uniqueTasks.length ? uniqueTasks : ["导数单调性判断专项练习", "函数图像识别专项", "中档题规范书写训练"],
    trackingSummary: totalScore >= 90
      ? "该生基础较稳，建议把跟踪重点放在中高档题的稳定性。"
      : "该生更适合先抓基础分和中档题步骤分，避免继续大面积失分。"
  };
}

function mockAnalyzeAnswer(body = {}) {
  const question = {
    knowledgePoint: body.knowledgePoint || "导数与函数"
  };
  return createMockAiAnalysis(question, Number(body.variant || 0));
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

function mapGaokaoReport(row) {
  return {
    id: row.id,
    userId: row.user_id,
    timestamp: row.timestamp,
    subject: row.subject,
    subjectLabel: row.subject_label,
    examType: row.exam_type,
    gradeLevel: row.grade_level,
    studentName: row.student_name,
    schoolName: row.school_name,
    className: row.class_name || "",
    prompt: row.prompt,
    requirements: row.requirements,
    essay: row.essay,
    scaledScore: row.scaled_score,
    targetMax: row.target_max,
    estimatedLow: row.estimated_low,
    estimatedHigh: row.estimated_high,
    scoreConfidence: row.score_confidence,
    dimensions: JSON.parse(row.dimensions_json),
    strengths: JSON.parse(row.strengths_json),
    issues: JSON.parse(row.issues_json),
    actionItems: JSON.parse(row.action_items_json),
    teacherCheckpoints: JSON.parse(row.teacher_checkpoints_json),
    revisionGuidance: row.revision_guidance,
    coachingFocus: JSON.parse(row.coaching_focus_json || "[]"),
    selfCorrectionPrompts: JSON.parse(row.self_correction_json || "[]"),
    cohortSnapshot: JSON.parse(row.cohort_snapshot_json || "{}"),
    studentProfile: JSON.parse(row.student_profile_json || "{}"),
    profileSnapshot: JSON.parse(row.profile_snapshot_json),
    provider: row.provider
  };
}

function getGaokaoHistory(userId) {
  return db.prepare("SELECT * FROM gaokao_reports WHERE user_id = ? ORDER BY timestamp ASC").all(userId).map(mapGaokaoReport);
}

function getGaokaoClassReports(className, subject = "") {
  const normalizedClass = String(className || "").trim();
  if (!normalizedClass) return [];
  const rows = subject
    ? db.prepare(`
      SELECT * FROM gaokao_reports
      WHERE class_name = ? AND subject = ?
      ORDER BY timestamp DESC
    `).all(normalizedClass, subject)
    : db.prepare(`
      SELECT * FROM gaokao_reports
      WHERE class_name = ?
      ORDER BY timestamp DESC
    `).all(normalizedClass);
  return rows.map(mapGaokaoReport);
}

function normalizeStudentProfile(profile = {}) {
  return {
    targetTrack: String(profile.targetTrack || "").trim(),
    currentIssue: String(profile.currentIssue || "").trim(),
    motivationStyle: String(profile.motivationStyle || "").trim(),
    selfAssessment: String(profile.selfAssessment || "").trim(),
    teacherComment: String(profile.teacherComment || "").trim(),
    parentExpectation: String(profile.parentExpectation || "").trim()
  };
}

function getGaokaoStudentProfile(userId, subject, studentName, className = "") {
  const row = db.prepare(`
    SELECT * FROM gaokao_student_profiles
    WHERE user_id = ? AND subject = ? AND student_name = ? AND class_name = ?
  `).get(userId, subject, studentName, className);
  if (!row) return null;
  return JSON.parse(row.profile_json || "{}");
}

function saveGaokaoStudentProfile(userId, subject, studentName, schoolName, className, profile) {
  const normalized = normalizeStudentProfile(profile);
  db.prepare(`
    INSERT OR REPLACE INTO gaokao_student_profiles (
      user_id, subject, student_name, school_name, class_name, profile_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    subject,
    studentName,
    schoolName || "",
    className || "",
    JSON.stringify(normalized),
    new Date().toISOString()
  );
  return normalized;
}

function getGaokaoSubjectReports(subject = "") {
  const rows = subject
    ? db.prepare("SELECT * FROM gaokao_reports WHERE subject = ? ORDER BY timestamp DESC").all(subject)
    : db.prepare("SELECT * FROM gaokao_reports ORDER BY timestamp DESC").all();
  return rows.map(mapGaokaoReport);
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

function buildGaokaoLearningProfile(userId) {
  const history = getGaokaoHistory(userId);
  if (!history.length) {
    return {
      totalReports: 0,
      averageScore: 0,
      strongestAreas: [],
      weakestAreas: [],
      recurringIssues: [],
      subjectDistribution: [],
      focusTags: [],
      trendText: "先完成第一次作文批改，系统再开始生成个人提分画像。",
      nextActions: ["先上传 1 篇语文或英语作文，建立初始档案。"]
    };
  }

  const recent = history.slice(-10);
  const dimensionBuckets = new Map();
  recent.forEach((report) => {
    (report.dimensions || []).forEach((dimension) => {
      const normalized = dimension.maxScore ? (Number(dimension.score || 0) / Number(dimension.maxScore || 1)) * 100 : Number(dimension.score || 0);
      if (!dimensionBuckets.has(dimension.label)) dimensionBuckets.set(dimension.label, []);
      dimensionBuckets.get(dimension.label).push(normalized);
    });
  });

  const dimensionAverages = Array.from(dimensionBuckets.entries()).map(([label, scores]) => ({
    label,
    score: Math.round(scores.reduce((sum, item) => sum + item, 0) / Math.max(scores.length, 1))
  }));
  const strongestAreas = dimensionAverages.slice().sort((a, b) => b.score - a.score).slice(0, 3);
  const weakestAreas = dimensionAverages.slice().sort((a, b) => a.score - b.score).slice(0, 3);
  const recurringIssues = rankTags(
    recent.map((item) => (item.issues || []).filter((issue) => !String(issue).includes("老师复核") && !String(issue).includes("给老师"))),
    6
  ).map((item) => item.label);
  const subjectDistribution = rankTags(recent.map((item) => [item.subjectLabel]), 4);
  const focusTags = rankTags([
    recurringIssues,
    weakestAreas.map((item) => item.label),
    subjectDistribution.map((item) => item.label)
  ], 6).map((item) => item.label);
  const recentScores = recent.map((item) => Number(item.scaledScore || 0) / Math.max(Number(item.targetMax || 1), 1));
  let trendText = "样本还不多，先继续累计 2 到 3 次作文，趋势会更稳定。";
  if (recentScores.length >= 3) {
    const mid = Math.max(1, Math.floor(recentScores.length / 2));
    const early = recentScores.slice(0, mid);
    const later = recentScores.slice(mid);
    const earlyAvg = early.reduce((sum, item) => sum + item, 0) / Math.max(early.length, 1);
    const laterAvg = later.reduce((sum, item) => sum + item, 0) / Math.max(later.length, 1);
    const diff = Math.round((laterAvg - earlyAvg) * 100);
    trendText = diff >= 5
      ? "最近几次作文有稳定上扬，说明修改建议正在生效。"
      : diff <= -5
        ? "最近波动偏大，建议先回到最基础的审题和结构。"
        : "整体分数比较稳定，下一步要靠补齐短板继续拉开。";
  }

  return {
    totalReports: history.length,
    averageScore: Math.round(history.reduce((sum, item) => sum + Number(item.scaledScore || 0), 0) / history.length),
    strongestAreas,
    weakestAreas,
    recurringIssues,
    subjectDistribution,
    focusTags,
    trendText,
    nextActions: [
      weakestAreas[0] ? `下一次优先盯住“${weakestAreas[0].label}”。` : "继续保持当前训练节奏。",
      recurringIssues[0] ? `你最常见的问题是“${recurringIssues[0]}”，写前先列一个检查清单。` : "继续累计样本，让画像更稳定。",
      subjectDistribution[0] ? `最近练得最多的是${subjectDistribution[0].label}，建议交叉练另一科保持手感。` : "建议语文、英语交替练习。"
    ]
  };
}

function buildGaokaoClassDigest(className, subject = "") {
  const reports = getGaokaoClassReports(className, subject);
  if (!reports.length) {
    return {
      className,
      subject: subject || "all",
      totalStudents: 0,
      averageScore: 0,
      teacherBrief: "当前班级还没有可用作文记录，先完成批改后再生成讲评清单。",
      commonIssues: [],
      briefingPoints: [],
      students: []
    };
  }

  const latestByStudent = new Map();
  reports.forEach((report) => {
    const key = `${report.studentName || "未命名学生"}::${report.subject}`;
    if (!latestByStudent.has(key)) latestByStudent.set(key, report);
  });
  const students = Array.from(latestByStudent.values());
  const averageScore = Math.round(students.reduce((sum, item) => sum + Number(item.scaledScore || 0), 0) / Math.max(students.length, 1));
  const commonIssues = rankTags(students.map((item) => item.issues || []), 6).map((item) => item.label);
  const weakDimensions = rankTags(
    students.map((item) => {
      const sorted = (item.dimensions || []).slice().sort((a, b) => {
        const left = Number(a.score || 0) / Math.max(Number(a.maxScore || 1), 1);
        const right = Number(b.score || 0) / Math.max(Number(b.maxScore || 1), 1);
        return left - right;
      });
      return sorted.slice(0, 2).map((dimension) => dimension.label);
    }),
    5
  ).map((item) => item.label);

  const teacherBrief = students.length >= 3
    ? `本次${className}共统计 ${students.length} 份最近作文，班级平均分约 ${averageScore}。讲评分先抓“${commonIssues.slice(0, 2).join("、") || weakDimensions.slice(0, 2).join("、")}”，再分层点名提醒。`
    : `当前${className}已累计 ${students.length} 份作文，建议先把高频问题讲透，再逐个发个性化建议。`;

  return {
    className,
    subject: subject || "all",
    totalStudents: students.length,
    averageScore,
    teacherBrief,
    commonIssues,
    briefingPoints: [
      weakDimensions[0] ? `这次班级共性短板首先是“${weakDimensions[0]}”。` : "先从审题与结构讲起。",
      commonIssues[0] ? `讲评分建议先重点解释“${commonIssues[0]}”为什么会丢分。` : "先挑 2 到 3 篇典型样卷做示范。",
      "个性化建议发放时，优先用每个学生最新一篇作文的三条行动建议。"
    ],
    students: students
      .sort((a, b) => Number(b.scaledScore || 0) - Number(a.scaledScore || 0))
      .map((report) => ({
        studentName: report.studentName || "未命名学生",
        subjectLabel: report.subjectLabel,
        score: report.scaledScore,
        targetMax: report.targetMax,
        scoreRange: `${report.estimatedLow}-${report.estimatedHigh}`,
        keyIssues: (report.issues || []).slice(0, 2),
        personalizedAdvice: (report.actionItems || []).slice(0, 3),
        coachingFocus: (report.coachingFocus || []).slice(0, 3),
        selfCorrectionPrompts: (report.selfCorrectionPrompts || []).slice(0, 3),
        guidance: report.revisionGuidance || "",
        teacherFocus: (report.teacherCheckpoints || []).slice(0, 2)
      }))
  };
}

function compareAgainstCohort(subject, className, studentName, currentScore) {
  const classReports = getGaokaoClassReports(className, subject);
  const latestByStudent = new Map();
  classReports.forEach((report) => {
    const key = report.studentName || "未命名学生";
    if (!latestByStudent.has(key)) latestByStudent.set(key, report);
  });
  if (studentName && !latestByStudent.has(studentName)) {
    latestByStudent.set(studentName, { studentName, scaledScore: currentScore });
  }
  const students = Array.from(latestByStudent.values());
  const classAverage = students.length
    ? Math.round(students.reduce((sum, item) => sum + Number(item.scaledScore || 0), 0) / students.length)
    : null;
  const subjectReports = getGaokaoSubjectReports(subject);
  const allAverage = subjectReports.length
    ? Math.round(subjectReports.reduce((sum, item) => sum + Number(item.scaledScore || 0), 0) / subjectReports.length)
    : null;
  const sortedScores = students.map((item) => Number(item.scaledScore || 0)).sort((a, b) => b - a);
  const rankIndex = students.findIndex((item) => (item.studentName || "") === studentName);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;
  const percentile = students.length && rank
    ? Math.round(((students.length - rank + 1) / students.length) * 100)
    : null;
  const topScore = sortedScores[0] || currentScore;
  return {
    classAverage,
    allAverage,
    topScore,
    rank,
    classSize: students.length,
    percentile
  };
}

function buildPrincipalSummary(subject = "") {
  const reports = getGaokaoSubjectReports(subject);
  if (!reports.length) {
    return {
      subject: subject || "all",
      schoolCount: 0,
      classCount: 0,
      reportCount: 0,
      averageScore: 0,
      serviceNarrative: "当前还没有学校样本数据，先完成一轮班级试批后即可生成校长视角摘要。",
      strategicValue: [],
      commonIssues: [],
      highBarrierPoints: []
    };
  }

  const schoolSet = new Set(reports.map((item) => item.schoolName).filter(Boolean));
  const classSet = new Set(reports.map((item) => `${item.schoolName}::${item.className || "未分班"}`));
  const averageScore = Math.round(reports.reduce((sum, item) => sum + Number(item.scaledScore || 0), 0) / reports.length);
  const commonIssues = rankTags(reports.map((item) => item.issues || []), 6).map((item) => item.label);
  const focusDimensions = rankTags(
    reports.map((item) => {
      const sorted = (item.dimensions || []).slice().sort((a, b) => (Number(a.score || 0) / Math.max(Number(a.maxScore || 1), 1)) - (Number(b.score || 0) / Math.max(Number(b.maxScore || 1), 1)));
      return sorted.slice(0, 2).map((dimension) => dimension.label);
    }),
    5
  ).map((item) => item.label);

  return {
    subject: subject || "all",
    schoolCount: schoolSet.size,
    classCount: classSet.size,
    reportCount: reports.length,
    averageScore,
    serviceNarrative: `系统已经不只是给分，而是在做“学生画像 + 班级共性诊断 + 学校写作数据库沉淀”。校长关心的不是单次批改，而是是否能持续拉升作文得分与自我纠错能力。`,
    strategicValue: [
      "为学校沉淀校本作文数据库，逐步形成不同年级、不同班型、不同学科的失分图谱。",
      "帮助教师把讲评分从经验驱动升级到数据驱动，先抓共性问题，再分发个性化建议。",
      "通过长期画像提醒学生自己最稳定的错误模式，促成自我修正，而不是只被动看分。"
    ],
    commonIssues,
    focusDimensions,
    highBarrierPoints: [
      "不是通用作文机器人，而是基于学校自己的作文记录持续学习群体失分规律。",
      "建议同时参考学生画像、同班对比、历史表现和全库样本，门槛高于单篇点评产品。",
      "越用越强，数据资产和校本训练反馈会形成明显护城河。"
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

function uniqueStrings(items = [], limit = 6) {
  return Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean))).slice(0, limit);
}

function buildTeachingPlaybook(product, scenario, queryText = "") {
  const snippets = getKnowledgeSnippets(product, scenario, queryText);
  const map = {
    "shenlun:summary": {
      focus: [
        "先锁定概括对象，再区分问题、原因、影响、措施，不要混写。",
        "优先贴材料原词，只有材料明确支持时才允许上升概括。",
        "答案必须分层，阅卷老师要一眼看出你在概括什么。"
      ],
      pitfalls: [
        "把材料里的现象直接脑补成机制、制度、资金等抽象概念。",
        "只写三四个空泛名词，没有把推进结果或具体表现概括出来。",
        "为了压字数把关键限定词删掉，导致概括对象跑偏。"
      ],
      actions: [
        "先在材料里圈出对象、问题、原因、结果四类词，再下笔。",
        "每一条尽量保持“对象 + 问题表现”或“对象 + 原因”结构。",
        "交卷前检查有没有哪一条是凭感觉写的，不是材料原词转化出来的。"
      ],
      selfCheck: [
        "我有没有把概括对象写准？",
        "哪一条是我主观补出来的，不是材料里真的有的？",
        "如果删掉一个空泛词，我能不能换成更贴材料的表达？"
      ]
    },
    "shenlun:solution": {
      focus: [
        "对策必须和材料问题一一对应，不能只有大口号。",
        "要写清主体、动作和落地路径，避免只写“完善机制、加强宣传”。",
        "高分关键在可执行，而不是看起来全面。"
      ],
      pitfalls: [
        "措施没主体，谁去做、怎么做都不清楚。",
        "所有对策都写成一个层次，没有轻重缓急。",
        "把愿景当措施，把结果当手段。"
      ],
      actions: [
        "每条措施都补一个明确主体。",
        "至少有一条写到执行机制或反馈闭环。",
        "删掉泛泛口号，把一条对策改成能落实的动作句。"
      ],
      selfCheck: [
        "我的每条对策有没有对应前文问题？",
        "哪条措施看起来正确，但其实落不了地？",
        "我有没有写出谁来做、怎么做、做到什么程度？"
      ]
    },
    "shenlun:analysis": {
      focus: [
        "综合分析题先亮观点，再拆原因、影响和辩证关系。",
        "不是重复材料，而是解释材料为什么重要、为什么成立。",
        "要有分析链条，不能只有态度。"
      ],
      pitfalls: [
        "只会表态，不会拆原因和影响。",
        "把分析题写成对策题或大作文。",
        "辩证题只写一面，没有处理张力关系。"
      ],
      actions: [
        "先用一句话亮明立场，再分两到三层展开。",
        "每层尽量回答“为什么”和“会带来什么”。",
        "遇到张力题，主动补一层“边界”和“平衡”。"
      ],
      selfCheck: [
        "我是在分析，还是只是在表态？",
        "有没有至少一层写到影响或后果？",
        "如果题目有两面，我有没有处理它们的关系？"
      ]
    },
    "shenlun:official": {
      focus: [
        "贯彻执行先看文种格式，再看对象意识和任务目标。",
        "语言要像这个场景里真的会说的话，不能通篇大作文口吻。",
        "高分在于‘像真文’，不是在于词藻。"
      ],
      pitfalls: [
        "文种格式错位，标题称谓结尾混乱。",
        "对象意识弱，写给群众的话像写给领导。",
        "内容只有原则，没有安排。"
      ],
      actions: [
        "先确认文种，再决定标题、称谓、结尾。",
        "把措施改成适合这个对象理解和执行的话。",
        "至少补一层时间安排、责任分工或参与方式。"
      ],
      selfCheck: [
        "如果这是发给真实对象的文稿，对方会不会看得懂、愿不愿意执行？",
        "我的格式有没有漏标题、称谓、落款等关键部件？",
        "哪些句子像大作文，不像应用文？"
      ]
    },
    "shenlun:essay": {
      focus: [
        "大作文先压准总论点，再让每个分论点承担不同任务。",
        "例子不是装饰，必须替观点服务，并能被提炼成治理原则。",
        "高分作文往往能抓住材料深层张力，而不是只喊正确口号。"
      ],
      pitfalls: [
        "分论点同义反复，看起来三段其实只说了一件事。",
        "例子很多，但都没有回扣观点。",
        "结尾只升华、不回题，导致全文收不住。"
      ],
      actions: [
        "先写一句能统领全文的中心句，再决定段落分工。",
        "每段尽量做到‘观点一句 + 分析一句 + 例子一组 + 回扣一句’。",
        "交稿前逐段检查：这一段到底在证明什么？"
      ],
      selfCheck: [
        "我的总论点够不够准，能不能统领所有段落？",
        "三个分论点是不是在重复说同一件事？",
        "哪一个例子最像摆设，没有真正证明观点？"
      ]
    },
    "gaokao:chinese": {
      focus: [
        "先看是否扣题，再看中心句、段落任务和例证支撑。",
        "例子必须服务观点，不能只堆素材和金句。",
        "结尾要回扣题意，不能只做空泛升华。"
      ],
      pitfalls: [
        "审题方向对，但中心句不锋利，导致全文发散。",
        "每段都像在重复中心，没有形成推进。",
        "例子写得热闹，却没证明分论点。"
      ],
      actions: [
        "把题目压成一句中心句，写在草稿最上面。",
        "每个主体段只完成一个分任务，不贪多。",
        "删掉一处空话，把它换成分析或例证回扣。"
      ],
      selfCheck: [
        "我的中心句能不能直接回答题目？",
        "每段首句是不是各有分工？",
        "哪一处最像空话，能不能改成更具体的论证？"
      ]
    },
    "gaokao:english": {
      focus: [
        "先完成任务和要点，再追求高级表达。",
        "段落连接要清楚，宁可稳一点，也不要复杂句失控。",
        "老师先看完成度和准确性，最后才看亮点句。"
      ],
      pitfalls: [
        "要点没写全，却为了高级句式冒险。",
        "连接词堆得多，但逻辑并不清楚。",
        "长句过多导致时态、主谓一致和拼写一起出错。"
      ],
      actions: [
        "先列出题目要求的动作词和信息点，再写正文。",
        "每段先用一个清楚句交代功能，再补细节。",
        "交卷前单独检查时态、主谓一致、拼写和称呼结尾。"
      ],
      selfCheck: [
        "我有没有把题目要求的每个点都写到？",
        "哪一句最不稳，删短后会不会更好？",
        "如果去掉花哨句，我的文章还能不能完成任务？"
      ]
    }
  };
  const preset = map[`${product}:${scenario}`] || { focus: [], pitfalls: [], actions: [], selfCheck: [] };
  return {
    snippets,
    focus: uniqueStrings([...preset.focus, ...snippets.map((item) => `${item.title}：${item.content}`)], 5),
    pitfalls: uniqueStrings(preset.pitfalls, 4),
    actions: uniqueStrings(preset.actions, 4),
    selfCheck: uniqueStrings(preset.selfCheck, 4)
  };
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

function insertGaokaoReport(record) {
  db.prepare(`
    INSERT INTO gaokao_reports (
      id, user_id, timestamp, subject, subject_label, exam_type, grade_level, student_name, school_name, class_name,
      prompt, requirements, essay, scaled_score, target_max, estimated_low, estimated_high, score_confidence,
      dimensions_json, strengths_json, issues_json, action_items_json, teacher_checkpoints_json,
      revision_guidance, coaching_focus_json, self_correction_json, cohort_snapshot_json,
      student_profile_json, profile_snapshot_json, provider
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.userId,
    record.timestamp,
    record.subject,
    record.subjectLabel,
    record.examType,
    record.gradeLevel,
    record.studentName,
    record.schoolName,
    record.className || "",
    record.prompt,
    record.requirements,
    record.essay,
    record.scaledScore,
    record.targetMax,
    record.estimatedLow,
    record.estimatedHigh,
    record.scoreConfidence,
    JSON.stringify(record.dimensions),
    JSON.stringify(record.strengths),
    JSON.stringify(record.issues),
    JSON.stringify(record.actionItems),
    JSON.stringify(record.teacherCheckpoints),
    record.revisionGuidance,
    JSON.stringify(record.coachingFocus || []),
    JSON.stringify(record.selfCorrectionPrompts || []),
    JSON.stringify(record.cohortSnapshot || {}),
    JSON.stringify(record.studentProfile || {}),
    JSON.stringify(record.profileSnapshot || {}),
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

function shortHash(prefix = "0x") {
  return `${prefix}${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

async function fetchAemoPublicPriceReference() {
  if (aemoPriceCache.value && Date.now() - aemoPriceCache.fetchedAt < AEMO_PRICE_CACHE_MS) {
    return aemoPriceCache.value;
  }

  const listingResponse = await fetch("https://www.nemweb.com.au/Reports/Current/Public_Prices/");
  if (!listingResponse.ok) {
    throw new Error(`AEMO_LISTING_FAILED_${listingResponse.status}`);
  }

  const listingHtml = await listingResponse.text();
  const matches = [...listingHtml.matchAll(/PUBLIC_PRICES_[0-9_]+\.zip/gi)].map((match) => match[0]);
  const latestZipName = matches.at(-1);
  if (!latestZipName) {
    throw new Error("AEMO_ZIP_NOT_FOUND");
  }

  const zipResponse = await fetch(`https://www.nemweb.com.au/Reports/Current/Public_Prices/${latestZipName}`);
  if (!zipResponse.ok) {
    throw new Error(`AEMO_ZIP_FETCH_FAILED_${zipResponse.status}`);
  }

  const zipPath = path.join(DATA_DIR, "aemo-public-prices-latest.zip");
  fs.writeFileSync(zipPath, Buffer.from(await zipResponse.arrayBuffer()));
  const csvText = execFileSync("unzip", ["-p", zipPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const regionPrices = new Map();

  for (const line of lines) {
    if (!line.startsWith("D,DREGION")) continue;
    const cells = parseCsvLine(line);
    const settlementDate = String(cells[4] || "");
    const regionId = String(cells[6] || "");
    const rrp = Number(cells[8] || 0);
    if (!regionId || Number.isNaN(rrp)) continue;
    const current = regionPrices.get(regionId);
    if (!current || settlementDate > current.settlementDate) {
      regionPrices.set(regionId, { regionId, settlementDate, rrp });
    }
  }

  const orderedRegions = ["NSW1", "QLD1", "SA1", "TAS1", "VIC1"]
    .map((regionId) => regionPrices.get(regionId))
    .filter(Boolean);
  if (!orderedRegions.length) {
    throw new Error("AEMO_REGION_PRICES_NOT_FOUND");
  }

  const averageAudPerMWh = orderedRegions.reduce((sum, item) => sum + item.rrp, 0) / orderedRegions.length;
  const audPerKwh = averageAudPerMWh / 1000;
  const cnyPerKwh = round(audPerKwh * AUD_CNY_FX, 4);
  const forwardCnyPerKwh = round(cnyPerKwh * 1.043, 4);
  const result = {
    source: "AEMO public prices",
    reportFile: latestZipName,
    settlementDate: orderedRegions[0].settlementDate,
    audPerMWh: round(averageAudPerMWh, 4),
    cnyPerKwh,
    forwardCnyPerKwh,
    regions: orderedRegions.map((item) => ({
      regionId: item.regionId,
      settlementDate: item.settlementDate,
      audPerMWh: round(item.rrp, 4)
    }))
  };

  aemoPriceCache = {
    fetchedAt: Date.now(),
    value: result
  };

  return result;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      if (inQuotes && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function buildFallbackPowerMarket() {
  const hourSeed = Math.floor(Date.now() / 3_600_000);
  const wave = Math.sin(hourSeed / 5) * 0.11;
  const secondary = Math.cos(hourSeed / 3) * 0.04;
  const spotPrice = round(0.582 + wave + secondary, 4);
  const futuresPrice = round(spotPrice * 1.043, 4);
  const tokenPremium = round((futuresPrice - spotPrice) * 0.35, 4);
  const tokenPrice = round(spotPrice + tokenPremium, 4);
  return {
    tokenSymbol: "AUC",
    tokenName: "Australia Coin",
    peg: "1 AUC = 1 kWh reference",
    region: "Australian electricity reference market",
    spotCnyPerKwh: spotPrice,
    futuresCnyPerKwh: futuresPrice,
    tokenCny: tokenPrice,
    tokenUsdt: round(tokenPrice / 7.08, 4),
    greenRatio: round(42 + Math.sin(hourSeed / 6) * 8, 2),
    carbonSavedKg: round(1280 + Math.cos(hourSeed / 4) * 110, 2),
    changePct24h: round(((tokenPrice - 0.574) / 0.574) * 100, 2),
    dataSource: "Internal fallback reference",
    reportFile: "",
    settlementDate: new Date().toISOString(),
    regionBreakdown: []
  };
}

function ensurePowerWallet(userId) {
  const existing = db.prepare("SELECT * FROM power_wallets WHERE user_id = ?").get(userId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const wallet = {
    userId,
    walletAddress: shortHash("0xPWR"),
    powerBalance: 120,
    redeemedKwh: 0,
    createdAt: now,
    updatedAt: now
  };
  db.prepare(`
    INSERT INTO power_wallets (user_id, wallet_address, power_balance, redeemed_kwh, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(wallet.userId, wallet.walletAddress, wallet.powerBalance, wallet.redeemedKwh, wallet.createdAt, wallet.updatedAt);
  return db.prepare("SELECT * FROM power_wallets WHERE user_id = ?").get(userId);
}

function getPowerWallet(userId) {
  return ensurePowerWallet(userId);
}

function getPowerLedger(userId) {
  ensurePowerWallet(userId);
  return db.prepare("SELECT * FROM power_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").all(userId);
}

function appendPowerLedger(entry) {
  db.prepare(`
    INSERT INTO power_ledger (id, user_id, tx_hash, action, token_amount, kwh_amount, unit_price, grid_region, status, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.id,
    entry.userId,
    entry.txHash,
    entry.action,
    entry.tokenAmount,
    entry.kwhAmount,
    entry.unitPrice,
    entry.gridRegion,
    entry.status,
    entry.note,
    entry.createdAt
  );
}

function updatePowerWallet(userId, fields) {
  const current = getPowerWallet(userId);
  const nextBalance = fields.powerBalance ?? current.power_balance;
  const nextRedeemed = fields.redeemedKwh ?? current.redeemed_kwh;
  db.prepare(`
    UPDATE power_wallets
    SET power_balance = ?, redeemed_kwh = ?, updated_at = ?
    WHERE user_id = ?
  `).run(nextBalance, nextRedeemed, new Date().toISOString(), userId);
}

async function buildPowerMarket() {
  const fallback = buildFallbackPowerMarket();
  try {
    const reference = await fetchAemoPublicPriceReference();
    const tokenPremium = round((reference.forwardCnyPerKwh - reference.cnyPerKwh) * 0.35, 4);
    const tokenPrice = round(reference.cnyPerKwh + tokenPremium, 4);
    return {
      ...fallback,
      spotCnyPerKwh: reference.cnyPerKwh,
      futuresCnyPerKwh: reference.forwardCnyPerKwh,
      tokenCny: tokenPrice,
      tokenUsdt: round(tokenPrice / 7.08, 4),
      changePct24h: round(((tokenPrice - 0.574) / 0.574) * 100, 2),
      dataSource: reference.source,
      reportFile: reference.reportFile,
      settlementDate: reference.settlementDate,
      regionBreakdown: reference.regions,
      referenceAudPerMWh: reference.audPerMWh
    };
  } catch (error) {
    return {
      ...fallback,
      sourceError: error.message
    };
  }
}

async function getPowerSnapshot(userId) {
  const wallet = getPowerWallet(userId);
  const market = await buildPowerMarket();
  const ledger = getPowerLedger(userId).map((row) => ({
    id: row.id,
    txHash: row.tx_hash,
    action: row.action,
    tokenAmount: row.token_amount,
    kwhAmount: row.kwh_amount,
    unitPrice: row.unit_price,
    gridRegion: row.grid_region,
    status: row.status,
    note: row.note,
    createdAt: row.created_at
  }));
  const balance = Number(wallet.power_balance || 0);
  const redeemedKwh = Number(wallet.redeemed_kwh || 0);
  const valuationCny = round(balance * market.tokenCny, 2);
  const valuationUsdt = round(balance * market.tokenUsdt, 4);
  return {
    market,
    wallet: {
      address: wallet.wallet_address,
      balance,
      redeemedKwh,
      valuationCny,
      valuationUsdt
    },
    metrics: {
      settlementCapacityKwh: balance,
      settlementValueCny: valuationCny,
      avgSettlementPrice: market.tokenCny,
      greenRatio: market.greenRatio,
      carbonSavedKg: market.carbonSavedKg
    },
    ledger
  };
}

async function submitPowerAction(body, user) {
  const market = await buildPowerMarket();
  const wallet = getPowerWallet(user.id);
  const action = String(body.action || "").toLowerCase();
  const tokenAmount = round(Number(body.tokenAmount || 0), 4);
  if (!tokenAmount || tokenAmount <= 0) {
    throw new Error("INVALID_TOKEN_AMOUNT");
  }

  let nextBalance = Number(wallet.power_balance || 0);
  let nextRedeemed = Number(wallet.redeemed_kwh || 0);
  let note = "";

  if (action === "mint") {
    nextBalance += tokenAmount;
    note = `Minted ${tokenAmount} AUC at reference price`;
  } else if (action === "redeem") {
    if (nextBalance < tokenAmount) throw new Error("INSUFFICIENT_POWER_BALANCE");
    nextBalance -= tokenAmount;
    nextRedeemed += tokenAmount;
    note = `Redeemed ${tokenAmount} kWh settlement reference`;
  } else if (action === "transfer") {
    if (nextBalance < tokenAmount) throw new Error("INSUFFICIENT_POWER_BALANCE");
    nextBalance -= tokenAmount;
    note = `Transferred ${tokenAmount} AUC to ${String(body.toAddress || "external").slice(0, 12)}...`;
  } else {
    throw new Error("INVALID_POWER_ACTION");
  }

  updatePowerWallet(user.id, { powerBalance: round(nextBalance, 4), redeemedKwh: round(nextRedeemed, 4) });
  appendPowerLedger({
    id: randomUUID(),
    userId: user.id,
    txHash: shortHash("0xTX"),
    action,
    tokenAmount,
    kwhAmount: tokenAmount,
    unitPrice: market.tokenCny,
    gridRegion: market.region,
    status: "confirmed",
    note,
    createdAt: new Date().toLocaleString()
  });

  return {
    message: note,
    ...await getPowerSnapshot(user.id)
  };
}

function getDepositNetworks() {
  return [
    {
      network: "TRC20",
      symbol: "USDT",
      chain: "Tron",
      address: USDT_TRC20_ADDRESS,
      enabled: Boolean(USDT_TRC20_ADDRESS),
      confirmations: 20,
      feeHint: "低"
    },
    {
      network: "ERC20",
      symbol: "USDT",
      chain: "Ethereum",
      address: USDT_ERC20_ADDRESS,
      enabled: Boolean(USDT_ERC20_ADDRESS),
      confirmations: 12,
      feeHint: "高"
    },
    {
      network: "BEP20",
      symbol: "USDT",
      chain: "BNB Smart Chain",
      address: USDT_BEP20_ADDRESS,
      enabled: Boolean(USDT_BEP20_ADDRESS),
      confirmations: 15,
      feeHint: "中"
    }
  ];
}

async function getExchangeBootstrap(userId, symbol) {
  return {
    profile: getOrCreateExchangeProfile(userId),
    promo: estimateTodayRebate(userId),
    leaderboard: getInviteLeaderboard(),
    deposits: getUserDeposits(userId),
    adminQueue: getPendingDeposits(),
    deposit: {
      asset: "USDT",
      networks: getDepositNetworks(),
      note: "Send USDT only to the matching chain address. Automatic on-chain reconciliation is not enabled in this build."
    },
    power: await getPowerSnapshot(userId),
    trading: getTradeBootstrap(userId, symbol)
  };
}

function generateInviteCode() {
  return `VTX${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function getExchangeProfile(userId) {
  return db.prepare("SELECT * FROM exchange_profiles WHERE user_id = ?").get(userId);
}

function getOrCreateExchangeProfile(userId) {
  const existing = getExchangeProfile(userId);
  if (existing) {
    return {
      username: existing.username,
      telegramHandle: existing.telegram_handle,
      inviteCode: existing.invite_code,
      inviterCode: existing.inviter_code,
      mode: existing.mode,
      feeRate: existing.fee_rate,
      rebateRate: existing.rebate_rate
    };
  }
  const now = new Date().toISOString();
  let inviteCode = generateInviteCode();
  while (db.prepare("SELECT 1 FROM exchange_profiles WHERE invite_code = ?").get(inviteCode)) {
    inviteCode = generateInviteCode();
  }
  db.prepare(`
    INSERT INTO exchange_profiles (user_id, username, telegram_handle, invite_code, inviter_code, mode, fee_rate, rebate_rate, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, "", "", inviteCode, "", "demo", 0.2, 0.18, now, now);
  return getOrCreateExchangeProfile(userId);
}

function saveExchangeProfile(userId, fields) {
  const current = getOrCreateExchangeProfile(userId);
  db.prepare(`
    UPDATE exchange_profiles
    SET username = ?, telegram_handle = ?, inviter_code = ?, updated_at = ?
    WHERE user_id = ?
  `).run(
    fields.username ?? current.username,
    fields.telegramHandle ?? current.telegramHandle,
    fields.inviterCode ?? current.inviterCode,
    new Date().toISOString(),
    userId
  );
  return getOrCreateExchangeProfile(userId);
}

function getExchangeRebates(userId) {
  return db.prepare("SELECT * FROM exchange_rebate_ledger WHERE user_id = ? ORDER BY settlement_time DESC LIMIT 10").all(userId).map((row) => ({
    id: row.id,
    rebateAmount: row.rebate_amount,
    settlementTime: row.settlement_time,
    note: row.note,
    createdAt: row.created_at
  }));
}

function estimateTodayRebate(userId) {
  const orders = getTradeOrders(userId);
  const profile = getOrCreateExchangeProfile(userId);
  const grossFees = orders.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0) * Number(profile.feeRate || 0.2)), 0);
  return {
    feeRate: Number(profile.feeRate || 0.2),
    rebateRate: Number(profile.rebateRate || 0.18),
    estimatedFee: round(grossFees, 4),
    estimatedNoonRebate: round(grossFees * Number(profile.rebateRate || 0.18), 4),
    recentRebates: getExchangeRebates(userId)
  };
}

function getUserDeposits(userId) {
  return db.prepare("SELECT * FROM exchange_deposits WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 10").all(userId).map((row) => ({
    id: row.id,
    network: row.network,
    asset: row.asset,
    amount: row.amount,
    txHash: row.tx_hash,
    status: row.status,
    reviewerNote: row.reviewer_note,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at
  }));
}

function getPendingDeposits() {
  return db.prepare(`
    SELECT d.*, u.name, p.username
    FROM exchange_deposits d
    LEFT JOIN users u ON u.id = d.user_id
    LEFT JOIN exchange_profiles p ON p.user_id = d.user_id
    ORDER BY d.submitted_at DESC
    LIMIT 20
  `).all().map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayName: row.username || row.name || "Guest",
    network: row.network,
    asset: row.asset,
    amount: row.amount,
    txHash: row.tx_hash,
    status: row.status,
    reviewerNote: row.reviewer_note,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at
  }));
}

function getInviteLeaderboard() {
  return db.prepare(`
    SELECT inviter_code, COUNT(*) AS referrals
    FROM exchange_profiles
    WHERE inviter_code != ''
    GROUP BY inviter_code
    ORDER BY referrals DESC, inviter_code ASC
    LIMIT 10
  `).all().map((row) => ({
    inviteCode: row.inviter_code,
    referrals: Number(row.referrals || 0)
  }));
}

function submitDemoDeposit(body, user) {
  const network = String(body.network || "").trim().toUpperCase();
  const amount = Number(body.amount || 0);
  const txHash = String(body.txHash || "").trim();
  if (!network || !amount || amount <= 0 || !txHash) {
    throw new Error("INVALID_DEPOSIT_REQUEST");
  }
  db.prepare(`
    INSERT INTO exchange_deposits (id, user_id, network, asset, amount, tx_hash, status, reviewer_note, submitted_at, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), user.id, network, "USDT", amount, txHash, "pending", "等待审核", new Date().toLocaleString(), "");
  return {
    deposits: getUserDeposits(user.id),
    adminQueue: getPendingDeposits()
  };
}

function reviewDemoDeposit(body) {
  const depositId = String(body.depositId || "").trim();
  const decision = String(body.decision || "").trim().toLowerCase();
  const reviewerNote = String(body.reviewerNote || "").trim();
  const existing = db.prepare("SELECT * FROM exchange_deposits WHERE id = ?").get(depositId);
  if (!existing) throw new Error("DEPOSIT_NOT_FOUND");
  if (existing.status !== "pending") throw new Error("DEPOSIT_ALREADY_REVIEWED");
  const status = decision === "approve" ? "approved" : "rejected";
  db.prepare("UPDATE exchange_deposits SET status = ?, reviewer_note = ?, reviewed_at = ? WHERE id = ?")
    .run(status, reviewerNote || (status === "approved" ? "已审核通过" : "已拒绝"), new Date().toLocaleString(), depositId);
  if (status === "approved") {
    const account = getTradeAccount(existing.user_id);
    updateTradeCash(existing.user_id, round(Number(account.cash_usdt || 0) + Number(existing.amount || 0), 8));
  }
  return {
    reviewed: true,
    status,
    adminQueue: getPendingDeposits(),
    userDeposits: getUserDeposits(existing.user_id)
  };
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function instrumentBySymbol(symbol) {
  return tradeInstruments.find((item) => item.symbol === symbol);
}

function buildTradeQuotes() {
  const secondSeed = Date.now() / 1000;
  return tradeInstruments.map((instrument, index) => {
    const wave = Math.sin((secondSeed + index * 11) / 11) * instrument.amplitude;
    const secondary = Math.cos((secondSeed + index * 5) / 5) * instrument.amplitude * 0.32;
    const drift = wave + secondary;
    const price = instrument.basePrice * (1 + drift);
    const changePct = drift * 100;
    return {
      ...instrument,
      price: round(price, price < 1 ? 6 : price < 100 ? 4 : 2),
      changePct: round(changePct, 2),
      cnyPrice: round(price * 7.08, price < 1 ? 4 : 2),
      high24h: round(price * 1.018, price < 1 ? 6 : 2),
      low24h: round(price * 0.982, price < 1 ? 6 : 2),
      turnover: `${instrument.volume}${instrument.marketType === "spot" ? "万" : ""}`
    };
  });
}

function quoteMap(quotes) {
  return Object.fromEntries(quotes.map((quote) => [quote.symbol, quote]));
}

function buildCandles(symbol, quotes) {
  const quote = quoteMap(quotes)[symbol] || quoteMap(quotes)["BTCUSDT"];
  const candles = [];
  const seed = Math.floor(Date.now() / 300_000);
  for (let index = 0; index < 24; index += 1) {
    const base = quote.price * (1 + Math.sin((seed - index) / 4) * 0.012);
    const open = base * (1 - Math.cos((seed - index) / 3) * 0.004);
    const close = base * (1 + Math.sin((seed - index) / 5) * 0.004);
    const high = Math.max(open, close) * 1.006;
    const low = Math.min(open, close) * 0.994;
    candles.unshift({
      label: `${String((index + 1) % 24).padStart(2, "0")}:00`,
      open: round(open, quote.price < 1 ? 6 : 2),
      close: round(close, quote.price < 1 ? 6 : 2),
      high: round(high, quote.price < 1 ? 6 : 2),
      low: round(low, quote.price < 1 ? 6 : 2)
    });
  }
  return candles;
}

function buildOrderBook(symbol, quotes) {
  const quote = quoteMap(quotes)[symbol] || quoteMap(quotes)["BTCUSDT"];
  const step = quote.price < 1 ? 0.00001 : quote.price < 100 ? 0.01 : 1.2;
  const asks = Array.from({ length: 6 }).map((_, index) => ({
    price: round(quote.price + step * (index + 1), quote.price < 1 ? 6 : 2),
    quantity: round((index + 2) * (quote.price < 1 ? 160.4 : quote.price < 100 ? 72.8 : 18.4), quote.price < 1 ? 1 : 2)
  }));
  const bids = Array.from({ length: 6 }).map((_, index) => ({
    price: round(quote.price - step * (index + 1), quote.price < 1 ? 6 : 2),
    quantity: round((index + 2) * (quote.price < 1 ? 148.2 : quote.price < 100 ? 68.1 : 16.7), quote.price < 1 ? 1 : 2)
  }));
  return { asks, bids };
}

function ensureTradeAccount(userId) {
  const existing = db.prepare("SELECT * FROM trade_accounts WHERE user_id = ?").get(userId);
  if (existing) return;
  const now = new Date().toISOString();
  db.prepare("INSERT INTO trade_accounts (user_id, cash_usdt, updated_at) VALUES (?, ?, ?)").run(userId, 25.8477563, now);
  const insertHolding = db.prepare("INSERT INTO trade_spot_holdings (user_id, asset, quantity, avg_cost) VALUES (?, ?, ?, ?)");
  [
    ["PEPE", 69903, 0.0000159],
    ["SHIB", 32857, 0.0000348],
    ["DOGE", 2.066, 0.6231],
    ["SOL", 0.012, 79.6]
  ].forEach(([asset, quantity, avgCost]) => {
    insertHolding.run(userId, asset, quantity, avgCost);
  });
}

function getTradeAccount(userId) {
  ensureTradeAccount(userId);
  return db.prepare("SELECT * FROM trade_accounts WHERE user_id = ?").get(userId);
}

function getSpotHoldings(userId) {
  ensureTradeAccount(userId);
  return db.prepare("SELECT * FROM trade_spot_holdings WHERE user_id = ? ORDER BY asset ASC").all(userId);
}

function getTradePositions(userId) {
  ensureTradeAccount(userId);
  return db.prepare("SELECT * FROM trade_positions WHERE user_id = ? ORDER BY updated_at DESC").all(userId);
}

function getTradeOrders(userId) {
  ensureTradeAccount(userId);
  return db.prepare("SELECT * FROM trade_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 12").all(userId);
}

function upsertSpotHolding(userId, asset, quantity, avgCost) {
  if (quantity <= 0) {
    db.prepare("DELETE FROM trade_spot_holdings WHERE user_id = ? AND asset = ?").run(userId, asset);
    return;
  }
  db.prepare(`
    INSERT INTO trade_spot_holdings (user_id, asset, quantity, avg_cost)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, asset) DO UPDATE SET quantity = excluded.quantity, avg_cost = excluded.avg_cost
  `).run(userId, asset, quantity, avgCost);
}

function updateTradeCash(userId, nextCash) {
  db.prepare("UPDATE trade_accounts SET cash_usdt = ?, updated_at = ? WHERE user_id = ?").run(nextCash, new Date().toISOString(), userId);
}

function upsertTradePosition(userId, position) {
  db.prepare(`
    INSERT INTO trade_positions (user_id, symbol, market_type, side, quantity, entry_price, leverage, margin_used, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, symbol, market_type, side) DO UPDATE SET
      quantity = excluded.quantity,
      entry_price = excluded.entry_price,
      leverage = excluded.leverage,
      margin_used = excluded.margin_used,
      updated_at = excluded.updated_at
  `).run(
    userId,
    position.symbol,
    position.marketType,
    position.side,
    position.quantity,
    position.entryPrice,
    position.leverage,
    position.marginUsed,
    new Date().toISOString()
  );
}

function removeTradePosition(userId, symbol, marketType, side) {
  db.prepare("DELETE FROM trade_positions WHERE user_id = ? AND symbol = ? AND market_type = ? AND side = ?").run(userId, symbol, marketType, side);
}

function insertTradeOrder(order) {
  db.prepare(`
    INSERT INTO trade_orders (id, user_id, symbol, market_type, action, side, order_kind, quantity, price, leverage, status, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order.id,
    order.userId,
    order.symbol,
    order.marketType,
    order.action,
    order.side,
    order.orderKind,
    order.quantity,
    order.price,
    order.leverage,
    order.status,
    order.note,
    order.createdAt
  );
}

function getPortfolioSnapshot(userId, quotes) {
  const quoteLookup = quoteMap(quotes);
  const account = getTradeAccount(userId);
  const rawHoldings = getSpotHoldings(userId);
  const rawPositions = getTradePositions(userId);
  const orders = getTradeOrders(userId).map((item) => ({
    id: item.id,
    symbol: item.symbol,
    marketType: item.market_type,
    action: item.action,
    side: item.side,
    orderKind: item.order_kind,
    quantity: item.quantity,
    price: item.price,
    leverage: item.leverage,
    status: item.status,
    note: item.note,
    createdAt: item.created_at
  }));

  const spotHoldings = rawHoldings.map((holding) => {
    const quote = quoteLookup[`${holding.asset}USDT`];
    const price = quote?.price || holding.avg_cost;
    const value = holding.quantity * price;
    const pnl = value - (holding.quantity * holding.avg_cost);
    return {
      asset: holding.asset,
      quantity: holding.quantity,
      avgCost: holding.avg_cost,
      price,
      value: round(value, 4),
      pnl: round(pnl, 4),
      changePct: quote?.changePct || 0
    };
  }).sort((a, b) => b.value - a.value);

  const positions = rawPositions.map((position) => {
    const quote = quoteLookup[position.symbol];
    const markPrice = quote?.price || position.entry_price;
    const direction = position.side === "long" ? 1 : -1;
    const unrealizedPnl = (markPrice - position.entry_price) * position.quantity * direction;
    const notional = markPrice * position.quantity;
    const marginRatio = position.margin_used ? notional / position.margin_used : position.leverage;
    return {
      symbol: position.symbol,
      marketType: position.market_type,
      side: position.side,
      quantity: position.quantity,
      entryPrice: position.entry_price,
      markPrice,
      leverage: position.leverage,
      marginUsed: round(position.margin_used, 4),
      notional: round(notional, 4),
      unrealizedPnl: round(unrealizedPnl, 4),
      marginRatio: round(marginRatio, 2)
    };
  });

  const spotValue = spotHoldings.reduce((sum, item) => sum + item.value, 0);
  const marginUsed = positions.reduce((sum, item) => sum + item.marginUsed, 0);
  const unrealizedPnl = positions.reduce((sum, item) => sum + item.unrealizedPnl, 0);
  const cash = Number(account.cash_usdt || 0);
  const totalEquity = cash + spotValue + marginUsed + unrealizedPnl;
  const available = cash;
  const pnlPct = totalEquity ? (unrealizedPnl / totalEquity) * 100 : 0;

  return {
    overview: {
      totalEquity: round(totalEquity, 4),
      cash: round(cash, 4),
      available: round(available, 4),
      spotValue: round(spotValue, 4),
      marginUsed: round(marginUsed, 4),
      unrealizedPnl: round(unrealizedPnl, 4),
      pnlPct: round(pnlPct, 2),
      riskLevel: marginUsed > totalEquity * 0.6 ? "高" : marginUsed > totalEquity * 0.35 ? "中" : "低"
    },
    spotHoldings,
    positions,
    orders
  };
}

function getTradeBootstrap(userId, selectedSymbol) {
  const quotes = buildTradeQuotes();
  const snapshot = getPortfolioSnapshot(userId, quotes);
  const currentSymbol = instrumentBySymbol(selectedSymbol) ? selectedSymbol : "BTCUSDT";
  const favorites = ["BTCUSDT", "ETHUSDT", "DOGEUSDT", "BTC-PERP", "GC1!"]
    .map((symbol) => quoteMap(quotes)[symbol])
    .filter(Boolean);
  return {
    quotes,
    favorites,
    selectedSymbol: currentSymbol,
    orderBook: buildOrderBook(currentSymbol, quotes),
    candles: buildCandles(currentSymbol, quotes),
    ...snapshot
  };
}

function placeTradeOrder(body, user) {
  ensureTradeAccount(user.id);
  const quotes = buildTradeQuotes();
  const quoteLookup = quoteMap(quotes);
  const instrument = instrumentBySymbol(body.symbol);
  if (!instrument) {
    throw new Error("INVALID_SYMBOL");
  }

  const marketType = body.marketType || instrument.marketType;
  const action = String(body.action || "").toLowerCase();
  const side = String(body.side || "").toLowerCase();
  const orderKind = String(body.orderKind || "market").toLowerCase();
  const quantity = Number(body.quantity || 0);
  const leverage = Math.max(1, Math.min(500, Number(body.leverage || 1)));
  const marketPrice = quoteLookup[instrument.symbol]?.price || instrument.basePrice;
  const price = orderKind === "limit" && Number(body.price) > 0 ? Number(body.price) : marketPrice;
  if (!quantity || quantity <= 0) {
    throw new Error("INVALID_QUANTITY");
  }

  const account = getTradeAccount(user.id);
  let cash = Number(account.cash_usdt || 0);
  let note = "";

  if (marketType === "spot") {
    const asset = instrument.asset;
    const current = db.prepare("SELECT * FROM trade_spot_holdings WHERE user_id = ? AND asset = ?").get(user.id, asset);
    if (action === "buy") {
      const cost = quantity * price;
      if (cash < cost) throw new Error("INSUFFICIENT_BALANCE");
      const nextQty = Number(current?.quantity || 0) + quantity;
      const nextAvgCost = nextQty ? (((Number(current?.quantity || 0) * Number(current?.avg_cost || 0)) + cost) / nextQty) : price;
      upsertSpotHolding(user.id, asset, round(nextQty, 8), round(nextAvgCost, 8));
      cash -= cost;
      note = `买入 ${asset}`;
    } else if (action === "sell") {
      const currentQty = Number(current?.quantity || 0);
      if (currentQty < quantity) throw new Error("INSUFFICIENT_POSITION");
      const nextQty = currentQty - quantity;
      upsertSpotHolding(user.id, asset, round(nextQty, 8), Number(current?.avg_cost || price));
      cash += quantity * price;
      note = `卖出 ${asset}`;
    } else {
      throw new Error("INVALID_ACTION");
    }
    updateTradeCash(user.id, round(cash, 8));
  } else {
    const positionSide = side === "short" ? "short" : "long";
    const existing = db.prepare("SELECT * FROM trade_positions WHERE user_id = ? AND symbol = ? AND market_type = ? AND side = ?")
      .get(user.id, instrument.symbol, marketType, positionSide);
    if (action === "open") {
      const marginRequired = (quantity * price) / leverage;
      if (cash < marginRequired) throw new Error("INSUFFICIENT_BALANCE");
      const currentQty = Number(existing?.quantity || 0);
      const nextQty = currentQty + quantity;
      const nextMargin = Number(existing?.margin_used || 0) + marginRequired;
      const nextEntry = nextQty
        ? (((currentQty * Number(existing?.entry_price || 0)) + (quantity * price)) / nextQty)
        : price;
      upsertTradePosition(user.id, {
        symbol: instrument.symbol,
        marketType,
        side: positionSide,
        quantity: round(nextQty, 8),
        entryPrice: round(nextEntry, 8),
        leverage,
        marginUsed: round(nextMargin, 8)
      });
      cash -= marginRequired;
      note = `${positionSide === "long" ? "开多" : "开空"} ${instrument.symbol}`;
    } else if (action === "close") {
      if (!existing) throw new Error("POSITION_NOT_FOUND");
      const currentQty = Number(existing.quantity || 0);
      if (currentQty < quantity) throw new Error("INVALID_CLOSE_QUANTITY");
      const closeRatio = quantity / currentQty;
      const releasedMargin = Number(existing.margin_used || 0) * closeRatio;
      const realizedPnl = (price - Number(existing.entry_price || price)) * quantity * (positionSide === "long" ? 1 : -1);
      const remainingQty = currentQty - quantity;
      if (remainingQty <= 0) {
        removeTradePosition(user.id, instrument.symbol, marketType, positionSide);
      } else {
        upsertTradePosition(user.id, {
          symbol: instrument.symbol,
          marketType,
          side: positionSide,
          quantity: round(remainingQty, 8),
          entryPrice: Number(existing.entry_price),
          leverage: Number(existing.leverage),
          marginUsed: round(Number(existing.margin_used || 0) - releasedMargin, 8)
        });
      }
      cash += releasedMargin + realizedPnl;
      note = `${positionSide === "long" ? "平多" : "平空"} ${instrument.symbol}`;
    } else {
      throw new Error("INVALID_ACTION");
    }
    updateTradeCash(user.id, round(cash, 8));
  }

  insertTradeOrder({
    id: randomUUID(),
    userId: user.id,
    symbol: instrument.symbol,
    marketType,
    action,
    side,
    orderKind,
    quantity: round(quantity, 8),
    price: round(price, instrument.basePrice < 1 ? 6 : 2),
    leverage,
    status: "filled",
    note,
    createdAt: new Date().toLocaleString()
  });

  return {
    provider: "simulated",
    message: note,
    ...getTradeBootstrap(user.id, instrument.symbol)
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

function normalizeGaokaoDimensions(dimensions, config, fallbackDimensions = []) {
  const candidates = Array.isArray(dimensions) ? dimensions : [];
  return config.dimensions.map((dimension, index) => {
    const matched = candidates.find((item) => item?.label === dimension.label) || candidates[index] || fallbackDimensions[index] || {};
    return {
      label: dimension.label,
      maxScore: dimension.maxScore,
      score: clamp(Math.round(Number(matched.score ?? fallbackDimensions[index]?.score ?? 0)), 0, dimension.maxScore),
      comment: String(matched.comment || fallbackDimensions[index]?.comment || "")
    };
  });
}

function normalizeGaokaoList(items, fallbackItems = [], limit = 4) {
  const source = Array.isArray(items) ? items : [];
  return uniqueStrings(
    source
      .map((item) => String(item || "").trim())
      .filter(Boolean),
    limit
  ).length
    ? uniqueStrings(
        source
          .map((item) => String(item || "").trim())
          .filter(Boolean),
        limit
      )
    : (fallbackItems || []).slice(0, limit);
}

function gaokaoScoringPrompt(config) {
  if (config.subject === "english") {
    return [
      "你是一位中国高考英语作文阅卷老师兼教研员。",
      "请按高考英语应用文/读后续写的真实评分口径批改，不要鼓励式虚高。",
      "评分要拉开档次，普通但完整的作文通常在 14-18 分；结构稳、表达准确、完成度高的作文才能到 20 分以上；明显漏要点、篇幅不足、语言错误多的作文要压低。",
      "反馈必须具体、可执行，适合老师讲评和学生改稿。"
    ].join("\n");
  }
  return [
    "你是一位中国高考语文作文阅卷老师兼教研员。",
    "请按高考语文作文真实阅卷口径评分，不要给鼓励分，不要泛泛说好。",
    "评分要拉开档次，普通但成文的作文通常在 40-46 分；审题准、结构稳、内容充实、表达有层次的作文才可以上 50；偏题、空泛、篇幅明显不足的作文要明显压分。",
    "反馈必须具体、可执行，适合老师讲评和学生改稿。"
  ].join("\n");
}

async function openAiGaokaoReport(body, previousProfile) {
  const subject = body.subject === "english" ? "english" : "chinese";
  const examType = String(body.examType || (subject === "english" ? "task-writing" : "material-essay"));
  const config = gaokaoSubjectConfig(subject, examType);
  const baseReport = demoGaokaoReport({ ...body, subject, examType }, previousProfile);
  const playbook = buildTeachingPlaybook("gaokao", subject, `${body.prompt}\n${body.requirements}\n${body.essay}`);
  const schema = {
    type: "object",
    additionalProperties: false,
    required: [
      "scaledScore",
      "estimatedLow",
      "estimatedHigh",
      "scoreConfidence",
      "dimensions",
      "strengths",
      "issues",
      "actionItems",
      "teacherCheckpoints",
      "revisionGuidance",
      "coachingFocus",
      "selfCorrectionPrompts"
    ],
    properties: {
      scaledScore: { type: "integer", minimum: 0, maximum: config.targetMax },
      estimatedLow: { type: "integer", minimum: 0, maximum: config.targetMax },
      estimatedHigh: { type: "integer", minimum: 0, maximum: config.targetMax },
      scoreConfidence: { type: "integer", minimum: 0, maximum: 100 },
      dimensions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "score", "comment"],
          properties: {
            label: { type: "string" },
            score: { type: "integer", minimum: 0, maximum: Math.max(...config.dimensions.map((item) => item.maxScore)) },
            comment: { type: "string" }
          }
        }
      },
      strengths: { type: "array", items: { type: "string" } },
      issues: { type: "array", items: { type: "string" } },
      actionItems: { type: "array", items: { type: "string" } },
      teacherCheckpoints: { type: "array", items: { type: "string" } },
      revisionGuidance: { type: "string" },
      coachingFocus: { type: "array", items: { type: "string" } },
      selfCorrectionPrompts: { type: "array", items: { type: "string" } }
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
                gaokaoScoringPrompt(config),
                `学科：${config.subjectLabel}`,
                `题型：${examType}`,
                `总分：${config.targetMax}`,
                `维度：${config.dimensions.map((item) => `${item.label}（满分 ${item.maxScore}）`).join("、")}`,
                `学生画像：${JSON.stringify(normalizeStudentProfile(body.studentProfile || {}))}`,
                previousProfile ? `历史训练档案：${JSON.stringify(previousProfile)}` : "历史训练档案：暂无。",
                playbook.focus.length ? `名师蒸馏重点：${playbook.focus.join("\n")}` : "名师蒸馏重点：无。",
                playbook.pitfalls.length ? `高频失误提醒：${playbook.pitfalls.join("\n")}` : "高频失误提醒：无。",
                playbook.actions.length ? `优先动作建议：${playbook.actions.join("\n")}` : "优先动作建议：请直接给出可执行改稿动作。",
                `参考基线评分：${baseReport.scaledScore}/${config.targetMax}，建议区间 ${baseReport.estimatedLow}-${baseReport.estimatedHigh}，置信度 ${baseReport.scoreConfidence}%。`,
                "输出必须是简体中文，且必须只返回 JSON。",
                "JSON 字段必须包含：scaledScore, estimatedLow, estimatedHigh, scoreConfidence, dimensions, strengths, issues, actionItems, teacherCheckpoints, revisionGuidance, coachingFocus, selfCorrectionPrompts。",
                "dimensions 中的 label 必须沿用给定评分维度；分数必须落在该维度满分范围内。",
                "coachingFocus 要写成可直接给学生或老师使用的蒸馏重点；selfCorrectionPrompts 要写成让学生自己反思的追问。"
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
                `学校：${body.schoolName || "未填写"}`,
                `班级：${body.className || "未填写"}`,
                `年级：${body.gradeLevel || "高三"}`,
                `学生：${body.studentName || "未命名学生"}`,
                `作文题目：${body.prompt}`,
                `写作要求：${body.requirements || "未填写"}`,
                "学生作文：",
                body.essay
              ].join("\n\n")
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "gaokao_report",
          strict: true,
          schema
        }
      }
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "OpenAI Gaokao request failed");
  }
  const parsed = JSON.parse(payload.output_text);
  return {
    ...baseReport,
    scaledScore: clamp(Math.round(Number(parsed.scaledScore ?? baseReport.scaledScore)), 0, config.targetMax),
    estimatedLow: clamp(Math.round(Number(parsed.estimatedLow ?? baseReport.estimatedLow)), 0, config.targetMax),
    estimatedHigh: clamp(Math.round(Number(parsed.estimatedHigh ?? baseReport.estimatedHigh)), 0, config.targetMax),
    scoreConfidence: clamp(Math.round(Number(parsed.scoreConfidence ?? baseReport.scoreConfidence)), 35, 99),
    dimensions: normalizeGaokaoDimensions(parsed.dimensions, config, baseReport.dimensions),
    strengths: normalizeGaokaoList(parsed.strengths, baseReport.strengths, 4),
    issues: normalizeGaokaoList(parsed.issues, baseReport.issues, 4),
    actionItems: normalizeGaokaoList(parsed.actionItems, baseReport.actionItems, 4),
    teacherCheckpoints: normalizeGaokaoList(parsed.teacherCheckpoints, baseReport.teacherCheckpoints, 4),
    revisionGuidance: String(parsed.revisionGuidance || baseReport.revisionGuidance || ""),
    coachingFocus: normalizeGaokaoList(parsed.coachingFocus, baseReport.coachingFocus, 4),
    selfCorrectionPrompts: normalizeGaokaoList(parsed.selfCorrectionPrompts, baseReport.selfCorrectionPrompts, 4)
  };
}

async function deepSeekGaokaoReport(body, previousProfile) {
  const subject = body.subject === "english" ? "english" : "chinese";
  const examType = String(body.examType || (subject === "english" ? "task-writing" : "material-essay"));
  const config = gaokaoSubjectConfig(subject, examType);
  const baseReport = demoGaokaoReport({ ...body, subject, examType }, previousProfile);
  const playbook = buildTeachingPlaybook("gaokao", subject, `${body.prompt}\n${body.requirements}\n${body.essay}`);
  const parsed = await deepSeekJsonChat({
    systemPrompt: [
      gaokaoScoringPrompt(config),
      `学科：${config.subjectLabel}`,
      `题型：${examType}`,
      `总分：${config.targetMax}`,
      `维度：${config.dimensions.map((item) => `${item.label}（满分 ${item.maxScore}）`).join("、")}`,
      `学生画像：${JSON.stringify(normalizeStudentProfile(body.studentProfile || {}))}`,
      previousProfile ? `历史训练档案：${JSON.stringify(previousProfile)}` : "历史训练档案：暂无。",
      playbook.focus.length ? `名师蒸馏重点：${playbook.focus.join("\n")}` : "名师蒸馏重点：无。",
      playbook.pitfalls.length ? `高频失误提醒：${playbook.pitfalls.join("\n")}` : "高频失误提醒：无。",
      playbook.actions.length ? `优先动作建议：${playbook.actions.join("\n")}` : "优先动作建议：请直接给出可执行改稿动作。",
      `参考基线评分：${baseReport.scaledScore}/${config.targetMax}，建议区间 ${baseReport.estimatedLow}-${baseReport.estimatedHigh}，置信度 ${baseReport.scoreConfidence}%。`,
      "只返回 JSON，不要输出 Markdown。",
      "JSON 字段必须包含：scaledScore, estimatedLow, estimatedHigh, scoreConfidence, dimensions, strengths, issues, actionItems, teacherCheckpoints, revisionGuidance, coachingFocus, selfCorrectionPrompts。",
      "dimensions 中的 label 必须沿用给定评分维度；分数必须落在该维度满分范围内。",
      "反馈必须具体、可执行，不要只说“多积累、多练习”。"
    ].join("\n"),
    userPrompt: [
      `学校：${body.schoolName || "未填写"}`,
      `班级：${body.className || "未填写"}`,
      `年级：${body.gradeLevel || "高三"}`,
      `学生：${body.studentName || "未命名学生"}`,
      `作文题目：${body.prompt}`,
      `写作要求：${body.requirements || "未填写"}`,
      `学生作文：${body.essay}`
    ].join("\n\n"),
    fallbackError: "DeepSeek Gaokao request failed"
  });

  return {
    ...baseReport,
    scaledScore: clamp(Math.round(Number(parsed.scaledScore ?? baseReport.scaledScore)), 0, config.targetMax),
    estimatedLow: clamp(Math.round(Number(parsed.estimatedLow ?? baseReport.estimatedLow)), 0, config.targetMax),
    estimatedHigh: clamp(Math.round(Number(parsed.estimatedHigh ?? baseReport.estimatedHigh)), 0, config.targetMax),
    scoreConfidence: clamp(Math.round(Number(parsed.scoreConfidence ?? baseReport.scoreConfidence)), 35, 99),
    dimensions: normalizeGaokaoDimensions(parsed.dimensions, config, baseReport.dimensions),
    strengths: normalizeGaokaoList(parsed.strengths, baseReport.strengths, 4),
    issues: normalizeGaokaoList(parsed.issues, baseReport.issues, 4),
    actionItems: normalizeGaokaoList(parsed.actionItems, baseReport.actionItems, 4),
    teacherCheckpoints: normalizeGaokaoList(parsed.teacherCheckpoints, baseReport.teacherCheckpoints, 4),
    revisionGuidance: String(parsed.revisionGuidance || baseReport.revisionGuidance || ""),
    coachingFocus: normalizeGaokaoList(parsed.coachingFocus, baseReport.coachingFocus, 4),
    selfCorrectionPrompts: normalizeGaokaoList(parsed.selfCorrectionPrompts, baseReport.selfCorrectionPrompts, 4)
  };
}

function gaokaoSubjectConfig(subject, examType) {
  if (subject === "english") {
    return {
      subject: "english",
      subjectLabel: "高考英语",
      targetMax: examType === "continuation" ? 25 : 25,
      dimensions: [
        { key: "task", label: "任务完成", maxScore: 5 },
        { key: "points", label: "要点覆盖", maxScore: 5 },
        { key: "organization", label: "篇章结构", maxScore: 5 },
        { key: "language", label: "语言准确", maxScore: 5 },
        { key: "upgrade", label: "词汇句式", maxScore: 5 }
      ]
    };
  }
  return {
    subject: "chinese",
    subjectLabel: "高考语文",
    targetMax: 60,
    dimensions: [
      { key: "intent", label: "审题立意", maxScore: 12 },
      { key: "content", label: "内容充实", maxScore: 12 },
      { key: "structure", label: "结构推进", maxScore: 12 },
      { key: "expression", label: "语言表达", maxScore: 12 },
      { key: "development", label: "发展等级", maxScore: 12 }
    ]
  };
}

function englishCoverage(prompt, essay) {
  const keywords = Array.from(new Set(
    String(prompt || "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 4)
  ));
  if (!keywords.length) return 0.75;
  const body = String(essay || "").toLowerCase();
  const hits = keywords.filter((word) => body.includes(word)).length;
  return hits / keywords.length;
}

function chineseEssayMetrics(prompt, essay) {
  const text = String(essay || "");
  const compact = text.replace(/\s/g, "");
  const charTotal = compact.length;
  const paragraphCount = text.split(/\n+/).map((item) => item.trim()).filter(Boolean).length;
  const sentenceCount = countSentences(text);
  const hasTitle = /^.{4,28}\n/.test(text.trim());
  const hasOpening = paragraphCount >= 3;
  const hasExamples = /例如|比如|正如|有人说|曾经|材料|现实中|生活中|历史上/.test(text);
  const hasTurn = /但是|然而|同时|另一方面|进一步|因此|所以|由此可见|总之/.test(text);
  const hasConclusion = /总之|因此|由此可见|归根到底|面向未来|最终/.test(text);
  const promptFit = chineseCoverage(prompt, text);
  return { charTotal, paragraphCount, sentenceCount, hasTitle, hasOpening, hasExamples, hasTurn, hasConclusion, promptFit };
}

function englishEssayMetrics(prompt, essay) {
  const text = String(essay || "");
  const wordTotal = getWords(text).length;
  const paragraphCount = countParagraphs(text);
  const connectorCount = countConnectors(text);
  const longSentenceCount = countLongSentences(text);
  const promptFit = englishCoverage(prompt, text);
  const hasGreeting = /dear\s|hello\s/i.test(text);
  const hasClosing = /yours|sincerely|best regards|thank you/i.test(text);
  return { wordTotal, paragraphCount, connectorCount, longSentenceCount, promptFit, hasGreeting, hasClosing };
}

function buildStudentGrowthAdvice(subject, studentProfile, cohortContext, weakestLabel) {
  const actions = [];
  if (studentProfile.targetTrack) {
    actions.push(`你当前的目标方向是“${studentProfile.targetTrack}”，后续改稿要先围绕这个目标把最不稳定的短板补齐。`);
  }
  if (studentProfile.currentIssue) {
    actions.push(`你自己也提到目前最卡的是“${studentProfile.currentIssue}”，下一轮练习不要贪多，先只攻这一个点。`);
  }
  if (studentProfile.teacherComment) {
    actions.push(`老师最近提醒你“${studentProfile.teacherComment}”，系统建议把它设成这周作文自查第一项。`);
  }
  if (weakestLabel) {
    actions.push(`当前最值得优先修的是“${weakestLabel}”，因为它最容易形成连锁失分。`);
  }
  if (cohortContext?.classAverage != null) {
    const delta = Math.round((cohortContext.currentScore || 0) - cohortContext.classAverage);
    if (delta >= 3) {
      actions.push(`你目前高于班级均分约 ${delta} 分，下一步重点不是多写，而是把失分点变得更稳定。`);
    } else if (delta <= -3) {
      actions.push(`你目前比班级均分低约 ${Math.abs(delta)} 分，建议先做“低门槛、可重复”的纠错训练，连续 3 次只盯固定错误。`);
    } else {
      actions.push("你现在大致处在班级中段，最适合通过稳定改错把自己往上拉，而不是一味追求花哨表达。");
    }
  }
  return actions.slice(0, 4);
}

function buildSelfCorrectionPrompts(subject, weakestDimension, issues = []) {
  const starter = subject === "english"
    ? ["我有没有把题目要求写全？", "有没有哪一句我自己读起来就不稳？", "有没有一段可以更清楚地重写？"]
    : ["我的中心句是否真的扣题？", "每一段有没有完成自己的任务？", "哪一处最像空话，能不能换成例子或分析？"];
  if (weakestDimension) {
    starter.unshift(`这次我最容易丢分的是“${weakestDimension}”，下一稿我打算怎么改？`);
  }
  if (issues[0]) {
    starter.push(`如果把“${issues[0]}”这个问题改掉，我的分数最可能从哪里提升？`);
  }
  return starter.slice(0, 4);
}

function demoGaokaoReport(body, previousProfile) {
  const subject = body.subject === "english" ? "english" : "chinese";
  const examType = String(body.examType || (subject === "english" ? "practical-writing" : "material-essay"));
  const config = gaokaoSubjectConfig(subject, examType);
  const playbook = buildTeachingPlaybook("gaokao", subject, `${body.prompt}\n${body.essay}`);
  const studentProfile = normalizeStudentProfile(body.studentProfile || {});
  if (subject === "english") {
    const metrics = englishEssayMetrics(body.prompt, body.essay);
    const minWords = examType === "continuation" ? 120 : 80;
    const dimensions = [
      {
        label: "任务完成",
        score: clamp(Math.round(2 + metrics.promptFit * 3 + (metrics.wordTotal >= minWords ? 1 : 0)), 1, 5),
        maxScore: 5,
        comment: metrics.wordTotal >= minWords ? "基本完成写作任务，但仍需更贴合题干中的动作要求。" : "篇幅偏短，阅卷时容易被判断为任务展开不足。"
      },
      {
        label: "要点覆盖",
        score: clamp(Math.round(2 + metrics.promptFit * 3), 1, 5),
        maxScore: 5,
        comment: metrics.promptFit >= 0.58 ? "主要信息点有覆盖，但细节还可以更完整。" : "题目关键信息覆盖不足，建议先列要点再写。"
      },
      {
        label: "篇章结构",
        score: clamp(Math.round(2 + Math.min(metrics.paragraphCount, 3) * 0.8 + Math.min(metrics.connectorCount, 5) * 0.25), 1, 5),
        maxScore: 5,
        comment: metrics.paragraphCount >= 3 ? "段落意识较清楚，阅卷老师能较快抓到结构。" : "分段还不够清楚，建议至少形成开头、主体、结尾。"
      },
      {
        label: "语言准确",
        score: clamp(Math.round(3 + (metrics.longSentenceCount <= 2 ? 1 : 0) - Math.max(metrics.longSentenceCount - 3, 0) * 0.4), 1, 5),
        maxScore: 5,
        comment: metrics.longSentenceCount <= 2 ? "语言相对稳，适合继续在准确前提下升级表达。" : "长句偏多，容易带来语法失误，先保准确再求复杂。"
      },
      {
        label: "词汇句式",
        score: clamp(Math.round(2 + Math.min(metrics.connectorCount, 4) * 0.4 + (metrics.hasGreeting || metrics.hasClosing ? 1 : 0)), 1, 5),
        maxScore: 5,
        comment: "可以继续增加更自然的连接和句式变化，但不建议为高级而牺牲准确。"
      }
    ];
    const scaledScore = dimensions.reduce((sum, item) => sum + item.score, 0);
    const confidence = clamp(Math.round(78 - Math.abs(metrics.wordTotal - minWords) / 8), 58, 90);
    const cohort = compareAgainstCohort(subject, body.className || body.schoolName || "", body.studentName || "", scaledScore);
    const weakestDimension = dimensions.slice().sort((a, b) => (a.score / a.maxScore) - (b.score / b.maxScore))[0]?.label || "";
    const growthAdvice = buildStudentGrowthAdvice(subject, studentProfile, { ...cohort, currentScore: scaledScore }, weakestDimension);
    const selfCorrectionPrompts = buildSelfCorrectionPrompts(subject, weakestDimension, [
      metrics.promptFit < 0.58 ? "题目要点覆盖还不够满，容易丢任务分。" : "要点基本覆盖，但细节支撑还不够具体。",
      metrics.longSentenceCount > 2 ? "复杂句偏多而不够稳，建议先降难度保准确。" : "语言准确性尚可，但句式升级空间还在。"
    ]);
    return {
      subject,
      subjectLabel: config.subjectLabel,
      examType,
      gradeLevel: body.gradeLevel || "高三",
      studentName: body.studentName || "未命名学生",
      schoolName: body.schoolName || "",
      className: body.className || "",
      prompt: body.prompt,
      requirements: body.requirements || "",
      essay: body.essay,
      targetMax: config.targetMax,
      scaledScore,
      estimatedLow: Math.max(0, scaledScore - 2),
      estimatedHigh: Math.min(config.targetMax, scaledScore + 2),
      scoreConfidence: confidence,
      dimensions,
      strengths: [
        metrics.wordTotal >= minWords ? `篇幅基本达标，当前约 ${metrics.wordTotal} 词。` : `已经完成基本作答，但当前约 ${metrics.wordTotal} 词，篇幅偏紧。`,
        metrics.paragraphCount >= 3 ? "有明确分段，老师快速扫卷时更容易判断结构。" : "已有基础结构意识，继续把段落边界拉清楚会更稳。",
        playbook.snippets[0] ? `当前写法和教研要点“${playbook.snippets[0].title}”是同方向的。` : "整体方向可用，具备继续提分的基础。"
      ],
      issues: [
        metrics.promptFit < 0.58 ? "题目要点覆盖还不够满，容易丢任务分。" : "要点基本覆盖，但细节支撑还不够具体。",
        metrics.longSentenceCount > 2 ? "复杂句偏多而不够稳，建议先降难度保准确。" : "语言准确性尚可，但句式升级空间还在。",
        "如果这是给老师复核，优先看 AI 是否把任务完成分压得过低或过高。"
      ],
      actionItems: [
        "写前先把题目动作词和信息点圈出来，再对应成 2 到 3 个段落。",
        "优先写对基础句，再局部加入 1 到 2 个高级句式。",
        "交卷前单查时态、主谓一致和拼写。",
        ...playbook.actions
      ].slice(0, 3),
      teacherCheckpoints: [
        "先看是否完成题目规定任务，再决定是否接受 AI 分数。",
        "如果要点写全但表达一般，人工可考虑上调 1 分左右。",
        "如果篇幅明显不足或偏题，人工应比 AI 更严格。",
        ...playbook.focus
      ].slice(0, 3),
      revisionGuidance: previousProfile?.recurringIssues?.length
        ? `你最近长期问题集中在“${previousProfile.recurringIssues.slice(0, 2).join("、")}”。这次修改时先不求花哨，先把这些旧问题逐条消掉。优先动作：${playbook.actions[0] || "先完成任务再优化表达"}`
        : `下一稿先按“任务是否完成、要点是否写全、句子是否稳”这三个问题自查，再考虑润色。优先动作：${playbook.actions[0] || "先完成任务再优化表达"}`,
      coachingFocus: uniqueStrings([...growthAdvice, ...playbook.focus.slice(0, 2)], 4),
      selfCorrectionPrompts: uniqueStrings([...selfCorrectionPrompts, ...playbook.selfCheck], 4),
      cohortSnapshot: cohort,
      studentProfile,
      profileSnapshot: previousProfile || {}
    };
  }

  const metrics = chineseEssayMetrics(body.prompt, body.essay);
  const dimensions = [
    {
      label: "审题立意",
      score: clamp(Math.round(6 + metrics.promptFit * 6 + (metrics.hasTitle ? 1 : 0)), 4, 12),
      maxScore: 12,
      comment: metrics.promptFit >= 0.56 ? "基本围绕题意展开，但中心还能再压得更稳。" : "存在偏表层回应的风险，老师复核时应重点看是否真正扣题。"
    },
    {
      label: "内容充实",
      score: clamp(Math.round(5 + Math.min(metrics.charTotal / 180, 4) + (metrics.hasExamples ? 2 : 0)), 4, 12),
      maxScore: 12,
      comment: metrics.hasExamples ? "有一定材料或例子支撑，不至于空转。" : "例证和细节不足，容易显得只有观点没有展开。"
    },
    {
      label: "结构推进",
      score: clamp(Math.round(5 + Math.min(metrics.paragraphCount, 5) + (metrics.hasTurn ? 2 : 0)), 4, 12),
      maxScore: 12,
      comment: metrics.paragraphCount >= 4 ? "段落推进基本清楚，适合老师快速扫读。" : "结构层次还不够展开，建议至少形成起承转合。"
    },
    {
      label: "语言表达",
      score: clamp(Math.round(6 + Math.min(metrics.sentenceCount / 8, 2) + (metrics.hasConclusion ? 2 : 0)), 4, 12),
      maxScore: 12,
      comment: "语言整体可读，但还需要继续减少泛泛空话，增强句子力度。"
    },
    {
      label: "发展等级",
      score: clamp(Math.round(4 + (metrics.hasExamples ? 2 : 0) + (metrics.hasTurn ? 2 : 0) + (metrics.hasConclusion ? 1 : 0) + (metrics.hasTitle ? 1 : 0)), 3, 12),
      maxScore: 12,
      comment: "发展等级主要看思考深度和表达完成度，老师复核时要重点看是否真的有层次推进。"
    }
  ];
  let scaledScore = dimensions.reduce((sum, item) => sum + item.score, 0);
  if (metrics.charTotal < 700) scaledScore -= 4;
  if (metrics.charTotal > 1300) scaledScore -= 2;
  scaledScore = clamp(scaledScore, 20, config.targetMax);
  const confidence = clamp(Math.round(80 - Math.abs(metrics.charTotal - 900) / 25), 55, 91);
  const cohort = compareAgainstCohort(subject, body.className || body.schoolName || "", body.studentName || "", scaledScore);
  const weakestDimension = dimensions.slice().sort((a, b) => (a.score / a.maxScore) - (b.score / b.maxScore))[0]?.label || "";
  const growthAdvice = buildStudentGrowthAdvice(subject, studentProfile, { ...cohort, currentScore: scaledScore }, weakestDimension);
  const selfCorrectionPrompts = buildSelfCorrectionPrompts(subject, weakestDimension, [
    metrics.promptFit < 0.56 ? "审题压得还不够准，老师应优先看是否存在偏题风险。" : "立意方向基本对，但中心句还可以更锋利。",
    !metrics.hasExamples ? "例证不足，内容容易显得虚。" : "例子有了，但还要让它真正服务分论点。"
  ]);
  return {
    subject,
    subjectLabel: config.subjectLabel,
    examType,
    gradeLevel: body.gradeLevel || "高三",
    studentName: body.studentName || "未命名学生",
    schoolName: body.schoolName || "",
    className: body.className || "",
    prompt: body.prompt,
    requirements: body.requirements || "",
    essay: body.essay,
    targetMax: config.targetMax,
    scaledScore,
    estimatedLow: Math.max(0, scaledScore - 4),
    estimatedHigh: Math.min(config.targetMax, scaledScore + 4),
    scoreConfidence: confidence,
    dimensions,
    strengths: [
      metrics.hasTitle ? "标题意识较好，阅卷时第一眼观感不会太差。" : "已形成基本成文状态，具备进一步打磨基础。",
      metrics.paragraphCount >= 4 ? `当前有 ${metrics.paragraphCount} 段，结构雏形比较完整。` : "已经有段落区分，继续强化段间推进会更稳。",
      metrics.hasExamples ? "文章里有例证或现实支撑，不完全停留在空泛议论。" : "中心方向基本可用，下一步关键是补材料和细节。"
    ],
    issues: [
      metrics.promptFit < 0.56 ? "审题压得还不够准，老师应优先看是否存在偏题风险。" : "立意方向基本对，但中心句还可以更锋利。",
      !metrics.hasExamples ? "例证不足，内容容易显得虚。" : "例子有了，但还要让它真正服务分论点。",
      metrics.charTotal < 780 ? "篇幅偏短，发展等级和内容充实度都会受影响。" : "老师复核时重点看结构推进分是否与文章完成度匹配。"
    ],
    actionItems: [
      "先把题意压成一句中心句，再决定每段各承担什么任务。",
      "每个主体段尽量做到“观点一句 + 例子一组 + 回扣一句”。",
      "结尾不要只喊口号，要把题目关键词再扣回来。",
      ...playbook.actions
    ].slice(0, 3),
    teacherCheckpoints: [
      "先看是否偏题，再看中心句是否真正统领全文。",
      "如果文章结构清楚但例子偏虚，人工可维持中档，不宜高判。",
      "如果立意准确、结构稳、语言完整，人工可在 AI 区间上沿给分。",
      ...playbook.focus
    ].slice(0, 3),
    revisionGuidance: previousProfile?.recurringIssues?.length
      ? `你的长期问题里，“${previousProfile.recurringIssues.slice(0, 2).join("、")}”出现频率最高。这次改稿时先只改这两个问题，提分会更明显。优先动作：${playbook.actions[0] || "把中心句和段首句改准"}`
      : `建议下一稿先重写开头中心句和每段首句，先把骨架立住，再补细节。优先动作：${playbook.actions[0] || "把中心句和段首句改准"}`,
    coachingFocus: uniqueStrings([...growthAdvice, ...playbook.focus.slice(0, 2)], 4),
    selfCorrectionPrompts: uniqueStrings([...selfCorrectionPrompts, ...playbook.selfCheck], 4),
    cohortSnapshot: cohort,
    studentProfile,
    profileSnapshot: previousProfile || {}
  };
}

async function gradeGaokao(body, user) {
  const history = getGaokaoHistory(user.id);
  const plan = plans[user.plan] || plans.free;
  if (history.length >= plan.quota) {
    throw new Error("QUOTA_EXCEEDED");
  }

  const previousProfile = getLearningProfile(user.id, "gaokao");
  const subject = body.subject === "english" ? "english" : "chinese";
  const studentName = String(body.studentName || "未命名学生").trim();
  const className = String(body.className || "").trim();
  const persistedStudentProfile = getGaokaoStudentProfile(user.id, subject, studentName, className) || {};
  const mergedStudentProfile = {
    ...persistedStudentProfile,
    ...normalizeStudentProfile(body.studentProfile || {})
  };
  saveGaokaoStudentProfile(user.id, subject, studentName, body.schoolName || "", className, mergedStudentProfile);
  const provider = textProvider();
  const report = provider === "deepseek"
    ? await deepSeekGaokaoReport({ ...body, studentProfile: mergedStudentProfile, subject }, previousProfile)
    : provider === "openai"
      ? await openAiGaokaoReport({ ...body, studentProfile: mergedStudentProfile, subject }, previousProfile)
      : demoGaokaoReport({ ...body, studentProfile: mergedStudentProfile, subject }, previousProfile);
  const record = {
    id: randomUUID(),
    userId: user.id,
    timestamp: new Date().toLocaleString(),
    provider,
    ...report
  };
  insertGaokaoReport(record);
  const profile = buildGaokaoLearningProfile(user.id);
  saveLearningProfile(user.id, "gaokao", profile);
  return {
    provider,
    report: record,
    history: getGaokaoHistory(user.id),
    profile
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

function parseReferenceOutline(referenceOutline) {
  return String(referenceOutline || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[（(]?[一二三四五六七八九十0-9]+[)）、.\s-]*/, "").trim())
    .filter(Boolean);
}

function referenceOutlineCoverage(referenceOutline, answerText) {
  const lines = parseReferenceOutline(referenceOutline);
  if (!lines.length) return { score: 0, matched: [], missing: [] };
  const compactAnswer = String(answerText || "").replace(/\s/g, "");
  const matched = lines.filter((line) => chineseCoverage(line, compactAnswer) >= 0.42);
  return {
    score: matched.length / lines.length,
    matched,
    missing: lines.filter((line) => !matched.includes(line))
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

function demoShenlunReport({ questionType, maxScore, prompt, material, answer, referenceOutline }) {
  const rubric = getShenlunRubric(questionType);
  const playbook = buildTeachingPlaybook("shenlun", rubric.questionType, `${prompt}\n${material}\n${referenceOutline}\n${answer}`);
  const answerText = String(answer || "");
  const charTotal = answerText.replace(/\s/g, "").length;
  const materialCoverage = chineseCoverage(material, answerText);
  const promptCoverageValue = chineseCoverage(prompt, answerText);
  const referenceCoverage = referenceOutlineCoverage(referenceOutline, answerText);
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
    { label: rubric.dimensions[0], score: 54 + promptCoverageValue * 18 + (style.hasCentralThesis ? 8 : -5) + (style.hasTension ? 8 : -6) + referenceCoverage.score * 10, comment: referenceOutline ? (referenceCoverage.score >= 0.6 ? "中心论点和参考结构基本同向，但还要继续压实政策表达。" : "中心论点与参考分论点的主线还不够贴合，建议先把总论点压准。") : (style.hasTension ? "中心论点能够触及材料背后的治理张力，但还要进一步压实政策表达。" : "立意仍偏表层，建议从材料中提炼更明确的核心矛盾。") },
    { label: rubric.dimensions[1], score: 52 + (paragraphCount >= 5 ? 12 : 4) + (style.hasTension ? 8 : 0) + Math.min(policyWords, 8) + referenceCoverage.score * 14, comment: referenceOutline ? (referenceCoverage.score >= 0.6 ? "分论点与参考结构有一定对应，但分论点之间的层次和递进还可更清楚。" : "参考分论点覆盖不足，建议按参考结构先列出 3 个分论点再展开。") : (paragraphCount >= 5 ? "分论点结构基本清楚，但分论点之间的递进关系仍可增强。" : "分论点层次不够稳定，建议用更清晰的并列或递进结构展开。") },
    { label: rubric.dimensions[2], score: 50 + Math.min(style.materialMarkers * 6, 24) + (style.hasPolicyLanding ? 8 : -4), comment: style.materialMarkers >= 3 ? "能够调用材料细节支撑观点，但部分材料还可进一步抽象为治理原则。" : "材料使用偏弱，容易显得空泛或脱离给定资料。" },
    { label: rubric.dimensions[3], score: 52 + Math.max(materialCoverage, referenceCoverage.score) * 18 + Math.min(policyWords, 10), comment: referenceOutline ? "如果没有完整材料，也要把参考分论点转化成自己的论证结构，而不是简单复述标题。" : "材料联系需要服务于论证，不宜只罗列故事或只提口号。" },
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
  const missing = (referenceOutline
    ? referenceCoverage.missing
    : rubric.focusPoints.filter((point) => !answerText.includes(point.slice(0, 2)))
  ).slice(0, 4);

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
      isEssay && style.colloquialHits ? "个别表达偏口语化，建议改成更稳健的议论文表达。" : "评分会继续按立意、材料转化和表达规范拉开维度差距。",
      ...playbook.pitfalls.slice(0, 1)
    ].slice(0, 4),
    missing: uniqueStrings([...(missing.length ? missing : ["材料关键词", "分层表达"]), ...playbook.selfCheck.slice(0, 2)], 4),
    rewrite: referenceOutline
      ? `建议先按参考结构把总论点和 3 个分论点列成提纲，再检查你的文章是否真正覆盖了“${parseReferenceOutline(referenceOutline).slice(0, 3).join("、")}”。本次先优先改：${playbook.actions[0] || "让每个分论点承担不同任务"}。下一稿自查：${playbook.selfCheck[0] || "我的总论点能不能统领全文？"}`
      : `建议围绕“${rubric.focusPoints.slice(0, 3).join("、")}”重新组织答案。作答时要尽量使用材料关键词，把问题、原因、影响和对策分层呈现，避免只写泛泛口号。本次先优先改：${playbook.actions[0] || "先锁定概括对象再分层展开"}。下一稿自查：${playbook.selfCheck[0] || "我有没有把概括对象写准？"}`
  };
}

async function openAiShenlunReport({ questionType, maxScore, prompt, material, answer, referenceOutline }) {
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
                "如果答案只是套话完整但材料转化弱，分数必须控制在中等区间；如果口语化明显，要在语言表达或论证深度中扣分。",
                referenceOutline ? "本次大作文提供了参考分论点，请重点对照中心论点是否贴合、分论点是否覆盖、结构是否对应。" : ""
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
                referenceOutline ? `参考分论点：${referenceOutline}` : "",
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

async function deepSeekShenlunReport({ questionType, maxScore, prompt, material, answer, referenceOutline, userProfile }) {
  const rubric = getShenlunRubric(questionType);
  const targetMax = Number(maxScore || 30);
  const playbook = buildTeachingPlaybook("shenlun", rubric.questionType, `${prompt}\n${material}\n${referenceOutline}\n${answer}`);
  const parsed = await deepSeekJsonChat({
    systemPrompt: [
      "你是一位中国公务员考试申论阅卷与教研专家。",
      "请按申论阅卷逻辑批改，不要按普通作文泛泛评价。",
      shenlunScoringGuide(rubric, targetMax),
      `题型：${rubric.label}`,
      `目标分值：${targetMax}`,
      `评分维度：${rubric.dimensions.join("、")}`,
      `核心关注点：${rubric.focusPoints.join("、")}`,
      referenceOutline ? "本次大作文带有参考分论点或参考结构，请把它视为对照标准。重点判断中心论点是否同向、分论点覆盖是否充分、结构是否贴合；不要要求考生逐字复述参考答案，但如果明显漏掉核心分论点，要在要点覆盖和逻辑结构里扣分。" : "本次未提供参考分论点，请按常规申论阅卷逻辑评分。",
      userProfile ? `该考生已有训练档案：${JSON.stringify(userProfile)}` : "该考生暂无历史训练档案。",
      playbook.focus.length ? `名师蒸馏重点：${playbook.focus.join("\n")}` : "名师蒸馏重点：无。",
      playbook.pitfalls.length ? `高频失误提醒：${playbook.pitfalls.join("\n")}` : "高频失误提醒：无。",
      playbook.actions.length ? `给建议时优先使用这些可执行动作：${playbook.actions.join("\n")}` : "给建议时优先给出可执行动作，不要只说“多积累、多练习”。",
      "只返回 JSON，不要输出 Markdown。",
      "JSON 字段必须包含：scaledScore, percentScore, dimensions, strengths, weaknesses, missing, rewrite。",
      "scaledScore 为 0 到目标分值的整数；percentScore 为 0 到 100 的整数；dimensions 是数组，每项包含 label, score, comment；strengths/weaknesses/missing 是字符串数组；rewrite 是参考优化建议。",
      "必须先指出最主要扣分原因，再给优点；评分要有区分度，不要所有维度都给相同或相近分。",
      "如果有历史训练档案，请把本次建议尽量和长期弱项衔接。",
      `rewrite 必须写成一个完整段落，但要包含三层意思：本次最该先改的问题、具体改法、下一稿自查点。优先使用这组自查问题：${playbook.selfCheck.join("；") || "我最主要的问题是什么？下一稿先改哪里？"}`
    ].join("\n"),
    userPrompt: [
      `题目要求：${prompt}`,
      `给定资料：${material}`,
      referenceOutline ? `参考分论点：${referenceOutline}` : "",
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

async function extractGaokaoImage({ imageDataUrl, subject }) {
  const provider = imageOcrProvider();
  if (provider === "baidu") {
    return baiduOcrGaokaoImage({ imageDataUrl, subject });
  }
  if (!OPENAI_API_KEY) {
    return {
      prompt: "",
      requirements: "",
      essay: "",
      notes: "当前环境还没有配置 OCR 服务密钥。页面流程已经接好，补上 OpenAI 或百度 OCR 配置后，就能直接把答题卡图片转成文字。"
    };
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["prompt", "requirements", "essay", "notes"],
    properties: {
      prompt: { type: "string" },
      requirements: { type: "string" },
      essay: { type: "string" },
      notes: { type: "string" }
    }
  };

  const subjectLabel = subject === "english" ? "高考英语作文" : "高考语文作文";
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
                `你是一个${subjectLabel}答题卡 OCR 整理助手。`,
                "请识别图片文字，并尽量拆分成：作文题目、写作要求、学生正文。",
                "如果图片里只有作文正文，就把 essay 填满，其余字段可留空。",
                "不要编造图片里没有的内容，只输出简体中文 JSON。"
              ].join("\n")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "请把这张答题卡/作文图片中的内容整理成 prompt、requirements、essay。"
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
          name: "gaokao_ocr",
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
  const parsed = JSON.parse(payload.output_text);
  const fallback = splitGaokaoOcrText(
    [parsed.prompt || "", parsed.requirements || "", parsed.essay || ""].filter(Boolean).join("\n"),
    subject
  );
  return {
    prompt: parsed.prompt || fallback.prompt,
    requirements: parsed.requirements || fallback.requirements,
    essay: parsed.essay || fallback.essay,
    notes: parsed.notes || fallback.notes
  };
}

async function extractGenericOcr({ images, mode, hint }) {
  const normalizedImages = Array.isArray(images)
    ? images
      .map((item) => String(item || "").trim())
      .filter((item) => /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(item))
      .slice(0, 4)
    : [];

  if (!normalizedImages.length) {
    throw new Error("OCR_IMAGE_REQUIRED");
  }

  const provider = imageOcrProvider();
  if (provider === "baidu") {
    const parsed = await baiduOcrGenericImage({ imageDataUrl: normalizedImages[0], mode });
    return {
      ...parsed,
      provider: "baidu"
    };
  }

  if (!OPENAI_API_KEY) {
    return {
      title: "",
      text: "",
      lines: [],
      confidence: "low",
      provider: "none",
      notes: "当前环境还没有配置 OCR 服务密钥。补上 OpenAI 或百度 OCR 配置后，这个通用 OCR 页面就能直接使用。"
    };
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["title", "text", "lines", "confidence", "notes"],
    properties: {
      title: { type: "string" },
      text: { type: "string" },
      lines: {
        type: "array",
        items: { type: "string" }
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"]
      },
      notes: { type: "string" }
    }
  };

  const modeLabel = mode === "handwriting"
    ? "手写稿"
    : mode === "mixed"
      ? "图文混排"
      : mode === "table"
        ? "表格/清单"
        : "文档/截图";

  const content = [
    {
      type: "input_text",
      text: [
        `识别模式：${modeLabel}`,
        hint ? `补充提示：${String(hint).trim().slice(0, 200)}` : "",
        "请综合多张同源图片版本进行 OCR，这些图片可能分别是原图、灰度增强图、高对比图。",
        "任务目标：尽可能准确识别中文为主的图片文字，同时保留合理换行。",
        "如果不同版本冲突，优先采用最清晰、最连贯、最符合上下文的字符。",
        "不要编造缺失内容；不确定时宁可保守。",
        "若是表格或清单，也请按自上而下顺序转成可读文本。",
        "输出 JSON 字段：",
        "title：如果能判断标题就填写，否则留空。",
        "text：完整正文，尽量保留段落和换行。",
        "lines：按行拆分的重要文本数组。",
        "confidence：high/medium/low。",
        "notes：简短说明识别难点，例如模糊、倾斜、遮挡、手写潦草。"
      ].filter(Boolean).join("\n")
    }
  ];

  normalizedImages.forEach((imageUrl, index) => {
    content.push({
      type: "input_text",
      text: index === 0
        ? "第 1 张是原图或主图，请以它为主。"
        : `第 ${index + 1} 张是增强版本，请用于校对字形和断行。`
    });
    content.push({
      type: "input_image",
      image_url: imageUrl
    });
  });

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
                "你是一个高精度中文 OCR 校对助手。",
                "你不是普通转写器，而是要比较多张同源图像，做交叉纠错。",
                "重点处理：中文印刷体、手机截图、作业/试卷、轻度手写、对比度不均、阴影、倾斜。",
                "遇到明显错误字符时，请结合上下文纠正；遇到完全看不清的内容，不要猜测太多。",
                "只输出符合 schema 的 JSON。"
              ].join("\n")
            }
          ]
        },
        {
          role: "user",
          content
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "generic_ocr",
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
  return {
    ...JSON.parse(payload.output_text),
    provider: "openai"
  };
}

function stripDataUrlPrefix(imageDataUrl) {
  return String(imageDataUrl || "").replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

let baiduAccessTokenCache = { token: "", expiresAt: 0 };

function normalizeOcrLines(text) {
  return String(text || "")
    .split(/\r?\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function splitGaokaoChineseOcrText(rawText) {
  const lines = normalizeOcrLines(rawText);
  if (!lines.length) {
    return {
      prompt: "",
      requirements: "",
      essay: "",
      notes: "没有识别到可用文字，请换一张更清晰、角度更正的答题卡图片。"
    };
  }

  const essayStartPatterns = [
    /^题目[:：]?\s*/,
    /^标题[:：]?\s*/,
    /^作文[:：]?\s*/,
    /^[《].+[》]$/,
    /^[_\-—]{2,}/
  ];
  const promptPatterns = [
    /阅读下面的材料/,
    /根据要求写作/,
    /请以.+为题/,
    /请结合.+写/,
    /请写一篇/,
    /材料作文/,
    /命题作文/,
    /话题作文/
  ];
  const requirementPatterns = [
    /^要求[:：]/,
    /不少于\d+字/,
    /文体不限|文体自选/,
    /不得套作|不得抄袭/,
    /选准角度|确定立意|自拟标题/
  ];

  let essayStartIndex = -1;
  let promptEndIndex = -1;
  let requirementStartIndex = -1;

  lines.forEach((line, index) => {
    if (promptEndIndex === -1 && promptPatterns.some((pattern) => pattern.test(line))) {
      promptEndIndex = index;
    }
    if (requirementStartIndex === -1 && requirementPatterns.some((pattern) => pattern.test(line))) {
      requirementStartIndex = index;
    }
    if (essayStartIndex === -1 && essayStartPatterns.some((pattern) => pattern.test(line))) {
      essayStartIndex = index;
    }
  });

  if (essayStartIndex === -1) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const maybeEssayTitle = line.length >= 4 && line.length <= 18 && !promptPatterns.some((pattern) => pattern.test(line)) && !requirementPatterns.some((pattern) => pattern.test(line));
      const next = lines[index + 1] || "";
      const nextLooksLikeBody = next.length >= 18;
      if (maybeEssayTitle && nextLooksLikeBody) {
        essayStartIndex = index;
        break;
      }
    }
  }

  if (essayStartIndex === -1) {
    if (requirementStartIndex !== -1) {
      essayStartIndex = Math.min(requirementStartIndex + 1, lines.length - 1);
    } else if (promptEndIndex !== -1) {
      essayStartIndex = Math.min(promptEndIndex + 2, lines.length - 1);
    } else {
      essayStartIndex = 0;
    }
  }

  const promptLines = lines.slice(0, essayStartIndex).filter((line) => !requirementPatterns.some((pattern) => pattern.test(line)));
  const requirementLines = lines.slice(0, essayStartIndex).filter((line) => requirementPatterns.some((pattern) => pattern.test(line)));
  const essayLines = lines.slice(essayStartIndex);

  let notes = "已按语文答题卡场景尝试识别作文起始位置，请重点校对标题行和正文第一段。";
  if (!essayLines.length || essayLines.join("").length < 80) {
    notes = "已尝试识别作文起始位置，但正文长度偏短，请人工确认是否从正确位置开始截取。";
  }

  return {
    prompt: promptLines.join("\n"),
    requirements: requirementLines.join("\n"),
    essay: essayLines.join("\n"),
    notes
  };
}

function splitGaokaoEnglishOcrText(rawText) {
  const lines = normalizeOcrLines(rawText);
  if (!lines.length) {
    return {
      prompt: "",
      requirements: "",
      essay: "",
      notes: "没有识别到可用文字，请换一张更清晰的答题卡图片。"
    };
  }

  const requirementPatterns = [/词数/, /不少于/, /写作内容/, /注意[:：]?/, /100 words/i];
  let essayStartIndex = lines.findIndex((line, index) => {
    const next = lines[index + 1] || "";
    return line.length >= 4 && line.length <= 80 && /[A-Za-z]/.test(line) && next.length >= 20;
  });
  if (essayStartIndex === -1) {
    essayStartIndex = Math.max(lines.findIndex((line) => requirementPatterns.some((pattern) => pattern.test(line))) + 1, 0);
  }

  return {
    prompt: lines.slice(0, essayStartIndex).filter((line) => !requirementPatterns.some((pattern) => pattern.test(line))).join("\n"),
    requirements: lines.slice(0, essayStartIndex).filter((line) => requirementPatterns.some((pattern) => pattern.test(line))).join("\n"),
    essay: lines.slice(essayStartIndex).join("\n"),
    notes: "已按英语答题卡场景尝试识别正文起始位置，请人工校对首段是否完整。"
  };
}

function splitGaokaoOcrText(rawText, subject) {
  return subject === "english" ? splitGaokaoEnglishOcrText(rawText) : splitGaokaoChineseOcrText(rawText);
}

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

async function baiduOcrGaokaoImage({ imageDataUrl, subject }) {
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
  if (!text) {
    return {
      prompt: "",
      requirements: "",
      essay: "",
      notes: "百度 OCR 没有识别到明显文字，请换一张更清晰的答题卡图片。"
    };
  }
  const parsed = splitGaokaoOcrText(text, subject);
  return {
    ...parsed,
    notes: `${parsed.notes} 百度 OCR 已完成底层识别，请重点检查作文起始位置是否准确。`
  };
}

async function baiduOcrGenericImage({ imageDataUrl, mode }) {
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

  const lines = (payload.words_result || []).map((item) => String(item.words || "").trim()).filter(Boolean);
  const text = lines.join("\n");
  return {
    title: lines[0] && lines[0].length <= 30 ? lines[0] : "",
    text,
    lines,
    confidence: lines.length >= 12 ? "medium" : "low",
    notes: text
      ? `已使用百度 OCR 完成${mode === "handwriting" ? "手写" : "基础"}识别，建议人工校对易混字和段落断行。`
      : "百度 OCR 没有识别到明显文字，请换一张更清晰的图片。"
  };
}

function serveStatic(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  let filePath = pathname === "/" ? defaultHomePath() : path.join(ROOT, pathname);

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
        gaokaoProfile: getLearningProfile(user.id, "gaokao") || buildGaokaoLearningProfile(user.id),
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

    if (req.method === "GET" && url.pathname === "/api/gaokao/bootstrap") {
      const user = getOrCreateUser(url.searchParams.get("userId"));
      json(res, 200, {
        user,
        plans,
        provider: textProvider(),
        history: getGaokaoHistory(user.id),
        profile: getLearningProfile(user.id, "gaokao") || buildGaokaoLearningProfile(user.id),
        principalSummary: buildPrincipalSummary()
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/exams/list") {
      json(res, 200, { exams: listExamsWithSummary() });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ai-status") {
      const visionReady = !!(QWEN_API_KEY || OPENAI_API_KEY);
      let provider = "未配置";
      if (QWEN_API_KEY) provider = `Qwen-VL（${QWEN_MODEL}）`;
      else if (OPENAI_API_KEY) provider = "OpenAI gpt-4o-mini";
      else if (DEEPSEEK_API_KEY) provider = "DeepSeek（仅文字，无视觉）";
      json(res, 200, { visionReady, provider });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/exams/create") {
      const body = await parseBody(req);
      const exam = {
        id: randomUUID(),
        name: String(body.name || "").trim() || "未命名考试",
        date: String(body.date || "").trim() || new Date().toISOString().slice(0, 10),
        subject: String(body.subject || "").trim() || "高二数学",
        className: String(body.className || "").trim() || "高二 1 班",
        createdAt: new Date().toISOString()
      };
      db.prepare(`
        INSERT INTO exams (id, name, date, subject, class_name, created_at, answer_assets_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(exam.id, exam.name, exam.date, exam.subject, exam.className, exam.createdAt, "[]");
      buildDefaultQuestions(exam.id, Number(body.questionCount || 8));
      json(res, 200, { exam });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/exams/upload-answer") {
      const body = await parseBody(req);
      const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(body.examId);
      if (!exam) {
        json(res, 404, { error: "考试不存在" });
        return;
      }
      const assets = (body.images || [])
        .filter((item) => item?.dataUrl)
        .map((item, index) => ({
          name: item.name || `参考答案 ${index + 1}`,
          path: saveDataUrlAsset(item.dataUrl, `exam-${exam.id}-answer-${index + 1}`)
        }));
      db.prepare("UPDATE exams SET answer_assets_json = ? WHERE id = ?").run(JSON.stringify(assets), exam.id);
      json(res, 200, { uploaded: assets.length, assets });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/exams/upload-cards") {
      const body = await parseBody(req);
      const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(body.examId);
      if (!exam) {
        json(res, 404, { error: "考试不存在" });
        return;
      }
      const questions = db.prepare("SELECT * FROM questions WHERE exam_id = ? ORDER BY CAST(question_no AS INTEGER), question_no").all(exam.id);
      const cards = Array.isArray(body.cards) ? body.cards : [];
      // 老师手动填写的题目信息（覆盖默认模板）
      const questionOverride = body.questionOverride || null;
      const processed = [];
      for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
        const card = cards[cardIndex];
        const student = ensureStudentRecord(card.studentName, exam.class_name, card.studentNo);
        if (card.imageDataUrl) {
          saveDataUrlAsset(card.imageDataUrl, `exam-${exam.id}-student-${student.id}`);
        }
        db.prepare("DELETE FROM question_scores WHERE exam_id = ? AND student_id = ?").run(exam.id, student.id);
        db.prepare("DELETE FROM ai_reports WHERE exam_id = ? AND student_id = ?").run(exam.id, student.id);
        db.prepare("DELETE FROM student_scores WHERE exam_id = ? AND student_id = ?").run(exam.id, student.id);

        let totalScore = 0;
        const insertQuestionScore = db.prepare(`
          INSERT INTO question_scores (id, exam_id, student_id, question_id, score_got, ai_analysis)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const aiTargetQuestion = questions.reduce((best, q) =>
          Number(q.score) > Number(best.score) ? q : best, questions[0]
        );
        const scoredRows = [];
        for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
          const question = questions[questionIndex];
          const maxScore = Number(question.score);
          let analysis = null;
          let scoreGot = 0;

          if (card.imageDataUrl && question.id === aiTargetQuestion.id && (OPENAI_API_KEY || DEEPSEEK_API_KEY)) {
            // 如果老师填写了题目信息，用真实题目覆盖默认模板
            const questionForAnalysis = questionOverride ? {
              ...question,
              knowledge_point: questionOverride.knowledge_point || question.knowledge_point,
              standard_steps: questionOverride.standard_steps || question.standard_steps,
              standard_answer: questionOverride.question_text || question.standard_answer,
              score: questionOverride.score || question.score,
              question_no: question.question_no
            } : question;
            analysis = await analyzeStudentAnswer(card.imageDataUrl, questionForAnalysis);
          }

          if (analysis && typeof analysis.step_reached === "number") {
            const totalSteps = (question.standard_steps || "").split("->").length || 4;
            const ratio = analysis.step_reached / totalSteps;
            scoreGot = Number(Math.max(0, Math.min(maxScore, Math.round(maxScore * ratio * 10) / 10)));
          } else {
            const fallbackLevel = (cardIndex + questionIndex) % 3;
            analysis = createMockAiAnalysis({ knowledgePoint: question.knowledge_point }, fallbackLevel);
            const ratio = [0.6, 0.3, 1.0][fallbackLevel];
            scoreGot = Number(Math.max(0, Math.min(maxScore, Math.round(maxScore * ratio * 10) / 10)));
          }

          if (card.scoreOverrides && card.scoreOverrides[question.question_no] !== undefined) {
            scoreGot = Number(card.scoreOverrides[question.question_no]);
          }

          totalScore += scoreGot;
          insertQuestionScore.run(
            randomUUID(),
            exam.id,
            student.id,
            question.id,
            scoreGot,
            JSON.stringify(analysis)
          );
          scoredRows.push({ ...question, scoreGot, ai_analysis: JSON.stringify(analysis) });
        }

        db.prepare(`
          INSERT INTO student_scores (id, exam_id, student_id, total_score, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(randomUUID(), exam.id, student.id, Number(totalScore.toFixed(1)), new Date().toISOString());

        const report = createStudentMockReport(student, exam, totalScore, scoredRows);
        db.prepare(`
          INSERT INTO ai_reports (id, exam_id, student_id, report_json, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(randomUUID(), exam.id, student.id, JSON.stringify(report), new Date().toISOString());

        processed.push({
          studentId: student.id,
          studentName: student.name,
          totalScore: Number(totalScore.toFixed(1))
        });
      }
      json(res, 200, { uploaded: processed.length, students: processed });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/exams/import-scores") {
      const body = await parseBody(req);
      const examId = String(body.examId || "").trim();
      const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId);
      if (!exam) { json(res, 404, { error: "考试不存在" }); return; }
      const questions = db.prepare(
        "SELECT * FROM questions WHERE exam_id = ? ORDER BY CAST(question_no AS INTEGER), question_no"
      ).all(examId);
      if (!questions.length) { json(res, 400, { error: "该考试尚未建题" }); return; }

      const rows = Array.isArray(body.rows) ? body.rows : [];
      const processed = [];

      rows.forEach((row) => {
        const name = String(row.name || "").trim();
        const studentNo = String(row.studentNo || "").trim();
        if (!name) return;

        const student = ensureStudentRecord(name, exam.class_name, studentNo || name);

        db.prepare("DELETE FROM question_scores WHERE exam_id = ? AND student_id = ?").run(examId, student.id);
        db.prepare("DELETE FROM student_scores WHERE exam_id = ? AND student_id = ?").run(examId, student.id);
        db.prepare("DELETE FROM ai_reports WHERE exam_id = ? AND student_id = ?").run(examId, student.id);

        const insertQS = db.prepare(
          "INSERT INTO question_scores (id, exam_id, student_id, question_id, score_got, ai_analysis) VALUES (?, ?, ?, ?, ?, ?)"
        );

        let totalScore = 0;
        const scoredRows = questions.map((q) => {
          const scoreGot = Math.max(0, Math.min(
            Number(q.score),
            Number((row.scores || {})[q.question_no] ?? 0)
          ));
          totalScore += scoreGot;
          const variantIndex = scoreGot < Number(q.score) * 0.5 ? 1 : scoreGot < Number(q.score) ? 0 : 2;
          const analysis = createMockAiAnalysis({ knowledgePoint: q.knowledge_point }, variantIndex);
          insertQS.run(randomUUID(), examId, student.id, q.id, scoreGot, JSON.stringify(analysis));
          return { ...q, scoreGot, ai_analysis: JSON.stringify(analysis) };
        });

        db.prepare(
          "INSERT INTO student_scores (id, exam_id, student_id, total_score, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(randomUUID(), examId, student.id, Number(totalScore.toFixed(1)), new Date().toISOString());

        const report = createStudentMockReport(student, exam, totalScore, scoredRows);
        db.prepare(
          "INSERT INTO ai_reports (id, exam_id, student_id, report_json, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(randomUUID(), examId, student.id, JSON.stringify(report), new Date().toISOString());

        processed.push({ studentId: student.id, name: student.name, totalScore: Number(totalScore.toFixed(1)) });
      });

      json(res, 200, { imported: processed.length, students: processed });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/demo/seed") {
      db.prepare("DELETE FROM question_scores WHERE exam_id IN (SELECT id FROM exams WHERE name LIKE '%演示%' OR name LIKE '%月考%' OR name LIKE '%联考%')").run();
      db.prepare("DELETE FROM student_scores WHERE exam_id IN (SELECT id FROM exams WHERE name LIKE '%演示%' OR name LIKE '%月考%' OR name LIKE '%联考%')").run();
      db.prepare("DELETE FROM ai_reports WHERE exam_id IN (SELECT id FROM exams WHERE name LIKE '%演示%' OR name LIKE '%月考%' OR name LIKE '%联考%')").run();
      db.prepare("DELETE FROM questions WHERE exam_id IN (SELECT id FROM exams WHERE name LIKE '%演示%' OR name LIKE '%月考%' OR name LIKE '%联考%')").run();
      db.prepare("DELETE FROM exams WHERE name LIKE '%演示%' OR name LIKE '%月考%' OR name LIKE '%联考%'").run();

      const examDates = [
        ["2026年2月联考", "2026-02-20"],
        ["2026年3月月考", "2026-03-21"],
        ["2026年4月月考", "2026-04-18"]
      ];

      const studentData = [
        { name: "李明轩", scores: [[10, 10, 8, 10, 14, 12, 8, 10], [10, 8, 8, 10, 12, 10, 6, 10], [10, 8, 6, 10, 12, 10, 4, 10]] },
        { name: "张晓燕", scores: [[12, 12, 10, 12, 16, 14, 12, 12], [12, 12, 10, 12, 16, 14, 12, 12], [12, 12, 10, 12, 16, 16, 14, 14]] },
        { name: "王浩然", scores: [[8, 10, 6, 8, 10, 10, 6, 8], [8, 8, 6, 8, 10, 8, 4, 8], [8, 8, 4, 8, 10, 8, 4, 6]] },
        { name: "陈雨欣", scores: [[12, 10, 10, 10, 16, 14, 14, 12], [12, 10, 10, 12, 16, 14, 14, 12], [12, 12, 10, 12, 18, 16, 14, 14]] },
        { name: "刘子轩", scores: [[6, 8, 4, 6, 8, 8, 4, 6], [6, 6, 4, 6, 8, 6, 4, 6], [8, 8, 6, 8, 10, 8, 6, 8]] },
        { name: "赵佳慧", scores: [[10, 10, 8, 10, 14, 12, 10, 10], [10, 10, 8, 10, 12, 12, 8, 10], [10, 10, 8, 10, 14, 12, 8, 10]] },
        { name: "孙志强", scores: [[12, 10, 8, 10, 14, 12, 10, 10], [10, 10, 8, 10, 12, 10, 8, 8], [10, 8, 6, 8, 12, 10, 6, 8]] },
        { name: "周梦琪", scores: [[10, 12, 10, 12, 16, 14, 12, 12], [10, 12, 10, 12, 16, 14, 12, 12], [12, 12, 10, 12, 18, 14, 14, 12]] }
      ];

      const createdExamIds = [];
      examDates.forEach(([name, date]) => {
        const examId = randomUUID();
        createdExamIds.push(examId);
        db.prepare("INSERT INTO exams (id, name, date, subject, class_name, created_at, answer_assets_json) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(examId, name, date, "高二数学", "高二(3)班", new Date().toISOString(), "[]");
        buildDefaultQuestions(examId, 8);
      });

      createdExamIds.forEach((examId, examIndex) => {
        const questions = db.prepare("SELECT * FROM questions WHERE exam_id = ? ORDER BY CAST(question_no AS INTEGER)").all(examId);
        const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId);
        studentData.forEach((s, studentIndex) => {
          const student = ensureStudentRecord(s.name, "高二(3)班", `23${String(studentIndex + 1).padStart(3, "0")}`);
          const examScores = s.scores[examIndex];
          let total = 0;
          const insertQS = db.prepare("INSERT INTO question_scores (id, exam_id, student_id, question_id, score_got, ai_analysis) VALUES (?, ?, ?, ?, ?, ?)");
          db.prepare("DELETE FROM question_scores WHERE exam_id = ? AND student_id = ?").run(examId, student.id);
          db.prepare("DELETE FROM student_scores WHERE exam_id = ? AND student_id = ?").run(examId, student.id);
          db.prepare("DELETE FROM ai_reports WHERE exam_id = ? AND student_id = ?").run(examId, student.id);
          const scoredRows = questions.map((q, qi) => {
            const got = examScores[qi] !== undefined ? examScores[qi] : 0;
            total += got;
            const variantIndex = got < Number(q.score) * 0.5 ? 1 : got < Number(q.score) ? 0 : 2;
            const analysis = createMockAiAnalysis({ knowledgePoint: q.knowledge_point }, variantIndex);
            insertQS.run(randomUUID(), examId, student.id, q.id, got, JSON.stringify(analysis));
            return { ...q, scoreGot: got, ai_analysis: JSON.stringify(analysis) };
          });
          db.prepare("INSERT INTO student_scores (id, exam_id, student_id, total_score, created_at) VALUES (?, ?, ?, ?, ?)")
            .run(randomUUID(), examId, student.id, Number(total.toFixed(1)), new Date().toISOString());
          const report = createStudentMockReport(student, exam, total, scoredRows);
          db.prepare("INSERT INTO ai_reports (id, exam_id, student_id, report_json, created_at) VALUES (?, ?, ?, ?, ?)")
            .run(randomUUID(), examId, student.id, JSON.stringify(report), new Date().toISOString());
        });
      });

      json(res, 200, { seeded: true, exams: examDates.map((e) => e[0]), students: studentData.map((s) => s.name) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/ai/analyze") {
      const body = await parseBody(req);
      json(res, 200, mockAnalyzeAnswer(body));
      return;
    }

    if (req.method === "GET" && /^\/api\/exams\/[^/]+\/analysis$/.test(url.pathname)) {
      const examId = url.pathname.split("/")[3];
      json(res, 200, buildExamAnalysis(examId));
      return;
    }

    if (req.method === "GET" && /^\/api\/students\/[^/]+\/report$/.test(url.pathname)) {
      const studentId = url.pathname.split("/")[3];
      json(res, 200, buildStudentReport(studentId, url.searchParams.get("examId")));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/shenlun/bootstrap") {
      const user = getOrCreateUser(url.searchParams.get("userId"));
      json(res, 200, {
        user,
        plans,
        provider: textProvider(),
        history: getShenlunHistory(user.id),
        profile: getLearningProfile(user.id, "shenlun") || buildShenlunLearningProfile(user.id)
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/trade/bootstrap") {
      const user = getOrCreateUser(url.searchParams.get("userId"));
      json(res, 200, {
        user,
        ...getTradeBootstrap(user.id, url.searchParams.get("symbol"))
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/trade/order") {
      const body = await parseBody(req);
      const user = getOrCreateUser(body.userId);
      const result = placeTradeOrder(body, user);
      json(res, 200, result);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/power/bootstrap") {
      const user = getOrCreateUser(url.searchParams.get("userId"));
      json(res, 200, {
        user,
        ...await getPowerSnapshot(user.id)
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/power/action") {
      const body = await parseBody(req);
      const user = getOrCreateUser(body.userId);
      json(res, 200, await submitPowerAction(body, user));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/exchange/bootstrap") {
      const user = getOrCreateUser(url.searchParams.get("userId"));
      json(res, 200, {
        user,
        ...await getExchangeBootstrap(user.id, url.searchParams.get("symbol"))
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/exchange/register-demo") {
      const body = await parseBody(req);
      const user = getOrCreateUser(body.userId);
      if (String(body.username || "").trim()) {
        user.name = String(body.username).trim();
        saveUser(user);
      }
      const profile = saveExchangeProfile(user.id, {
        username: String(body.username || "").trim(),
        telegramHandle: String(body.telegramHandle || "").trim(),
        inviterCode: String(body.inviterCode || "").trim().toUpperCase()
      });
      json(res, 200, {
        user,
        profile,
        promo: estimateTodayRebate(user.id)
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/exchange/deposit-demo") {
      const body = await parseBody(req);
      const user = getOrCreateUser(body.userId);
      json(res, 200, submitDemoDeposit(body, user));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/exchange/review-deposit-demo") {
      const body = await parseBody(req);
      json(res, 200, reviewDemoDeposit(body));
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

    if (req.method === "GET" && url.pathname === "/api/gaokao/history") {
      const user = getOrCreateUser(url.searchParams.get("userId"));
      json(res, 200, { history: getGaokaoHistory(user.id) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/gaokao/profile") {
      const user = getOrCreateUser(url.searchParams.get("userId"));
      json(res, 200, { profile: getLearningProfile(user.id, "gaokao") || buildGaokaoLearningProfile(user.id) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/gaokao/class-summary") {
      const className = url.searchParams.get("className") || "";
      const subject = url.searchParams.get("subject") || "";
      json(res, 200, { summary: buildGaokaoClassDigest(className, subject) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/gaokao/principal-summary") {
      const subject = url.searchParams.get("subject") || "";
      json(res, 200, { summary: buildPrincipalSummary(subject) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/gaokao/grade") {
      const body = await parseBody(req);
      const user = getOrCreateUser(body.userId);
      const result = await gradeGaokao({
        subject: body.subject || "chinese",
        examType: body.examType || "",
        gradeLevel: body.gradeLevel || "高三",
        studentName: body.studentName || "",
        schoolName: body.schoolName || "",
        className: body.className || "",
        prompt: body.prompt || "",
        requirements: body.requirements || "",
        essay: body.essay || "",
        studentProfile: body.studentProfile || {}
      }, user);
      json(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/gaokao/ocr") {
      const body = await parseBody(req);
      const result = await extractGaokaoImage({
        imageDataUrl: body.imageDataUrl || "",
        subject: body.subject || "chinese"
      });
      json(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/ocr/extract") {
      const body = await parseBody(req);
      const result = await extractGenericOcr({
        images: body.images || [],
        mode: body.mode || "document",
        hint: body.hint || ""
      });
      json(res, 200, result);
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
        referenceOutline: body.referenceOutline || "",
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

if (process.env.NO_LISTEN !== "1") {
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
}
