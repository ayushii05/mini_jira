import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { TypeIcon, StatusBadge, Avatar, SprintBadge, Spinner, EmptyState, fmtDate } from './shared.jsx';

export default function Backlog({ refreshKey, onTicketClick, addToast, bump }) {
  const { user, userId } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [sprints,  setSprints]  = useState([]);
  const [tickets,  setTickets]  = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [loading, setLoading]   = useState(true);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api('/api/sprints',           { userId }),
      api('/api/tickets?limit=200', { userId }),
    ]).then(([sp, tk]) => {
      if (cancelled) return;
      setSprints(sp);
      setTickets(tk.tickets);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  async function updateSprintStatus(sprintId, status) {
    if (!isAdmin) { addToast('Only Admins can manage sprints.', 'error'); return; }
    try {
      await api(`/api/sprints/${sprintId}`, { userId, method: 'PATCH', body: { status } });
      bump();
      addToast(`Sprint ${status === 'active' ? 'started' : 'completed'}!`, 'success');
    } catch (err) { addToast(err.message, 'error'); }
  }

  function toggleCollapse(id) {
    setCollapsed(c => ({ ...c, [id]: !c[id] }));
  }

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets.filter(t => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (typeFilter && t.type !== typeFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (q) {
        const titleMatch = t.title?.toLowerCase().includes(q);
        const idMatch = String(t.id).includes(q);
        const descMatch = t.description?.toLowerCase().includes(q);
        if (!titleMatch && !idMatch && !descMatch) return false;
      }
      return true;
    });
  }, [tickets, searchQuery, statusFilter, typeFilter, priorityFilter]);

  const hasActiveFilters = Boolean(searchQuery || statusFilter || typeFilter || priorityFilter);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
    setPriorityFilter('');
  };

  const backlogTickets = filteredTickets.filter(t => !t.sprint_id);

  if (loading) return <Spinner />;

  return (
    <div>
      {/* ── Header & Title ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Backlog</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {hasActiveFilters ? (
              <span>Showing <strong>{filteredTickets.length}</strong> of {tickets.length} issues across {sprints.length} sprints</span>
            ) : (
              <span>{tickets.length} issues across {sprints.length} sprints</span>
            )}
          </p>
        </div>

        {/* ── Search & Filter Bar ────────────────────────────────────────── */}
        <div className="filter-bar">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 10, color: 'var(--text-secondary)', fontSize: 13, pointerEvents: 'none' }}>
              🔍
            </span>
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: 30, minWidth: 220, maxWidth: 280 }}
              placeholder="Search backlog by title or ID…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14 }}
              >
                ✕
              </button>
            )}
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {['To Do', 'In Progress', 'Done'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            className="filter-select"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {['Bug', 'Task', 'Story', 'Epic'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            className="filter-select"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearFilters}
              style={{ color: 'var(--red)', fontWeight: 600 }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {hasActiveFilters && filteredTickets.length === 0 && (
        <div className="stat-card" style={{ textAlign: 'center', padding: '36px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          <p style={{ fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 4px' }}>No backlog issues match your search criteria</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Try adjusting your keywords or clearing filters</p>
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Reset Filters</button>
        </div>
      )}

      {/* ── Sprint sections ─────────────────────────────────────────────── */}
      {sprints.map(sprint => {
        const sprintTickets = filteredTickets.filter(t => t.sprint_id === sprint.id);
        const allSprintTickets = tickets.filter(t => t.sprint_id === sprint.id);
        const doneCount = sprintTickets.filter(t => t.status === 'Done').length;
        const pct = sprintTickets.length ? Math.round((doneCount / sprintTickets.length) * 100) : 0;
        // Auto-expand if active search matches
        const isOpen = hasActiveFilters ? (sprintTickets.length > 0 || !collapsed[sprint.id]) : !collapsed[sprint.id];

        return (
          <div key={sprint.id} className="sprint-section">
            {/* Sprint header */}
            <div className="sprint-hdr" onClick={() => toggleCollapse(sprint.id)}>
              {/* Chevron */}
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s', display: 'inline-block' }}>▶</span>
              <SprintBadge status={sprint.status} />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-heading)', flex: 1 }}>{sprint.name}</span>
              {sprint.start_date && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {fmtDate(sprint.start_date)} – {fmtDate(sprint.end_date)}
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {hasActiveFilters ? `${sprintTickets.length} / ${allSprintTickets.length} issues` : `${sprintTickets.length} issues`}
              </span>
              {/* Progress bar */}
              {sprintTickets.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
                  <div className="progress-bg" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--green)' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{pct}%</span>
                </div>
              )}
              {/* Sprint actions */}
              {isAdmin && sprint.status === 'pending' && (
                <button
                  className="btn btn-primary btn-xs"
                  onClick={e => { e.stopPropagation(); updateSprintStatus(sprint.id, 'active'); }}
                >Start</button>
              )}
              {isAdmin && sprint.status === 'active' && (
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={e => { e.stopPropagation(); updateSprintStatus(sprint.id, 'closed'); }}
                >Complete</button>
              )}
            </div>

            {/* Sprint issues */}
            {isOpen && (
              <div>
                {sprintTickets.length === 0 ? (
                  <div style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: 13, fontStyle: 'italic' }}>
                    {hasActiveFilters ? 'No issues match current filters in this sprint.' : 'No issues in this sprint.'}
                  </div>
                ) : (
                  sprintTickets.map(t => (
                    <BacklogRow key={t.id} ticket={t} onClick={() => onTicketClick(t.id)} />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Backlog (no sprint) ─────────────────────────────────────────── */}
      <div className="sprint-section">
        <div className="sprint-hdr" onClick={() => toggleCollapse('backlog')}>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', transform: !collapsed['backlog'] ? 'rotate(90deg)' : 'none', transition: 'transform .15s', display: 'inline-block' }}>▶</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-heading)', flex: 1 }}>Backlog (Unassigned to Sprint)</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {hasActiveFilters ? `${backlogTickets.length} / ${tickets.filter(t => !t.sprint_id).length} issues` : `${backlogTickets.length} issues`}
          </span>
        </div>
        {!collapsed['backlog'] && (
          <div>
            {backlogTickets.length === 0 ? (
              <div style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: 13, fontStyle: 'italic' }}>
                {hasActiveFilters ? 'No backlog items match current filters.' : 'Backlog is empty.'}
              </div>
            ) : (
              backlogTickets.map(t => (
                <BacklogRow key={t.id} ticket={t} onClick={() => onTicketClick(t.id)} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BacklogRow({ ticket, onClick }) {
  return (
    <div className="backlog-row" onClick={onClick}>
      <TypeIcon type={ticket.type} />
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', minWidth: 40 }}>
        #{ticket.id}
      </span>
      <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 500 }}>{ticket.title}</span>
      <StatusBadge status={ticket.status} />
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 60 }}>{ticket.priority}</span>
      {ticket.assignee_name ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
          <Avatar name={ticket.assignee_name} color={ticket.assignee_color} size={22} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ticket.assignee_name.split(' ')[0]}</span>
        </div>
      ) : (
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 100 }}>—</span>
      )}
    </div>
  );
}
