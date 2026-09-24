import React, { useMemo } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { useTheme } from '../ThemeContext.jsx';

const VIEW_LABELS = {
  dashboard: 'Dashboard',
  board:     'Board',
  backlog:   'Backlog',
  roadmap:   'Roadmap',
  bugs:      'Bug List',
  members:   'Members',
};

const ROLE_STYLES = {
  Admin:     { bg: 'var(--yellow-subtle)', color: 'var(--yellow)', border: 'var(--border-default)' },
  Developer: { bg: 'var(--blue-subtle)', color: 'var(--blue)', border: 'var(--border-default)' },
  Tester:    { bg: 'var(--green-subtle)', color: 'var(--green)', border: 'var(--border-default)' },
};

export default function Navbar({ view, onNewIssue, addToast, bump }) {
  const { users, user, switchUser, switchRole } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const activeRole = user?.role || 'Admin';

  const roleUsers = useMemo(
    () => users.filter(u => u.role === activeRole),
    [users, activeRole]
  );

  const rs = ROLE_STYLES[activeRole] || ROLE_STYLES.Admin;

  return (
    <header className="top-bar">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, marginRight: 'auto' }}>
        <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Mini-Jira</span>
        <span style={{ opacity: .5 }}>/</span>
        <span style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{VIEW_LABELS[view] || view}</span>
      </div>

      {/* Role switcher */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        Session role
        <select
          className="filter-select"
          value={activeRole}
          onChange={e => switchRole(e.target.value)}
        >
          <option>Admin</option>
          <option>Developer</option>
          <option>Tester</option>
        </select>
      </label>

      {/* User switcher */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        Acting as
        <select
          className="filter-select"
          value={user?.id || ''}
          onChange={e => {
            const next = users.find(u => u.id === Number(e.target.value));
            if (next) switchUser(next.id);
          }}
        >
          {(roleUsers.length ? roleUsers : users).map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </label>

      {/* Role badge */}
      {user && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '4px 10px', borderRadius: 5,
          background: rs.bg, border: `1px solid ${rs.border}`,
          fontSize: 12, fontWeight: 600, color: rs.color,
        }}>
          <div
            className="avatar"
            style={{ width: 20, height: 20, fontSize: 9, background: user.avatar_color || '#6366f1' }}
          >
            {user.name.slice(0, 2)}
          </div>
          {user.name.split(' ')[0]} · {user.role}
        </div>
      )}

      {/* Theme Toggle (Light / Dark Mode) */}
      <button
        type="button"
        className="theme-toggle-btn"
        onClick={toggleTheme}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label="Toggle Theme"
      >
        {isDark ? (
          // Sun Icon for Dark Mode (click to turn Light)
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--yellow)' }}>
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          // Moon Icon for Light Mode (click to turn Dark)
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--purple-dim)' }}>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      {/* New Issue */}
      <button
        className="btn btn-primary btn-sm"
        onClick={onNewIssue}
        disabled={user?.role !== 'Tester'}
        title={user?.role === 'Tester' ? 'Create a ticket' : 'Only Testers can create tickets'}
      >
        + New Issue
      </button>
    </header>
  );
}
