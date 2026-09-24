import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { TypeIcon, StatusBadge, Avatar, PriorityDot, Spinner } from './shared.jsx';

const PAGE_SIZE = 8;

export default function BugList({ refreshKey, onTicketClick }) {
  const { userId } = useAuth();
  const [q,          setQ]         = useState('');
  const [debQ,       setDebQ]      = useState('');
  const [status,     setStatus]    = useState('');
  const [type,       setType]      = useState('');
  const [priority,   setPriority]  = useState('');
  const [offset,     setOffset]    = useState(0);
  const [result,     setResult]    = useState({ tickets: [], total: 0 });
  const [loading,    setLoading]   = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebQ(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  // Reset page on filter change
  useEffect(() => setOffset(0), [debQ, status, type, priority]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    const p = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (debQ)    p.set('q',        debQ);
    if (status)  p.set('status',   status);
    if (type)    p.set('type',     type);
    if (priority) p.set('priority', priority);

    api(`/api/tickets?${p}`, { userId })
      .then(d => { if (!cancelled) setResult(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, debQ, status, type, priority, offset, refreshKey]);

  const page  = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Bug List</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {result.total} ticket{result.total !== 1 ? 's' : ''} · paginated
          </p>
        </div>
        {/* Filters */}
        <div className="filter-bar">
          <input
            className="input-field"
            style={{ minWidth: 220, maxWidth: 280 }}
            placeholder="Search title or ID…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {['To Do','In Progress','Done'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="filter-select" value={type} onChange={e => setType(e.target.value)}>
            <option value="">All types</option>
            {['Bug','Task','Story','Epic'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="filter-select" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="">All priorities</option>
            {['Critical','High','Medium','Low'].map(s => <option key={s}>{s}</option>)}
          </select>
          {(q || status || type || priority) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setQ(''); setStatus(''); setType(''); setPriority(''); }}
            >✕ Clear</button>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="issue-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>ID</th>
                    <th style={{ width: 36 }}>Type</th>
                    <th>Title</th>
                    <th style={{ width: 130 }}>Status</th>
                    <th style={{ width: 100 }}>Priority</th>
                    <th style={{ width: 130 }}>Creator</th>
                    <th style={{ width: 130 }}>Assignee</th>
                    <th style={{ width: 100 }}>Sprint</th>
                  </tr>
                </thead>
                <tbody>
                  {result.tickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-secondary)' }}>
                        No tickets match this query.
                      </td>
                    </tr>
                  ) : result.tickets.map(t => (
                    <tr key={t.id} onClick={() => onTicketClick(t.id)}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>#{t.id}</td>
                      <td><TypeIcon type={t.type} /></td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
                          {t.description}
                        </div>
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                      <td><PriorityDot priority={t.priority} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <Avatar name={t.creator_name} color={t.creator_color} size={20} />
                          {t.creator_name}
                        </div>
                      </td>
                      <td>
                        {t.assignee_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <Avatar name={t.assignee_name} color={t.assignee_color} size={20} />
                            {t.assignee_name}
                          </div>
                        ) : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        {t.sprint_name
                          ? <span style={{ fontSize: 11, color: 'var(--blue)' }}>{t.sprint_name}</span>
                          : <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Backlog</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {result.total} result{result.total !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-ghost btn-xs"
                  disabled={offset === 0}
                  onClick={() => setOffset(v => Math.max(0, v - PAGE_SIZE))}
                >← Prev</button>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {page} / {pages}
                </span>
                <button
                  className="btn btn-ghost btn-xs"
                  disabled={offset + PAGE_SIZE >= result.total}
                  onClick={() => setOffset(v => v + PAGE_SIZE)}
                >Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
