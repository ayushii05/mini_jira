const { get } = require('../db');

const ROLES = Object.freeze(['Admin', 'Developer', 'Tester']);
const STATUSES = Object.freeze(['To Do', 'In Progress', 'Done']);

async function loadUser(req, res, next) {
  try {
    const raw = req.header('x-user-id') || req.header('user_id') || req.header('user-id');
    if (!raw) {
      return res.status(401).json({ error: 'Missing x-user-id or user_id header' });
    }
    const userId = Number(raw);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: 'Invalid user id header' });
    }
    const user = await get('SELECT id, name, role FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(401).json({ error: 'Unknown user' });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: requires role ${allowed.join(' or ')}`,
        requiredRoles: allowed,
        actualRole: req.user ? req.user.role : null,
      });
    }
    next();
  };
}

module.exports = { loadUser, requireRole, ROLES, STATUSES };
