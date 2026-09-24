import React from 'react';

/* ── Type icon ─────────────────────────────────────────────────────────────── */
const TYPE_LABELS = { Bug: 'B', Task: '✓', Story: 'S', Epic: '⚡' };

export function TypeIcon({ type, size = 18 }) {
  return (
    <span
      className={`type-icon type-${type}`}
      style={{ width: size, height: size, fontSize: size * .56 }}
      title={type}
    >
      {TYPE_LABELS[type] || type[0]}
    </span>
  );
}

/* ── Priority dot + label ──────────────────────────────────────────────────── */
export function PriorityDot({ priority }) {
  return (
    <span className="priority-badge">
      <span className={`priority-dot prio-${priority}`} />
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{priority}</span>
    </span>
  );
}

/* ── Avatar ────────────────────────────────────────────────────────────────── */
export function Avatar({ name = '?', color = '#6366f1', size = 24 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * .38, background: color }}
      title={name}
    >
      {initials}
    </span>
  );
}

/* ── Status badge ──────────────────────────────────────────────────────────── */
export function StatusBadge({ status }) {
  const cls = status === 'To Do' ? 'Todo' : status === 'In Progress' ? 'InProgress' : 'Done';
  return <span className={`status-badge status-${cls}`}>{status}</span>;
}

/* ── Sprint badge ──────────────────────────────────────────────────────────── */
export function SprintBadge({ status }) {
  return <span className={`sprint-badge sprint-${status}`}>{status}</span>;
}

/* ── Divider ───────────────────────────────────────────────────────────────── */
export function Divider({ my = 16 }) {
  return <div className="divider" style={{ margin: `${my}px 0` }} />;
}

/* ── Section heading ───────────────────────────────────────────────────────── */
export function SectionHeading({ children }) {
  return (
    <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
      {children}
    </h2>
  );
}

/* ── Spinner ───────────────────────────────────────────────────────────────── */
export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <div className="spinner" />
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────────── */
export function EmptyState({ icon = '📭', title, sub }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 36 }}>{icon}</div>
      {title && <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</p>}
      {sub   && <p style={{ fontSize: 12, margin: 0 }}>{sub}</p>}
    </div>
  );
}

/* ── Format date ───────────────────────────────────────────────────────────── */
export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
