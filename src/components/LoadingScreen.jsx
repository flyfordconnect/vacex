// src/components/LoadingScreen.jsx
import React from 'react';

export default function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--vx-black)',
      gap: '16px',
    }}>
      {/* Vac-Ex yellow spinner */}
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid var(--vx-border)',
        borderTop: '3px solid var(--vx-yellow)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: 'var(--vx-muted)',
      }}>
        {message}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
