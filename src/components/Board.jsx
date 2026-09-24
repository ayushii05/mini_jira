import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { TypeIcon, PriorityDot, Avatar, StatusBadge } from './shared.jsx';

const COLUMNS = [
  { key: 'To Do',       label: 'To Do',       color: '#8c9bab' },
  { key: 'In Progress', label: 'In Progress',  color: '#579dff' },
  { key: 'Done',        label: 'Done',         color: '#4bce97' },
];

export default function Board({ refreshKey, onTicketClick, addToast, bump }) {
  const { user, userId } = useAuth();
  const isDev = user?.role === 'Developer';
  const [tickets, setTickets]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [overCol,  setOverCol]      = useState(null);  // col hovering over
  const [rejectCol, setRejectCol]   = useState(null);  // col flash-rejecting
  const [dragging, setDragging]     = useState(null);  // ticket id being dragged
  const [filters, setFilters]       = useState({ type: '', priority: '' });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    api('/api/tickets?limit=200&offset=0', { userId })
      .then(d => { if (!cancelled) setTickets(d.tickets); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  // reject-shake timer
  useEffect(() => {
    if (!rejectCol) return;
    const t = setTimeout(() => setRejectCol(null), 450);
    return () => clearTimeout(t);
  }, [rejectCol]);

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (filters.type     && t.type     !== filters.type)     return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      return true;
    });
  }, [tickets, filters]);

  const grouped = useMemo(() => {
    const map = { 'To Do': [], 'In Progress': [], 'Done': [] };
    for (const t of filtered) if (map[t.status]) map[t.status].push(t);
    return map;
  }, [filtered]);

  function handleDragStart(e, ticket) {
    e.dataTransfer.setData('text/plain', String(ticket.id));
    e.dataTransfer.effectAllowed = isDev ? 'move' : 'none';
    setDragging(ticket.id);
  }

  function handleDragOver(e, col) {
    e.preventDefault();
    e.dataTransfer.dropEffect = isDev ? 'move' : 'none';
    setOverCol(col);
  }

  async function handleDrop(e, col) {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/plain'));
    setOverCol(null);
    setDragging(null);

    if (!isDev) {
      setRejectCol(col);
      addToast('Only Developers can move tickets.', 'error');
      return;
    }

    const ticket = tickets.find(t => t.id === id);
    if (!ticket || ticket.status === col) return;

    try {
      await api(`/api/tickets/${id}/status`, { userId, method: 'PATCH', body: { status: col } });
      bump();
      addToast(`Moved to "${col}"`, 'success');
    } catch (err) {
      setRejectCol(col);
      addToast(err.message, 'error');
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Board</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {isDev ? 'Drag cards between columns to update ticket status.' : 'Switch to Developer to move cards between columns.'}
          </p>
        </div>
        {/* Filters */}
        <div className="filter-bar">
          <select className="filter-select" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
            <option value="">All types</option>
            {['Bug','Task','Story','Epic'].map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="filter-select" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
            <option value="">All priorities</option>
            {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 64 }}><div className="spinner" /></div>
      ) : (
        <div className="board-wrap">
          {COLUMNS.map(col => {
            const cards = grouped[col.key] || [];
            const isOver   = overCol   === col.key;
            const isReject = rejectCol === col.key;
            return (
              <div key={col.key} className="board-col">
                {/* Column header */}
                <div className="board-col-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                      {col.label}
                    </span>
                  </div>
                  <span style={{
                    background: 'var(--border-subtle)', color: 'var(--text-secondary)',
                    borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 600,
                  }}>{cards.length}</span>
                </div>

                {/* Drop zone */}
                <div
                  className={`board-col-cards${isOver && isDev ? ' over-ok' : ''}${isReject || (isOver && !isDev) ? ' over-reject' : ''}`}
                  onDragOver={e => handleDragOver(e, col.key)}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOverCol(null); }}
                  onDrop={e => handleDrop(e, col.key)}
                >
                  {cards.length === 0 && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, textAlign: 'center', padding: '24px 8px' }}>
                      No tickets
                    </div>
                  )}
                  {cards.map(ticket => (
                    <IssueCard
                      key={ticket.id}
                      ticket={ticket}
                      dragging={dragging === ticket.id}
                      isDev={isDev}
                      onDragStart={handleDragStart}
                      onDragEnd={() => { setDragging(null); setOverCol(null); }}
                      onClick={() => onTicketClick(ticket.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IssueCard({ ticket, dragging, isDev, onDragStart, onDragEnd, onClick }) {
  return (
    <div
      className={`issue-card${dragging ? ' dragging' : ''}${!isDev ? ' no-drag' : ''}`}
      draggable
      onDragStart={e => onDragStart(e, ticket)}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      {/* Top row: type + priority bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <div className={`priority-bar prio-${ticket.priority}`} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <TypeIcon type={ticket.type} />
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              #{ticket.id}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-heading)', lineHeight: 1.4 }}>
            {ticket.title}
          </p>
        </div>
      </div>
      {/* Bottom row: assignee + priority label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <PriorityDot priority={ticket.priority} />
        {ticket.assignee_name
          ? <Avatar name={ticket.assignee_name} color={ticket.assignee_color} size={22} />
          : <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Unassigned</span>
        }
      </div>
    </div>
  );
}
