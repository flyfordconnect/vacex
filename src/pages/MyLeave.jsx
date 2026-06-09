// src/pages/MyLeave.jsx
// ─────────────────────────────────────────────────────────────
// My Leave — Office Staff Self-Service Portal — Phase 1.5
// Personal leave balance, request history, submit and cancel.
// Available to all authenticated Vac-Ex M365 users.
// ─────────────────────────────────────────────────────────────
import React from 'react';

export default function MyLeave() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '12px',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: 'var(--vx-yellow)',
      }}>
        My Leave
      </div>
      <p style={{ fontSize: '13px', color: 'var(--vx-muted)', textAlign: 'center' }}>
        Phase 1.5 — coming next.
      </p>
    </div>
  );
}
