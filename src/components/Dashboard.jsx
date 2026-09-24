import React, { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { api }  from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { TypeIcon, StatusBadge, Avatar, PriorityDot, Spinner } from './shared.jsx';

const BUG_PIE_COLORS = ['#f87168', '#4bce97'];

export default function Dashboard({ refreshKey, onTicketClick }) {
  const { user, userId } = useAuth();
  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api('/api/tickets/stats',             { userId }),
      api('/api/tickets?limit=6&offset=0',  { userId }),
    ]).then(([s, r]) => {
      if (cancelled) return;
      setStats(s);
      setRecent(r.tickets);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  if (loading) return <Spinner />;
  if (!stats)  return null;

  const totalBugs = (stats.openBugs || 0) + (stats.closedBugs || 0);
  const openBugsRatio = totalBugs > 0 ? Math.round(((stats.openBugs || 0) / totalBugs) * 100) : 0;
  const closedBugsRatio = totalBugs > 0 ? Math.round(((stats.closedBugs || 0) / totalBugs) * 100) : 0;

  const bugPieData = [
    { name: 'Open Bugs',   value: stats.openBugs   || 0 },
    { name: 'Closed Bugs', value: stats.closedBugs || 0 },
  ].filter(d => d.value > 0);

  const barData = Object.entries(stats.byType || {}).map(([name, value]) => ({ name, count: value }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Project Dashboard</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Live engineering metrics, bug resolution ratio, and RBAC authorization status
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-card)', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Active session:</span>
          <strong style={{ color: 'var(--text-heading)' }}>{user?.name} ({user?.role})</strong>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Tickets',  value: stats.total,      color: 'var(--text-heading)', sub: 'All issues' },
          { label: 'Open Bugs',      value: stats.openBugs,   color: 'var(--red)',          sub: `${openBugsRatio}% of bug load` },
          { label: 'Closed Bugs',    value: stats.closedBugs, color: 'var(--green)',        sub: `${closedBugsRatio}% resolved` },
          { label: 'In Progress',    value: stats.inprogress, color: 'var(--blue)',         sub: 'Active in development' },
          { label: 'To Do Backlog',  value: stats.todo,       color: 'var(--text-secondary)', sub: 'Ready for sprint' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value" style={{ color: s.color }}>{s.value ?? 0}</div>
              <div className="stat-label">{s.label}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Recharts Pie Chart – Open vs Closed Bugs Ratio */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-heading)' }}>
              Open vs Closed Bugs Ratio
            </h2>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--red-subtle)', color: 'var(--red)', fontWeight: 600 }}>
              Live Recharts
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Ratio of active open defects versus resolved bugs in SQLite
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 190 }}>
            <div style={{ flex: 1, height: '100%', minWidth: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bugPieData.length ? bugPieData : [{ name: 'No Bugs', value: 1 }]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {(bugPieData.length ? bugPieData : [{}]).map((_, i) => (
                      <Cell key={i} fill={bugPieData.length ? BUG_PIE_COLORS[i % BUG_PIE_COLORS.length] : '#2c333a'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12, color: 'var(--text-heading)' }}
                    itemStyle={{ color: 'var(--text-heading)' }}
                    formatter={(value, name) => [`${value} bugs (${totalBugs > 0 ? Math.round((value / totalBugs) * 100) : 0}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, minWidth: 150 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: BUG_PIE_COLORS[0], flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)' }}>Open Bugs</span>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', marginLeft: 'auto' }}>
                  {stats.openBugs ?? 0} <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>({openBugsRatio}%)</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: BUG_PIE_COLORS[1], flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)' }}>Closed Bugs</span>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)', marginLeft: 'auto' }}>
                  {stats.closedBugs ?? 0} <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>({closedBugsRatio}%)</span>
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                Total Bugs Tracked: <strong style={{ color: 'var(--text-heading)' }}>{totalBugs}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Bar chart – Issue Types */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-heading)' }}>
              Issues by Category
            </h2>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total: {stats.total}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Breakdown across Bug, Task, Story, and Epic
          </p>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12, color: 'var(--text-heading)' }}
                  itemStyle={{ color: 'var(--text-heading)' }}
                />
                <Bar dataKey="count" fill="var(--blue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── RBAC Live Policy Card ──────────────────────────────────────── */}
      <div className="stat-card" style={{ marginBottom: 20, background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(28, 48, 72, 0.2) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--text-heading)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
              Enforced Role-Based Access Control (RBAC) Matrix
            </h2>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Active user header <code style={{ color: 'var(--blue)' }}>x-user-id: {user?.id}</code> enforces server-side and client-side guards
            </p>
          </div>
          <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: user?.role === 'Admin' ? 'var(--yellow-subtle)' : user?.role === 'Developer' ? 'var(--blue-subtle)' : 'var(--green-subtle)', color: user?.role === 'Admin' ? 'var(--yellow)' : user?.role === 'Developer' ? 'var(--blue)' : 'var(--green)', border: '1px solid var(--border-default)' }}>
            Current: {user?.role}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <div style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--bg-surface)', border: `1px solid ${user?.role === 'Admin' ? 'var(--yellow)' : 'var(--border-subtle)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--yellow)' }} />
              <strong style={{ fontSize: 12, color: 'var(--yellow)' }}>Admin Role</strong>
              {user?.role === 'Admin' && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--yellow)', fontWeight: 700 }}>ACTIVE</span>}
            </div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Granted: <code style={{ color: 'var(--text-primary)' }}>PATCH /api/users/:id/role</code> (Manage user assignments)
            </p>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--bg-surface)', border: `1px solid ${user?.role === 'Tester' ? 'var(--green)' : 'var(--border-subtle)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
              <strong style={{ fontSize: 12, color: 'var(--green)' }}>Tester Role</strong>
              {user?.role === 'Tester' && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>ACTIVE</span>}
            </div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Granted: <code style={{ color: 'var(--text-primary)' }}>POST /api/tickets</code> (Create bug reports & tickets)
            </p>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--bg-surface)', border: `1px solid ${user?.role === 'Developer' ? 'var(--blue)' : 'var(--border-subtle)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)' }} />
              <strong style={{ fontSize: 12, color: 'var(--blue)' }}>Developer Role</strong>
              {user?.role === 'Developer' && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--blue)', fontWeight: 700 }}>ACTIVE</span>}
            </div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Granted: <code style={{ color: 'var(--text-primary)' }}>PATCH /api/tickets/:id/status</code> (Drag & drop board updates)
            </p>
          </div>
        </div>
      </div>

      {/* ── Recent tickets ─────────────────────────────────────────────── */}
      <div className="stat-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-heading)' }}>Recent Issues</h2>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Click row to view / edit</span>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No tickets found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recent.map(t => (
              <div
                key={t.id}
                onClick={() => onTicketClick(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 6, cursor: 'pointer', transition: 'all .12s',
                  background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--border-bold)';
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <TypeIcon type={t.type} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', width: 45 }}>
                  #{t.id}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {t.title}
                </span>
                <PriorityDot priority={t.priority} />
                <StatusBadge status={t.status} />
                {t.assignee_name ? (
                  <Avatar name={t.assignee_name} color={t.assignee_color} size={22} />
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 60 }}>Unassigned</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
