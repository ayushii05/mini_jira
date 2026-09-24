const path = require('path');
const express = require('express');
const cors = require('cors');
const { init, get, all, run } = require('./db');
const { loadUser, requireRole, ROLES, STATUSES } = require('./middleware/auth');

const PORT = process.env.PORT || 3001;
const app = express();

const TYPES     = Object.freeze(['Bug', 'Task', 'Story', 'Epic']);
const PRIORITIES = Object.freeze(['Low', 'Medium', 'High', 'Critical']);
const SPRINT_STATUSES = Object.freeze(['pending', 'active', 'closed']);

app.use(cors());
app.use(express.json());

// ─── Health ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ─── Me ──────────────────────────────────────────────────────────────────────
app.get('/api/me', loadUser, (req, res) => res.json(req.user));

// ─── Users ───────────────────────────────────────────────────────────────────
app.get('/api/users', loadUser, async (_req, res, next) => {
  try {
    const users = await all('SELECT id, name, role, avatar_color FROM users ORDER BY id');
    res.json(users);
  } catch (err) { next(err); }
});

app.patch('/api/users/:id/role', loadUser, requireRole('Admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body || {};
    if (!Number.isInteger(id) || id <= 0)  return res.status(400).json({ error: 'Invalid user id' });
    if (!ROLES.includes(role))              return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
    const existing = await get('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing)                          return res.status(404).json({ error: 'User not found' });
    await run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    const updated = await get('SELECT id, name, role, avatar_color FROM users WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) { next(err); }
});

// ─── Sprints ─────────────────────────────────────────────────────────────────
app.get('/api/sprints', loadUser, async (_req, res, next) => {
  try {
    const sprints = await all(`
      SELECT s.*,
             COUNT(t.id)                                                      AS ticket_count,
             SUM(CASE WHEN t.status = 'Done'        THEN 1 ELSE 0 END)       AS done_count,
             SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END)       AS inprogress_count,
             SUM(CASE WHEN t.status = 'To Do'       THEN 1 ELSE 0 END)       AS todo_count
        FROM sprints s
        LEFT JOIN tickets t ON t.sprint_id = s.id
       GROUP BY s.id
       ORDER BY s.id
    `);
    res.json(sprints);
  } catch (err) { next(err); }
});

app.post('/api/sprints', loadUser, requireRole('Admin'), async (req, res, next) => {
  try {
    const { name, goal = '', start_date, end_date } = req.body || {};
    const trimName = typeof name === 'string' ? name.trim() : '';
    if (trimName.length < 3) return res.status(400).json({ error: 'Sprint name must be at least 3 chars' });
    const r = await run(
      'INSERT INTO sprints (name, goal, status, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [trimName, goal, 'pending', start_date || null, end_date || null]
    );
    const sprint = await get('SELECT * FROM sprints WHERE id = ?', [r.id]);
    res.status(201).json(sprint);
  } catch (err) { next(err); }
});

app.patch('/api/sprints/:id', loadUser, requireRole('Admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid sprint id' });
    const sprint = await get('SELECT id FROM sprints WHERE id = ?', [id]);
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    const { name, goal, status, start_date, end_date } = req.body || {};
    if (status && !SPRINT_STATUSES.includes(status))
      return res.status(400).json({ error: `status must be one of: ${SPRINT_STATUSES.join(', ')}` });
    await run(`
      UPDATE sprints
         SET name       = COALESCE(?, name),
             goal       = COALESCE(?, goal),
             status     = COALESCE(?, status),
             start_date = COALESCE(?, start_date),
             end_date   = COALESCE(?, end_date)
       WHERE id = ?`,
      [name || null, goal ?? null, status || null, start_date || null, end_date || null, id]
    );
    const updated = await get('SELECT * FROM sprints WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) { next(err); }
});

// ─── Ticket helpers ───────────────────────────────────────────────────────────
const TICKET_SELECT = `
  SELECT t.id, t.title, t.description, t.status, t.type, t.priority,
         t.creator_id, t.assignee_id, t.sprint_id,
         t.board_position, t.sprint_position,
         t.created_at, t.updated_at,
         c.name  AS creator_name,  c.role  AS creator_role,  c.avatar_color AS creator_color,
         a.name  AS assignee_name, a.role  AS assignee_role, a.avatar_color AS assignee_color,
         s.name  AS sprint_name,   s.status AS sprint_status
    FROM tickets t
    JOIN users c ON c.id = t.creator_id
    LEFT JOIN users a ON a.id = t.assignee_id
    LEFT JOIN sprints s ON s.id = t.sprint_id
`;

// ─── Ticket stats ─────────────────────────────────────────────────────────────
app.get('/api/tickets/stats', loadUser, async (_req, res, next) => {
  try {
    const row = await get(`
      SELECT SUM(CASE WHEN status != 'Done' THEN 1 ELSE 0 END) AS openCount,
             SUM(CASE WHEN status  = 'Done' THEN 1 ELSE 0 END) AS closedCount,
             SUM(CASE WHEN status  = 'To Do'       THEN 1 ELSE 0 END) AS todoCount,
             SUM(CASE WHEN status  = 'In Progress' THEN 1 ELSE 0 END) AS inprogressCount,
             SUM(CASE WHEN type = 'Bug' AND status != 'Done' THEN 1 ELSE 0 END) AS openBugs,
             SUM(CASE WHEN type = 'Bug' AND status  = 'Done' THEN 1 ELSE 0 END) AS closedBugs,
             SUM(CASE WHEN type = 'Bug'   THEN 1 ELSE 0 END) AS bugCount,
             SUM(CASE WHEN type = 'Task'  THEN 1 ELSE 0 END) AS taskCount,
             SUM(CASE WHEN type = 'Story' THEN 1 ELSE 0 END) AS storyCount,
             SUM(CASE WHEN type = 'Epic'  THEN 1 ELSE 0 END) AS epicCount,
             COUNT(*) AS total
        FROM tickets
    `);
    res.json({
      open:        row.openCount        || 0,
      closed:      row.closedCount      || 0,
      todo:        row.todoCount        || 0,
      inprogress:  row.inprogressCount  || 0,
      openBugs:    row.openBugs         || 0,
      closedBugs:  row.closedBugs       || 0,
      total:       row.total            || 0,
      byType: {
        Bug:   row.bugCount   || 0,
        Task:  row.taskCount  || 0,
        Story: row.storyCount || 0,
        Epic:  row.epicCount  || 0,
      },
    });
  } catch (err) { next(err); }
});

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
app.get('/api/tickets', loadUser, async (req, res, next) => {
  try {
    const limit  = Math.min(Math.max(parseInt(req.query.limit,  10) || 10, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const status   = req.query.status;
    const type     = req.query.type;
    const priority = req.query.priority;
    const sprintId = req.query.sprint_id;
    const q        = (req.query.q || req.query.search || '').trim();

    const where  = [];
    const params = [];

    if (status) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
      where.push('t.status = ?'); params.push(status);
    }
    if (type) {
      if (!TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${TYPES.join(', ')}` });
      where.push('t.type = ?'); params.push(type);
    }
    if (priority) {
      if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: `priority must be one of: ${PRIORITIES.join(', ')}` });
      where.push('t.priority = ?'); params.push(priority);
    }
    if (sprintId !== undefined) {
      if (sprintId === 'null') { where.push('t.sprint_id IS NULL'); }
      else { where.push('t.sprint_id = ?'); params.push(Number(sprintId)); }
    }
    if (q) {
      where.push('(t.title LIKE ? OR CAST(t.id AS TEXT) LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRow = await get(`SELECT COUNT(*) AS total FROM tickets t ${whereSql}`, params);
    const tickets  = await all(
      `${TICKET_SELECT} ${whereSql} ORDER BY t.board_position ASC, t.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ tickets, total: countRow.total, limit, offset });
  } catch (err) { next(err); }
});

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────
app.get('/api/tickets/:id', loadUser, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ticket id' });
    const ticket = await get(`${TICKET_SELECT} WHERE t.id = ?`, [id]);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const comments = await all(`
      SELECT cm.id, cm.content, cm.created_at, cm.is_edited,
             u.id AS author_id, u.name AS author_name, u.avatar_color AS author_color
        FROM comments cm
        JOIN users u ON u.id = cm.author_id
       WHERE cm.ticket_id = ?
       ORDER BY cm.created_at ASC
    `, [id]);
    res.json({ ...ticket, comments });
  } catch (err) { next(err); }
});

// ─── POST /api/tickets ── Tester only ─────────────────────────────────────────
app.post('/api/tickets', loadUser, requireRole('Tester'), async (req, res, next) => {
  try {
    const { title, description, assignee_id, type = 'Bug', priority = 'Medium', sprint_id } = req.body || {};
    const trimTitle = typeof title === 'string' ? title.trim() : '';
    const trimDesc  = typeof description === 'string' ? description.trim() : '';
    if (trimTitle.length < 3)  return res.status(400).json({ error: 'Title must be at least 3 chars' });
    if (!trimDesc)             return res.status(400).json({ error: 'Description is required' });
    if (!TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${TYPES.join(', ')}` });
    if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: `priority must be one of: ${PRIORITIES.join(', ')}` });

    let assignee = null;
    if (assignee_id) {
      const parsed = Number(assignee_id);
      if (!Number.isInteger(parsed) || parsed <= 0) return res.status(400).json({ error: 'Invalid assignee_id' });
      assignee = await get('SELECT id FROM users WHERE id = ?', [parsed]);
      if (!assignee) return res.status(400).json({ error: 'Assignee not found' });
    }

    let sprintRow = null;
    if (sprint_id) {
      sprintRow = await get('SELECT id FROM sprints WHERE id = ?', [Number(sprint_id)]);
      if (!sprintRow) return res.status(400).json({ error: 'Sprint not found' });
    }

    const r = await run(
      `INSERT INTO tickets (title, description, status, type, priority, creator_id, assignee_id, sprint_id)
       VALUES (?, ?, 'To Do', ?, ?, ?, ?, ?)`,
      [trimTitle, trimDesc, type, priority, req.user.id, assignee?.id ?? null, sprintRow?.id ?? null]
    );
    const ticket = await get(`${TICKET_SELECT} WHERE t.id = ?`, [r.id]);
    res.status(201).json(ticket);
  } catch (err) { next(err); }
});

// ─── PATCH /api/tickets/:id ── update fields (any user) ──────────────────────
app.patch('/api/tickets/:id', loadUser, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ticket id' });
    const existing = await get('SELECT id FROM tickets WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });

    const { title, description, assignee_id, type, priority, sprint_id } = req.body || {};

    if (type     && !TYPES.includes(type))         return res.status(400).json({ error: `type must be one of: ${TYPES.join(', ')}` });
    if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ error: `priority must be one of: ${PRIORITIES.join(', ')}` });

    let safeAssigneeId = undefined;
    if (assignee_id !== undefined) {
      if (assignee_id === null || assignee_id === '') { safeAssigneeId = null; }
      else {
        const parsed = Number(assignee_id);
        const user = await get('SELECT id FROM users WHERE id = ?', [parsed]);
        if (!user) return res.status(400).json({ error: 'Assignee not found' });
        safeAssigneeId = parsed;
      }
    }

    let safeSprintId = undefined;
    if (sprint_id !== undefined) {
      if (sprint_id === null || sprint_id === '') { safeSprintId = null; }
      else {
        const sp = await get('SELECT id FROM sprints WHERE id = ?', [Number(sprint_id)]);
        if (!sp) return res.status(400).json({ error: 'Sprint not found' });
        safeSprintId = Number(sprint_id);
      }
    }

    await run(`
      UPDATE tickets SET
        title       = COALESCE(?, title),
        description = COALESCE(?, description),
        type        = COALESCE(?, type),
        priority    = COALESCE(?, priority),
        assignee_id = CASE WHEN ? IS NULL AND ? = 1 THEN NULL ELSE COALESCE(?, assignee_id) END,
        sprint_id   = CASE WHEN ? IS NULL AND ? = 1 THEN NULL ELSE COALESCE(?, sprint_id) END,
        updated_at  = datetime('now')
      WHERE id = ?`,
      [
        title       || null,
        description || null,
        type        || null,
        priority    || null,
        safeAssigneeId,
        safeAssigneeId === null ? 1 : 0,
        safeAssigneeId,
        safeSprintId,
        safeSprintId   === null ? 1 : 0,
        safeSprintId,
        id,
      ]
    );
    const ticket = await get(`${TICKET_SELECT} WHERE t.id = ?`, [id]);
    res.json(ticket);
  } catch (err) { next(err); }
});

// ─── PATCH /api/tickets/:id/status ── Developer only ─────────────────────────
app.patch('/api/tickets/:id/status', loadUser, requireRole('Developer'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ticket id' });
    if (!STATUSES.includes(status))        return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
    const existing = await get('SELECT id FROM tickets WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });
    await run("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
    const ticket = await get(`${TICKET_SELECT} WHERE t.id = ?`, [id]);
    res.json(ticket);
  } catch (err) { next(err); }
});

// ─── PATCH /api/tickets/:id/board-position ── Developer only ─────────────────
app.patch('/api/tickets/:id/board-position', loadUser, requireRole('Developer'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { board_position, status } = req.body || {};
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ticket id' });
    const existing = await get('SELECT id FROM tickets WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });
    const updates = [];
    const params  = [];
    if (board_position !== undefined) { updates.push('board_position = ?'); params.push(Number(board_position)); }
    if (status && STATUSES.includes(status)) { updates.push('status = ?'); params.push(status); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    updates.push("updated_at = datetime('now')");
    params.push(id);
    await run(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`, params);
    const ticket = await get(`${TICKET_SELECT} WHERE t.id = ?`, [id]);
    res.json(ticket);
  } catch (err) { next(err); }
});

// ─── Comments ─────────────────────────────────────────────────────────────────
app.get('/api/tickets/:id/comments', loadUser, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ticket id' });
    const comments = await all(`
      SELECT cm.id, cm.content, cm.created_at, cm.is_edited,
             u.id AS author_id, u.name AS author_name, u.avatar_color AS author_color
        FROM comments cm
        JOIN users u ON u.id = cm.author_id
       WHERE cm.ticket_id = ?
       ORDER BY cm.created_at ASC
    `, [id]);
    res.json(comments);
  } catch (err) { next(err); }
});

app.post('/api/tickets/:id/comments', loadUser, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ticket id' });
    const ticket = await get('SELECT id FROM tickets WHERE id = ?', [id]);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const { content } = req.body || {};
    const trimContent = typeof content === 'string' ? content.trim() : '';
    if (!trimContent) return res.status(400).json({ error: 'Content is required' });
    const r = await run(
      'INSERT INTO comments (ticket_id, author_id, content) VALUES (?, ?, ?)',
      [id, req.user.id, trimContent]
    );
    const comment = await get(`
      SELECT cm.id, cm.content, cm.created_at, cm.is_edited,
             u.id AS author_id, u.name AS author_name, u.avatar_color AS author_color
        FROM comments cm
        JOIN users u ON u.id = cm.author_id
       WHERE cm.id = ?
    `, [r.id]);
    res.status(201).json(comment);
  } catch (err) { next(err); }
});

// ─── Static frontend ──────────────────────────────────────────────────────────
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) res.status(404).send('Run `npm run build` or use the Vite dev server.');
  });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

init()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`✅  API → http://localhost:${PORT}`)))
  .catch((err) => { console.error('DB init failed', err); process.exit(1); });
