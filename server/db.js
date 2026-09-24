const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function addColumnIfMissing(table, column, definition) {
  try {
    const cols = await all(`PRAGMA table_info(${table})`);
    if (!cols.some(c => c.name === column)) {
      await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  } catch (err) {
    console.warn(`Migration warning on ${table}.${column}:`, err.message);
  }
}

async function runMigrations() {
  // Users – avatar_color
  await addColumnIfMissing('users', 'avatar_color', "TEXT DEFAULT '#6366f1'");

  // Sprints table
  await run(`
    CREATE TABLE IF NOT EXISTS sprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      goal TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed')),
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tickets – new columns
  await addColumnIfMissing('tickets', 'type',            "TEXT NOT NULL DEFAULT 'Bug'");
  await addColumnIfMissing('tickets', 'priority',        "TEXT NOT NULL DEFAULT 'Medium'");
  await addColumnIfMissing('tickets', 'sprint_id',       'INTEGER');
  await addColumnIfMissing('tickets', 'board_position',  'REAL DEFAULT 0');
  await addColumnIfMissing('tickets', 'sprint_position', 'REAL DEFAULT 0');
  await addColumnIfMissing('tickets', 'created_at',      'TEXT');
  await addColumnIfMissing('tickets', 'updated_at',      'TEXT');

  // Backfill timestamps if null
  await run("UPDATE tickets SET created_at = datetime('now') WHERE created_at IS NULL");
  await run("UPDATE tickets SET updated_at = datetime('now') WHERE updated_at IS NULL");

  // Comments table
  await run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      is_edited INTEGER DEFAULT 0,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);
}

async function init() {
  await run('PRAGMA foreign_keys = ON');
  await run('PRAGMA journal_mode = WAL');

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('Admin', 'Developer', 'Tester')),
      avatar_color TEXT DEFAULT '#6366f1'
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      goal TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed')),
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Done')),
      type TEXT NOT NULL DEFAULT 'Bug' CHECK (type IN ('Bug', 'Task', 'Story', 'Epic')),
      priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
      creator_id INTEGER NOT NULL,
      assignee_id INTEGER,
      sprint_id INTEGER,
      board_position REAL DEFAULT 0,
      sprint_position REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (creator_id) REFERENCES users(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id),
      FOREIGN KEY (sprint_id) REFERENCES sprints(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      is_edited INTEGER DEFAULT 0,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // ── Run migrations to upgrade existing DBs ─────────────────────────────────
  await runMigrations();

  const userCount   = await get('SELECT COUNT(*) AS count FROM users');
  const sprintCount = await get('SELECT COUNT(*) AS count FROM sprints');

  // ── Seed users ─────────────────────────────────────────────────────────────
  if (userCount.count === 0) {

    const seedUsers = [
      ['Avery Cole',   'Admin',     '#f59e0b'],
      ['Jordan Hale',  'Developer', '#6366f1'],
      ['Riley Chen',   'Developer', '#06b6d4'],
      ['Sam Patel',    'Tester',    '#10b981'],
      ['Morgan Lee',   'Tester',    '#ec4899'],
    ];
    for (const [name, role, color] of seedUsers) {
      await run('INSERT INTO users (name, role, avatar_color) VALUES (?, ?, ?)', [name, role, color]);
    }
  }

  // ── Seed sprints + tickets + comments (run if sprints table is empty) ───────
  if (sprintCount.count === 0) {
    const sprintRows = [
      ['Sprint 1 – Foundation',    'Set up core auth and project scaffolding',            'closed', '2026-08-01', '2026-08-14'],
      ['Sprint 2 – Core Features', 'Ticket CRUD, kanban board, search & pagination',      'active', '2026-08-15', '2026-09-04'],
      ['Sprint 3 – Polish',        'Roadmap, comments, RBAC enforcement, filters',        'pending','2026-09-15', '2026-09-28'],
    ];
    for (const [name, goal, status, start, end] of sprintRows) {
      await run('INSERT INTO sprints (name, goal, status, start_date, end_date) VALUES (?, ?, ?, ?, ?)', [name, goal, status, start, end]);
    }

    const testers   = await all("SELECT id FROM users WHERE role = 'Tester'  ORDER BY id");
    const developers = await all("SELECT id FROM users WHERE role = 'Developer' ORDER BY id");
    const sprints    = await all('SELECT id FROM sprints ORDER BY id');

    const t0 = testers[0].id,   t1 = testers[1].id;
    const d0 = developers[0].id, d1 = developers[1].id;
    const s0 = sprints[0].id,   s1 = sprints[1].id, s2 = sprints[2].id;

    const seedTickets = [
      // ── Sprint 1 (closed) ──────────────────────────────────────────────────
      ['Login redirect loop',
       'Users bouncing between /login and /app after SSO.\n\n**Steps:**\n1. Login with SSO\n2. Observe redirect loop\n\n**Expected:** redirect to /dashboard\n**Actual:** infinite loop',
       'Done', 'Bug', 'High', t0, d0, s0, 1, 1],

      ['Setup CI/CD pipeline',
       'Configure GitHub Actions for lint, test, and build on push to main.',
       'Done', 'Task', 'Medium', t1, d1, s0, 2, 2],

      ['Design database schema',
       'Create the initial ERD with Users, Tickets, Sprints, Comments. Set up migration tooling.',
       'Done', 'Story', 'High', t0, d0, s0, 3, 3],

      ['RBAC epic – phase 1',
       'Overall epic covering role-based access control across the full application stack.',
       'Done', 'Epic', 'Critical', t1, d1, s0, 4, 4],

      // ── Sprint 2 (active) ──────────────────────────────────────────────────
      ['Kanban column overflow',
       'Long titles break card layout at 1280 px. Cards extend beyond column boundaries.',
       'In Progress', 'Bug', 'Medium', t1, d1, s1, 2, 1],

      ['CSV export encoding',
       'Non-ASCII names corrupt in exported reports. UTF-8 BOM is missing from the file header.',
       'Done', 'Bug', 'Critical', t0, d0, s1, 1, 2],

      ['Search misses numeric IDs',
       'Querying by ticket ID returns empty results. CAST issue – integer not being coerced to TEXT for LIKE.',
       'In Progress', 'Bug', 'High', t1, d0, s1, 3, 3],

      ['Paginate bug list',
       'Implement server-side pagination with limit/offset. Add Previous / Next controls to the UI.',
       'To Do', 'Task', 'Medium', t0, d1, s1, 4, 4],

      ['Implement RBAC middleware',
       'Admin → role changes. Tester → ticket creation. Developer → status updates. Reject all others with 403.',
       'Done', 'Story', 'Critical', t1, d0, s1, 5, 5],

      ['Board position tracking',
       'Persist and restore card order after drag-and-drop; use a floating-point position field.',
       'To Do', 'Task', 'Low', t0, d1, s1, 6, 6],

      // ── Sprint 3 (pending) ─────────────────────────────────────────────────
      ['Flaky PATCH /tickets/:id/status',
       'Occasional 500 when moving a ticket to Done. Race condition suspected in concurrent updates.',
       'To Do', 'Bug', 'High', t0, d1, s2, 1, 1],

      ['Roadmap timeline view',
       'Build a visual timeline showing sprint bars, epic groupings, and issue counts.',
       'To Do', 'Epic', 'Low', t1, d0, s2, 2, 2],

      ['Comments & activity feed',
       'Allow team members to leave threaded comments. Show an activity log for status changes.',
       'To Do', 'Story', 'Medium', t0, d1, s2, 3, 3],

      // ── Backlog (no sprint) ────────────────────────────────────────────────
      ['Empty description accepted',
       'POST /api/tickets accepts whitespace-only descriptions. Server-side trim validation is missing.',
       'To Do', 'Bug', 'Low', t1, null, null, 0, 0],

      ['Dark-mode toggle',
       'Add a theme switcher dropdown in the navbar settings.',
       'To Do', 'Task', 'Low', t0, null, null, 0, 0],

      ['Epic hierarchy support',
       'Allow issues to be linked to an Epic parent. Show epic badge on kanban cards and backlog rows.',
       'To Do', 'Story', 'Medium', t1, d0, null, 0, 0],
    ];

    let pos = 1;
    for (const [title, description, status, type, priority, creatorId, assigneeId, sprintId, boardPos, sprintPos] of seedTickets) {
      await run(
        `INSERT INTO tickets
           (title, description, status, type, priority, creator_id, assignee_id, sprint_id, board_position, sprint_position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, status, type, priority, creatorId, assigneeId, sprintId, boardPos * pos, sprintPos]
      );
      pos++;
    }

    // Seed comments
    const firstTickets = await all('SELECT id FROM tickets ORDER BY id LIMIT 5');
    const commentSeed = [
      [firstTickets[0].id, d0, 'Session cookie is being cleared too early. Tracking down the auth flow now.'],
      [firstTickets[0].id, t0, 'Can reproduce on Chrome & Firefox. Edge is fine – different cookie handling?'],
      [firstTickets[0].id, d0, 'Fixed! Missing `SameSite=Lax` attribute on the session cookie. PR #42 ready.'],
      [firstTickets[4].id, d1, 'CSS overflow issue. Adding `overflow-hidden` to the column container fixes it.'],
      [firstTickets[4].id, t1, 'Scrollbar appears/disappears and causes layout shift too – please fix both.'],
    ];
    for (const [ticketId, authorId, content] of commentSeed) {
      await run('INSERT INTO comments (ticket_id, author_id, content) VALUES (?, ?, ?)', [ticketId, authorId, content]);
    }
  }
}

module.exports = { db, run, get, all, init };
