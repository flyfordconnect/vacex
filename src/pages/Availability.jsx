// src/pages/Availability.jsx
// ─────────────────────────────────────────────────────────────
// Team Availability Timeline — Phase 1.5
// Shows operator leave across a selected month.
// Elevated users (Resourcify - Leave Administrators group) can
// add and cancel leave directly from the timeline.
// ─────────────────────────────────────────────────────────────
import React from 'react';

export default function Availability() {
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
        Availability Timeline
      </div>
      <p style={{ fontSize: '13px', color: 'var(--vx-muted)', textAlign: 'center' }}>
        Phase 1.5 — coming next.
      </p>
    </div>
  );
}
