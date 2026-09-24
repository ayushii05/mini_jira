import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

const EMPTY = { title: '', description: '', assignee_id: '', type: 'Bug', priority: 'Medium', sprint_id: '' };

export default function NewIssueModal({ open, onClose, onCreated }) {
  const { user, users } = useAuth();
  const [form,        setForm]        = useState(EMPTY);
  const [errors,      setErrors]      = useState({});
  const [submitErr,   setSubmitErr]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [sprints,     setSprints]     = useState([]);

  const canCreate = user?.role === 'Tester';
  const developers = users.filter(u => u.role === 'Developer');

  // Load sprints when modal opens
  React.useEffect(() => {
    if (!open || !user) return;
    api('/api/sprints', { userId: user.id }).then(setSprints).catch(() => {});
  }, [open, user]);

  function validate(f = form) {
    const e = {};
    if (!f.title.trim())         e.title = 'Title is required.';
    else if (f.title.trim().length < 3) e.title = 'Title must be at least 3 characters.';
    if (!f.description.trim())   e.description = 'Description is required.';
    else if (f.description.trim().length < 8) e.description = 'Description must be at least 8 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function update(key, val) {
    const next = { ...form, [key]: val };
    setForm(next);
    validate(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitErr('');
    if (!canCreate) { setSubmitErr('Only Testers can create tickets.'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api('/api/tickets', {
        userId: user.id, method: 'POST',
        body: {
          title:       form.title.trim(),
          description: form.description.trim(),
          type:        form.type,
          priority:    form.priority,
          assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
          sprint_id:   form.sprint_id   ? Number(form.sprint_id)   : null,
        },
      });
      setForm(EMPTY);
      setErrors({});
      onCreated();
      onClose();
    } catch (err) { setSubmitErr(err.message); }
    finally { setSubmitting(false); }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal-panel" onSubmit={handleSubmit}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>Create issue</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              Only Testers can create tickets. Developers move them on the board.
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-secondary)', lineHeight: 1 }}>✕</button>
        </div>

        {!canCreate && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, background: 'var(--orange-subtle)', border: '1px solid #7a3800', fontSize: 13, color: 'var(--orange)' }}>
            ⚠ Switch session to <strong>Tester</strong> role to create tickets.
          </div>
        )}

        {/* Type + Priority row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <FormField label="Issue type" error={errors.type}>
            <select className="input-field" value={form.type} onChange={e => update('type', e.target.value)}>
              {['Bug','Task','Story','Epic'].map(t => <option key={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Priority" error={errors.priority}>
            <select className="input-field" value={form.priority} onChange={e => update('priority', e.target.value)}>
              {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
            </select>
          </FormField>
        </div>

        {/* Title */}
        <FormField label="Title *" error={errors.title} style={{ marginBottom: 14 }}>
          <input
            className="input-field"
            placeholder="Short, specific summary of the issue"
            value={form.title}
            onChange={e => update('title', e.target.value)}
          />
        </FormField>

        {/* Description */}
        <FormField label="Description *" error={errors.description} style={{ marginBottom: 14 }}>
          <textarea
            className="input-field"
            rows={4}
            placeholder="Steps to reproduce, expected vs. actual behaviour…"
            value={form.description}
            onChange={e => update('description', e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </FormField>

        {/* Assignee + Sprint row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <FormField label="Assignee (optional)">
            <select className="input-field" value={form.assignee_id} onChange={e => update('assignee_id', e.target.value)}>
              <option value="">Unassigned</option>
              {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </FormField>
          <FormField label="Sprint (optional)">
            <select className="input-field" value={form.sprint_id} onChange={e => update('sprint_id', e.target.value)}>
              <option value="">Backlog</option>
              {sprints.filter(s => s.status !== 'closed').map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FormField>
        </div>

        {submitErr && (
          <p style={{ marginBottom: 14, fontSize: 13, color: 'var(--red)', background: 'var(--red-subtle)', padding: '8px 12px', borderRadius: 6 }}>{submitErr}</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || Object.keys(errors).length > 0 || !form.title || !form.description}
          >
            {submitting ? 'Creating…' : 'Create ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, error, children, style }) {
  return (
    <div style={{ marginBottom: 0, ...style }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>
        {label}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 3, display: 'block' }}>{error}</span>}
    </div>
  );
}
