import React from 'react';

// SVG icons inline — no external library needed
const icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  roadmap: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/><polyline points="8 7 3 12 8 17"/>
      <line x1="21" y1="6" x2="21" y2="12"/><line x1="3" y1="12" x2="3" y2="18"/>
    </svg>
  ),
  backlog: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 5"/>
      <polyline points="3 12 4 13 6 11"/><polyline points="3 18 4 19 6 17"/>
    </svg>
  ),
  board: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="18"/><rect x="10" y="3" width="5" height="11"/>
      <rect x="17" y="3" width="5" height="15"/>
    </svg>
  ),
  bugs: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2l1.5 1.5"/><path d="M14.5 3.5L16 2"/>
      <path d="M9 7.5A3 3 0 1115 7.5v5A3 3 0 019 12.5z"/>
      <path d="M3 11h3m12 0h3M3 8l2.5 1.5M18.5 9.5L21 8M3 17l2.5-1.5M18.5 15.5L21 17"/>
      <path d="M9 17l.5 3h5l.5-3"/>
    </svg>
  ),
  members: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
};

const NAV = [
  { id: 'dashboard', label: 'Dashboard',  icon: icons.dashboard, section: 'planning' },
  { id: 'roadmap',   label: 'Roadmap',    icon: icons.roadmap,   section: 'planning' },
  { id: 'backlog',   label: 'Backlog',    icon: icons.backlog,   section: 'planning' },
  { id: 'board',     label: 'Board',      icon: icons.board,     section: 'planning' },
  { id: 'bugs',      label: 'Bug List',   icon: icons.bugs,      section: 'develop'  },
  { id: 'members',   label: 'Members',    icon: icons.members,   section: 'settings' },
];

export default function Sidebar({ view, onNavigate, onNewIssue }) {
  return (
    <nav className="sidebar">
      {/* ── Project brand ──────────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg, #0c66e4, #9f8fef)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(12,102,228,.4)',
          }}>MJ</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading)' }}>Mini-Jira</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Software project</div>
          </div>
        </div>
      </div>

      {/* ── New issue button ───────────────────────────────────────────── */}
      <div style={{ padding: '10px 12px 4px' }}>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onNewIssue}>
          {icons.plus} Create issue
        </button>
      </div>

      {/* ── Planning ───────────────────────────────────────────────────── */}
      <div className="nav-section-label">Planning</div>
      {NAV.filter(n => n.section === 'planning').map(n => (
        <NavItem key={n.id} item={n} active={view === n.id} onNavigate={onNavigate} />
      ))}

      {/* ── Development ────────────────────────────────────────────────── */}
      <div className="nav-section-label">Development</div>
      {NAV.filter(n => n.section === 'develop').map(n => (
        <NavItem key={n.id} item={n} active={view === n.id} onNavigate={onNavigate} />
      ))}

      {/* ── Settings ───────────────────────────────────────────────────── */}
      <div className="nav-section-label">Settings</div>
      {NAV.filter(n => n.section === 'settings').map(n => (
        <NavItem key={n.id} item={n} active={view === n.id} onNavigate={onNavigate} />
      ))}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-secondary)' }}>
        Mini-Jira · RBAC Demo
      </div>
    </nav>
  );
}

function NavItem({ item, active, onNavigate }) {
  return (
    <button
      className={`nav-item${active ? ' active' : ''}`}
      onClick={() => onNavigate(item.id)}
      style={{ border: 'none', width: '100%', textAlign: 'left', background: 'none' }}
    >
      <span className="nav-item-icon">{item.icon}</span>
      {item.label}
    </button>
  );
}
