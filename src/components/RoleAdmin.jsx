import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { Avatar, Spinner } from './shared.jsx';

const ROLES = ['Admin', 'Developer', 'Tester'];

const ROLE_STYLES = {
  Admin:     { bg: '#3a2a00', color: '#f5cd47', border: '#7a5900' },
  Developer: { bg: '#1c3048', color: '#579dff', border: '#1a4a7a' },
  Tester:    { bg: '#164b35', color: '#4bce97', border: '#1f6e47' },
};

export default function RoleAdmin({ refreshKey, addToast, bump }) {
  const { user, users, refreshUsers } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [pending, setPending] = useState({});

  async function changeRole(targetId, role) {
    if (!isAdmin) { addToast('Only Admins can change user roles.', 'error'); return; }
    setPending(p => ({ ...p, [targetId]: true }));
    try {
      await api(`/api/users/${targetId}/role`, { userId: user.id, method: 'PATCH', body: { role } });
      await refreshUsers();
      bump?.();
      addToast(`User role updated to ${role}.`, 'success');
    } catch (err) { addToast(err.message, 'error'); }
    finally { setPending(p => ({ ...p, [targetId]: false })); }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Members & Roles</h1>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          Admins can change any user's role. Role changes take effect immediately.
        </p>
      </div>

      {/* RBAC explainer */}
      <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 8, background: 'var(--blue-subtle)', border: '1px solid var(--border-default)', fontSize: 13 }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--blue)' }}>RBAC Rules enforced by the API</p>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-primary)', lineHeight: 1.8 }}>
          <li><strong style={{ color: ROLE_STYLES.Admin.color }}>Admin</strong> — PATCH /api/users/:id/role</li>
          <li><strong style={{ color: ROLE_STYLES.Tester.color }}>Tester</strong> — POST /api/tickets (create)</li>
          <li><strong style={{ color: ROLE_STYLES.Developer.color }}>Developer</strong> — PATCH /api/tickets/:id/status (move on board)</li>
        </ul>
      </div>

      {!isAdmin && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, background: 'var(--orange-subtle)', border: '1px solid #7a3800', fontSize: 13, color: 'var(--orange)' }}>
          ⚠ You are not an Admin. Role changes will be rejected by the server with 403.
        </div>
      )}

      {/* User list */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 120px 160px', gap: 12, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          <span>User</span>
          <span>Current role</span>
          <span>Change role</span>
        </div>
        {users.map(u => {
          const rs = ROLE_STYLES[u.role] || {};
          return (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
              {/* User info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={u.name} color={u.avatar_color} size={32} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>
                    {u.name}
                    {u.id === user?.id && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--blue)', fontWeight: 500 }}>(you)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>User #{u.id}</div>
                </div>
              </div>

              {/* Current role badge */}
              <div>
                <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, background: rs.bg, color: rs.color, border: `1px solid ${rs.border}` }}>
                  {u.role}
                </span>
              </div>

              {/* Role selector */}
              <div>
                {pending[u.id] ? (
                  <div className="spinner" style={{ width: 16, height: 16 }} />
                ) : (
                  <select
                    value={u.role}
                    disabled={!isAdmin}
                    onChange={e => changeRole(u.id, e.target.value)}
                    className="filter-select"
                    style={{ opacity: isAdmin ? 1 : .5, cursor: isAdmin ? 'pointer' : 'not-allowed' }}
                    key={`${u.id}-${u.role}`}
                  >
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
