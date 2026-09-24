import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { SprintBadge, Spinner, fmtDate } from './shared.jsx';

const SPRINT_COLORS = {
  closed:  '#1f6e47',
  active:  '#0c66e4',
  pending: '#454f59',
};

const TYPE_COLORS = {
  Bug:   '#c9372c',
  Task:  '#0c66e4',
  Story: '#1f6e47',
  Epic:  '#6e5dc6',
};

export default function Roadmap({ refreshKey, onTicketClick, addToast }) {
  const { userId } = useAuth();
  const [sprints,  setSprints]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    api('/api/sprints', { userId })
      .then(s => { if (!cancelled) setSprints(s); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  // Compute date range for timeline
  const { minDate, maxDate, totalDays } = useMemo(() => {
    const dates = sprints.flatMap(s => [s.start_date, s.end_date].filter(Boolean)).map(d => new Date(d));
    if (!dates.length) return { minDate: new Date(), maxDate: new Date(), totalDays: 30 };
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    maxDate.setDate(maxDate.getDate() + 5);
    minDate.setDate(minDate.getDate() - 5);
    const totalDays = Math.max((maxDate - minDate) / 86400000, 30);
    return { minDate, maxDate, totalDays };
  }, [sprints]);

  function barStyle(sprint) {
    if (!sprint.start_date || !sprint.end_date) return null;
    const start = new Date(sprint.start_date);
    const end   = new Date(sprint.end_date);
    const left  = ((start - minDate) / (totalDays * 86400000)) * 100;
    const width = Math.max(((end - start) / (totalDays * 86400000)) * 100, 4);
    return { left: `${left}%`, width: `${width}%`, background: SPRINT_COLORS[sprint.status] || '#454f59' };
  }

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels = [];
    const cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (cur <= maxDate) {
      const left = ((cur - minDate) / (totalDays * 86400000)) * 100;
      labels.push({ label: cur.toLocaleString('en', { month: 'short', year: '2-digit' }), left });
      cur.setMonth(cur.getMonth() + 1);
    }
    return labels;
  }, [minDate, maxDate, totalDays]);

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Roadmap</h1>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          Sprint timeline — click a bar to see sprint details
        </p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['closed','Closed'],['active','Active'],['pending','Pending']].map(([s, l]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: SPRINT_COLORS[s] }} />
            {l}
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
        {/* Month header */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', position: 'relative', height: 32, background: 'var(--bg-surface)' }}>
          <div style={{ width: 220, minWidth: 220, borderRight: '1px solid var(--border-subtle)' }} />
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {monthLabels.map((m, i) => (
              <span key={i} style={{
                position: 'absolute', left: `${m.left}%`, fontSize: 10, fontWeight: 600,
                color: 'var(--text-secondary)', top: '50%', transform: 'translateY(-50%)',
                letterSpacing: '.4px', textTransform: 'uppercase',
              }}>{m.label}</span>
            ))}
          </div>
        </div>

        {/* Today line */}
        {(() => {
          const todayPct = ((new Date() - minDate) / (totalDays * 86400000)) * 100;
          if (todayPct < 0 || todayPct > 100) return null;
          return (
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: `calc(220px + ${todayPct}%)`,
                top: 0, bottom: 0, width: 1.5,
                background: 'var(--red)', zIndex: 5, pointerEvents: 'none',
              }} />
            </div>
          );
        })()}

        {/* Sprint rows */}
        {sprints.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            No sprints yet.
          </div>
        ) : (
          sprints.map(sprint => {
            const style = barStyle(sprint);
            return (
              <div key={sprint.id} style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', minHeight: 56 }}>
                {/* Left label */}
                <div style={{
                  width: 220, minWidth: 220,
                  borderRight: '1px solid var(--border-subtle)',
                  padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SprintBadge status={sprint.status} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sprint.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {sprint.ticket_count} issues · {sprint.done_count} done
                  </div>
                </div>

                {/* Timeline area */}
                <div style={{ flex: 1, position: 'relative', padding: '14px 0' }}>
                  {style ? (
                    <div className="roadmap-bar" style={{ position: 'absolute', ...style, top: 14, bottom: 14 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sprint.name}
                      </span>
                    </div>
                  ) : (
                    <span style={{ paddingLeft: 12, fontSize: 11, color: 'var(--text-secondary)' }}>No dates set</span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Type breakdown footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_COLORS).map(([type, color]) => {
            const count = (sprints || []).reduce((acc, s) => acc, 0); // placeholder
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                {type}
              </div>
            );
          })}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-secondary)' }}>
            {sprints.length} sprints total
          </span>
        </div>
      </div>
    </div>
  );
}
