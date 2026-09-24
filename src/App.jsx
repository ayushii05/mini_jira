import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { api }     from './api.js';
import Navbar          from './components/Navbar.jsx';
import Sidebar         from './components/Sidebar.jsx';
import Dashboard       from './components/Dashboard.jsx';
import Board           from './components/Board.jsx';
import Backlog         from './components/Backlog.jsx';
import Roadmap         from './components/Roadmap.jsx';
import BugList         from './components/BugList.jsx';
import RoleAdmin       from './components/RoleAdmin.jsx';
import NewIssueModal   from './components/NewIssueModal.jsx';
import IssueDetailModal from './components/IssueDetailModal.jsx';

export default function App() {
  const { ready, error, userId } = useAuth();
  const [view,            setView]           = useState('board');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [modalOpen,       setModalOpen]      = useState(false);
  const [refreshKey,      setRefreshKey]     = useState(0);
  const [toasts,          setToasts]         = useState([]);

  const bump = useCallback(() => setRefreshKey(n => n + 1), []);

  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const onTicketClick = useCallback((id) => setSelectedTicketId(id), []);

  // Keyboard: Esc closes panels
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setSelectedTicketId(null);
        setModalOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!ready) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <span style={{ fontSize: 14 }}>Loading workspace…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--red)', padding: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Cannot reach API server</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{error}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 8 }}>
            Make sure <code>npm run dev</code> is running.
          </p>
        </div>
      </div>
    );
  }

  const viewProps = { refreshKey, onTicketClick, addToast, bump };

  return (
    <div className="app-shell">
      {/* ── Left sidebar ──────────────────────────────────────────────── */}
      <Sidebar
        view={view}
        onNavigate={(v) => { setView(v); setSelectedTicketId(null); }}
        onNewIssue={() => setModalOpen(true)}
      />

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <div className="main-area">
        <Navbar
          view={view}
          onNewIssue={() => setModalOpen(true)}
          addToast={addToast}
          bump={bump}
        />
        <div className="content-area">
          <div className="view-enter" key={view}>
            {view === 'dashboard' && <Dashboard {...viewProps} />}
            {view === 'board'     && <Board     {...viewProps} />}
            {view === 'backlog'   && <Backlog   {...viewProps} />}
            {view === 'roadmap'   && <Roadmap   {...viewProps} />}
            {view === 'bugs'      && <BugList   {...viewProps} />}
            {view === 'members'   && <RoleAdmin {...viewProps} />}
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <NewIssueModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => { bump(); addToast('Ticket created!', 'success'); }}
      />

      {selectedTicketId && (
        <IssueDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          onUpdated={bump}
          addToast={addToast}
        />
      )}

      {/* ── Toast notifications ───────────────────────────────────────── */}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
