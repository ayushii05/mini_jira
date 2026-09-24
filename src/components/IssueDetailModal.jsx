import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import {
  TypeIcon, StatusBadge, Avatar, PriorityDot, SprintBadge,
  Divider, Spinner, fmtDate,
} from './shared.jsx';

export default function IssueDetailModal({ ticketId, onClose, onUpdated, addToast }) {
  const { user, userId, users } = useAuth();
  const isDev   = user?.role === 'Developer';
  const [ticket,   setTicket]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [comment,  setComment]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [editing,  setEditing]  = useState({});   // field being edited
  const [editVals, setEditVals] = useState({});

  useEffect(() => {
    if (!ticketId || !userId) return;
    let cancelled = false;
    setLoading(true);
    setTicket(null);
    api(`/api/tickets/${ticketId}`, { userId })
      .then(t => { if (!cancelled) { setTicket(t); setEditVals({ title: t.title, description: t.description }); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticketId, userId]);

  async function updateField(field, value) {
    try {
      const updated = await api(`/api/tickets/${ticketId}`, { userId, method: 'PATCH', body: { [field]: value } });
      setTicket(t => ({ ...t, ...updated }));
      onUpdated();
      addToast(`Updated ${field}`, 'success');
    } catch (err) { addToast(err.message, 'error'); }
    setEditing(e => ({ ...e, [field]: false }));
  }

  async function updateStatus(status) {
    if (!isDev) { addToast('Only Developers can change status.', 'error'); return; }
    try {
      const updated = await api(`/api/tickets/${ticketId}/status`, { userId, method: 'PATCH', body: { status } });
      setTicket(t => ({ ...t, ...updated }));
      onUpdated();
      addToast(`Status → "${status}"`, 'success');
    } catch (err) { addToast(err.message, 'error'); }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSaving(true);
    try {
      const c = await api(`/api/tickets/${ticketId}/comments`, { userId, method: 'POST', body: { content: comment.trim() } });
      setTicket(t => ({ ...t, comments: [...(t.comments || []), c] }));
      setComment('');
    } catch (err) { addToast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  const developers = users.filter(u => u.role === 'Developer');

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail-panel">
        {/* Close button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-secondary)', lineHeight: 1 }}
        >✕</button>

        {loading ? (
          <div style={{ paddingTop: 80 }}><Spinner /></div>
        ) : !ticket ? (
          <div style={{ padding: 32, color: 'var(--text-secondary)' }}>Ticket not found.</div>
        ) : (
          <div style={{ padding: '24px 28px 48px' }}>
            {/* Breadcrumb / type + id */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <TypeIcon type={ticket.type} size={20} />
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                {ticket.type} #{ticket.id}
              </span>
            </div>

            {/* Title */}
            {editing.title ? (
              <div style={{ marginBottom: 14 }}>
                <input
                  autoFocus
                  className="input-field"
                  style={{ fontSize: 18, fontWeight: 600 }}
                  value={editVals.title}
                  onChange={e => setEditVals(v => ({ ...v, title: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') updateField('title', editVals.title); if (e.key === 'Escape') setEditing(e2 => ({ ...e2, title: false })); }}
                  onBlur={() => updateField('title', editVals.title)}
                />
              </div>
            ) : (
              <h1
                onClick={() => setEditing(e => ({ ...e, title: true }))}
                style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 14px', cursor: 'pointer', lineHeight: 1.35 }}
                title="Click to edit"
              >
                {ticket.title}
              </h1>
            )}

            {/* Metadata grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {/* Status */}
              <MetaField label="Status">
                <select
                  className="filter-select"
                  value={ticket.status}
                  disabled={!isDev}
                  title={isDev ? 'Update status' : 'Only Developers can change status'}
                  onChange={e => updateStatus(e.target.value)}
                  style={{ opacity: isDev ? 1 : .6 }}
                >
                  {['To Do','In Progress','Done'].map(s => <option key={s}>{s}</option>)}
                </select>
              </MetaField>

              {/* Priority */}
              <MetaField label="Priority">
                <select
                  className="filter-select"
                  value={ticket.priority}
                  onChange={e => updateField('priority', e.target.value)}
                >
                  {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
                </select>
              </MetaField>

              {/* Type */}
              <MetaField label="Type">
                <select
                  className="filter-select"
                  value={ticket.type}
                  onChange={e => updateField('type', e.target.value)}
                >
                  {['Bug','Task','Story','Epic'].map(t => <option key={t}>{t}</option>)}
                </select>
              </MetaField>

              {/* Assignee */}
              <MetaField label="Assignee">
                <select
                  className="filter-select"
                  value={ticket.assignee_id || ''}
                  onChange={e => updateField('assignee_id', e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </MetaField>

              {/* Creator */}
              <MetaField label="Reporter">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <Avatar name={ticket.creator_name} color={ticket.creator_color} size={20} />
                  {ticket.creator_name}
                </div>
              </MetaField>

              {/* Sprint */}
              <MetaField label="Sprint">
                {ticket.sprint_name
                  ? <SprintBadge status={ticket.sprint_status} />
                  : <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Backlog</span>
                }
                {ticket.sprint_name && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>{ticket.sprint_name}</span>}
              </MetaField>

              {/* Dates */}
              <MetaField label="Created">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(ticket.created_at)}</span>
              </MetaField>
              <MetaField label="Updated">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(ticket.updated_at)}</span>
              </MetaField>
            </div>

            <Divider />

            {/* Description */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 8 }}>
                Description
              </label>
              {editing.description ? (
                <div>
                  <textarea
                    autoFocus
                    className="input-field"
                    rows={6}
                    value={editVals.description}
                    onChange={e => setEditVals(v => ({ ...v, description: e.target.value }))}
                    onBlur={() => updateField('description', editVals.description)}
                    style={{ resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => updateField('description', editVals.description)}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(e => ({ ...e, description: false }))}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditing(e => ({ ...e, description: true }))}
                  style={{
                    minHeight: 60, padding: '10px 12px', borderRadius: 6,
                    background: 'var(--bg-surface)', cursor: 'pointer',
                    fontSize: 13, color: ticket.description ? 'var(--text-primary)' : 'var(--text-secondary)',
                    lineHeight: 1.6, whiteSpace: 'pre-wrap', border: '1px solid var(--border-subtle)',
                    transition: 'border-color .15s',
                  }}
                  title="Click to edit"
                >
                  {ticket.description || 'Click to add a description…'}
                </div>
              )}
            </div>

            <Divider />

            {/* Comments */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 12 }}>
                Activity · {(ticket.comments || []).length} comments
              </label>

              {(ticket.comments || []).map(c => (
                <div key={c.id} className="comment-row">
                  <Avatar name={c.author_name} color={c.author_color} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.author_name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fmtDate(c.created_at)}</span>
                      {c.is_edited ? <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>(edited)</span> : null}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {c.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* Add comment */}
              <form onSubmit={submitComment} style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <Avatar name={user?.name || '?'} color={user?.avatar_color} size={28} />
                <div style={{ flex: 1 }}>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Add a comment…"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    style={{ resize: 'vertical', marginBottom: 8 }}
                  />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={!comment.trim() || saving}>
                    {saving ? 'Saving…' : 'Comment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MetaField({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>{children}</div>
    </div>
  );
}
