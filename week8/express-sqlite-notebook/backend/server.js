import cors from "cors";
import express from "express";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
const dbPath = join(dataDir, "notebook.sqlite");
const port = Number(process.env.PORT || 3001);

mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    tag_id TEXT,
    due_date TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS note_tags (
    note_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar_color TEXT NOT NULL,
    password_hash TEXT,
    password_salt TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
}

[
  ["username", "TEXT"],
  ["password_hash", "TEXT"],
  ["password_salt", "TEXT"],
].forEach(([column, definition]) => {
  if (!columnExists("users", column)) {
    db.exec(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
  }
});

db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username)");

const tagCount = db.prepare("SELECT COUNT(*) AS count FROM tags").get().count;
if (tagCount === 0) {
  const seedTag = db.prepare("INSERT INTO tags (id, name, color) VALUES (?, ?, ?)");
  [
    ["work", "工作", "#dbeafe"],
    ["study", "学习", "#dcfce7"],
    ["life", "生活", "#f3e8ff"],
    ["idea", "想法", "#fef3c7"],
  ].forEach((tag) => seedTag.run(...tag));
}

const todoCount = db.prepare("SELECT COUNT(*) AS count FROM todos").get().count;
if (todoCount === 0) {
  const seedTodo = db.prepare(
    "INSERT INTO todos (id, title, tag_id, due_date, completed) VALUES (?, ?, ?, ?, ?)"
  );
  [
    [crypto.randomUUID(), "完成产品需求文档", "work", "2026-06-05", 0],
    [crypto.randomUUID(), "阅读设计模式书籍", "study", "2026-06-03", 0],
    [crypto.randomUUID(), "健身打卡", "life", "2026-06-03", 0],
    [crypto.randomUUID(), "整理本周会议记录", "work", "2026-06-04", 0],
  ].forEach((todo) => seedTodo.run(...todo));
}

const noteCount = db.prepare("SELECT COUNT(*) AS count FROM notes").get().count;
if (noteCount === 0) {
  const noteId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO notes (id, title, content, summary) VALUES (?, ?, ?, ?)"
  ).run(
    noteId,
    "React 学习笔记",
    "# React 是什么\n\nReact 是一个用于构建用户界面的 JavaScript 库。\n\n## 核心概念\n\n- 组件化\n- JSX\n- 状态管理\n- 生命周期与副作用",
    "本文记录 React 的核心概念，包括组件化、JSX、状态管理和副作用处理。"
  );
  db.prepare("INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)").run(noteId, "study");
}

const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
if (userCount === 0) {
  db.prepare("INSERT INTO users (id, username, name, role, avatar_color) VALUES (?, ?, ?, ?, ?)").run(
    "guest-demo",
    "guest",
    "访客演示用户",
    "Demo Guest",
    "#dbeafe"
  );
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    const error = new Error(`${name} is required`);
    error.status = 400;
    throw error;
  }
  return value.trim();
}

function optionalString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function authError(message, status) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function normalizeUsername(value) {
  const username = requiredString(value, "username").toLowerCase();
  if (!/^[a-z0-9]{3,8}$/.test(username)) {
    authError("用户名需唯一，且为 3-8 位数字或字母", 400);
  }
  return username;
}

function hashPassword(password) {
  const rawPassword = requiredString(password, "password");
  if (!/^[A-Za-z0-9@]{3,16}$/.test(rawPassword) || /^\d+$/.test(rawPassword)) {
    authError("密码需为 3-16 位数字、字母或 @，且不能纯数字", 400);
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(rawPassword, salt, 32).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  if (!salt || !hash || typeof password !== "string") return false;
  const incoming = scryptSync(password, salt, 32);
  const stored = Buffer.from(hash, "hex");
  return stored.length === incoming.length && timingSafeEqual(stored, incoming);
}

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    avatarColor: row.avatarColor || row.avatar_color,
  };
}

function colorForUsername(username) {
  const colors = ["#dbeafe", "#dcfce7", "#fef3c7", "#ffe4e6"];
  return colors[username.length % colors.length];
}

function getTags() {
  return db.prepare("SELECT id, name, color FROM tags ORDER BY created_at, name").all();
}

function todoRow(row) {
  return {
    id: row.id,
    title: row.title,
    tagId: row.tag_id,
    tagName: row.tag_name,
    tagColor: row.tag_color,
    dueDate: row.due_date,
    completed: Boolean(row.completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function noteRow(row) {
  const tags = row.tags
    ? row.tags.split("|").filter(Boolean).map((item) => {
        const [id, name, color] = item.split("~");
        return { id, name, color };
      })
    : [];

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    summary: row.summary,
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getNoteById(id) {
  const row = db
    .prepare(`
      SELECT notes.*,
        GROUP_CONCAT(tags.id || '~' || tags.name || '~' || tags.color, '|') AS tags
      FROM notes
      LEFT JOIN note_tags ON note_tags.note_id = notes.id
      LEFT JOIN tags ON tags.id = note_tags.tag_id
      WHERE notes.id = ?
      GROUP BY notes.id
    `)
    .get(id);
  return row ? noteRow(row) : null;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/guest", (_req, res) => {
  const user = db
    .prepare("SELECT id, name, role, avatar_color AS avatarColor FROM users WHERE id = ?")
    .get("guest-demo");
  res.json(publicUser(user));
});

app.post("/api/auth/register", (req, res) => {
  const username = normalizeUsername(req.body.username);
  const name = optionalString(req.body.name) || username;
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) authError("用户名已存在", 409);

  const { salt, hash } = hashPassword(req.body.password);
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, username, name, role, avatar_color, password_hash, password_salt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, username, name, "Member", colorForUsername(username), hash, salt);

  const user = db
    .prepare("SELECT id, username, name, role, avatar_color AS avatarColor FROM users WHERE id = ?")
    .get(id);
  res.status(201).json(publicUser(user));
});

app.post("/api/auth/login", (req, res) => {
  const username = normalizeUsername(req.body.username);
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !verifyPassword(req.body.password, user.password_salt, user.password_hash)) {
    authError("用户名或密码不正确", 401);
  }

  res.json(publicUser(user));
});

app.get("/api/tags", (_req, res) => {
  res.json(getTags());
});

app.post("/api/tags", (req, res) => {
  const name = requiredString(req.body.name, "name");
  const color = optionalString(req.body.color) || "#dbeafe";
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO tags (id, name, color) VALUES (?, ?, ?)").run(id, name, color);
  res.status(201).json({ id, name, color });
});

app.get("/api/todos", (req, res) => {
  const search = `%${String(req.query.search || "").trim()}%`;
  const tagId = String(req.query.tagId || "");
  const rows = db
    .prepare(`
      SELECT todos.*, tags.name AS tag_name, tags.color AS tag_color
      FROM todos
      LEFT JOIN tags ON tags.id = todos.tag_id
      WHERE todos.title LIKE ?
        AND (? = '' OR todos.tag_id = ?)
      ORDER BY todos.completed, COALESCE(todos.due_date, '9999-12-31'), todos.created_at DESC
    `)
    .all(search, tagId, tagId);
  res.json(rows.map(todoRow));
});

app.post("/api/todos", (req, res) => {
  const title = requiredString(req.body.title, "title");
  const tagId = optionalString(req.body.tagId);
  const dueDate = optionalString(req.body.dueDate);
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO todos (id, title, tag_id, due_date, completed) VALUES (?, ?, ?, ?, 0)"
  ).run(id, title, tagId, dueDate);
  const row = db
    .prepare(`
      SELECT todos.*, tags.name AS tag_name, tags.color AS tag_color
      FROM todos LEFT JOIN tags ON tags.id = todos.tag_id WHERE todos.id = ?
    `)
    .get(id);
  res.status(201).json(todoRow(row));
});

app.patch("/api/todos/:id", (req, res) => {
  const current = db.prepare("SELECT * FROM todos WHERE id = ?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Todo not found" });

  const title = req.body.title === undefined ? current.title : requiredString(req.body.title, "title");
  const tagId = req.body.tagId === undefined ? current.tag_id : optionalString(req.body.tagId);
  const dueDate = req.body.dueDate === undefined ? current.due_date : optionalString(req.body.dueDate);
  const completed =
    req.body.completed === undefined ? current.completed : req.body.completed ? 1 : 0;

  db.prepare(`
    UPDATE todos
    SET title = ?, tag_id = ?, due_date = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, tagId, dueDate, completed, req.params.id);

  const row = db
    .prepare(`
      SELECT todos.*, tags.name AS tag_name, tags.color AS tag_color
      FROM todos LEFT JOIN tags ON tags.id = todos.tag_id WHERE todos.id = ?
    `)
    .get(req.params.id);
  res.json(todoRow(row));
});

app.delete("/api/todos/:id", (req, res) => {
  db.prepare("DELETE FROM todos WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

app.get("/api/notes", (req, res) => {
  const search = `%${String(req.query.search || "").trim()}%`;
  const tagId = String(req.query.tagId || "");
  const rows = db
    .prepare(`
      SELECT notes.*,
        GROUP_CONCAT(tags.id || '~' || tags.name || '~' || tags.color, '|') AS tags
      FROM notes
      LEFT JOIN note_tags ON note_tags.note_id = notes.id
      LEFT JOIN tags ON tags.id = note_tags.tag_id
      WHERE (notes.title LIKE ? OR notes.content LIKE ?)
        AND (? = '' OR EXISTS (
          SELECT 1 FROM note_tags filter_tags
          WHERE filter_tags.note_id = notes.id AND filter_tags.tag_id = ?
        ))
      GROUP BY notes.id
      ORDER BY notes.updated_at DESC
    `)
    .all(search, search, tagId, tagId);
  res.json(rows.map(noteRow));
});

app.get("/api/notes/:id", (req, res) => {
  const note = getNoteById(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json(note);
});

app.post("/api/notes", (req, res) => {
  const title = requiredString(req.body.title, "title");
  const content = typeof req.body.content === "string" ? req.body.content : "";
  const tagIds = Array.isArray(req.body.tagIds) ? req.body.tagIds : [];
  const id = crypto.randomUUID();

  db.prepare("INSERT INTO notes (id, title, content) VALUES (?, ?, ?)").run(id, title, content);
  const linkTag = db.prepare("INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)");
  tagIds.forEach((tagId) => {
    if (typeof tagId === "string") linkTag.run(id, tagId);
  });

  res.status(201).json(getNoteById(id));
});

app.patch("/api/notes/:id", (req, res) => {
  const current = db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Note not found" });

  const title = req.body.title === undefined ? current.title : requiredString(req.body.title, "title");
  const content = req.body.content === undefined ? current.content : String(req.body.content);
  const summary = req.body.summary === undefined ? current.summary : String(req.body.summary);

  db.prepare(`
    UPDATE notes
    SET title = ?, content = ?, summary = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, content, summary, req.params.id);

  if (Array.isArray(req.body.tagIds)) {
    db.prepare("DELETE FROM note_tags WHERE note_id = ?").run(req.params.id);
    const linkTag = db.prepare("INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)");
    req.body.tagIds.forEach((tagId) => {
      if (typeof tagId === "string") linkTag.run(req.params.id, tagId);
    });
  }

  res.json(getNoteById(req.params.id));
});

app.delete("/api/notes/:id", (req, res) => {
  db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

app.post("/api/notes/:id/summarize", (req, res) => {
  const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });

  const plain = note.content
    .replace(/[#>*_`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const summary = plain
    ? `本文主要记录：${plain.slice(0, 120)}${plain.length > 120 ? "..." : ""}`
    : "这篇笔记还没有足够内容生成总结。";

  db.prepare("UPDATE notes SET summary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    summary,
    req.params.id
  );
  res.json({ summary });
});

app.use(express.static(join(__dirname, "..", "dist")));

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: error.message || "Internal server error" });
});

app.listen(port, () => {
  console.log(`Notebook API running on http://localhost:${port}`);
});
