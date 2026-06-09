// src/pages/Home.jsx
// ─────────────────────────────────────────────────────────────
// Landing page for all authenticated users.
// Shows the user what they have access to based on their
// group membership and directs them to the right place.
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroups } from '../hooks/useGroups';
import { useDataverse } from '../hooks/useDataverse';

export default function Home() {
  const { userName } = useDataverse();
  const { groups, groupsLoading } = useGroups();
  const navigate = useNavigate();

  const firstName = userName?.split(' ')[0] ?? 'there';

  if (groupsLoading) {
    return (
      <PageCenter>
        <Spinner />
        <p style={{ fontSize:'12px', color:'var(--vx-muted)' }}>Loading your access…</p>
      </PageCenter>
    );
  }

  const tiles = [
    groups?.canAccessSchedule && {
      title:    'Schedule',
      subtitle: 'Resource scheduling canvas',
      desc:     'Assign operators and vehicles to jobs. Drag and drop scheduling with conflict detection and AI suggestions.',
      route:    '/schedule',
      colour:   'var(--blue)',
      icon:     '📋',
    },
    groups?.canAccessAvailability && {
      title:    'Availability',
      subtitle: 'Team availability timeline',
      desc:     groups?.canSeeAllStaff
                  ? 'View leave across all staff. Add or cancel leave on behalf of any employee.'
                  : 'View operator availability across the month. See who is on leave and when.',
      route:    '/availability',
      colour:   'var(--green)',
      icon:     '📅',
    },
    {
      title:    'My Leave',
      subtitle: 'Personal leave self-service',
      desc:     'View your leave balance, submit requests, and manage your upcoming leave.',
      route:    '/myLeave',
      colour:   'var(--vx-yellow)',
      icon:     '🏖',
    },
  ].filter(Boolean);

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'40px 32px', maxWidth:'900px', margin:'0 auto', width:'100%' }}>

      {/* Welcome */}
      <div style={{ marginBottom:'40px' }}>
        <h1 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'32px', fontWeight:700, color:'var(--vx-yellow)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'8px' }}>
          Welcome, {firstName}
        </h1>
        <p style={{ fontSize:'13px', color:'var(--vx-muted)' }}>
          Resourcify — Vac-Ex Resource Management Platform
        </p>
      </div>

      {/* Access tiles */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'16px' }}>
        {tiles.map(tile => (
          <button key={tile.route} onClick={() => navigate(tile.route)}
            style={{ background:'var(--vx-surface)', border:`1px solid var(--vx-border)`, borderTop:`3px solid ${tile.colour}`, borderRadius:'8px', padding:'24px', textAlign:'left', cursor:'pointer', transition:'border-color .15s', width:'100%' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = tile.colour}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--vx-border)'}>
            <div style={{ fontSize:'28px', marginBottom:'12px' }}>{tile.icon}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'18px', fontWeight:700, color:tile.colour, letterSpacing:'.5px', textTransform:'uppercase', marginBottom:'2px' }}>
              {tile.title}
            </div>
            <div style={{ fontSize:'11px', color:'var(--vx-muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>
              {tile.subtitle}
            </div>
            <p style={{ fontSize:'12px', color:'var(--vx-muted)', lineHeight:1.6 }}>
              {tile.desc}
            </p>
          </button>
        ))}
      </div>

    </div>
  );
}

function PageCenter({ children }) {
  return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'12px' }}>{children}</div>;
}

function Spinner() {
  return (
    <>
      <div style={{ width:'32px', height:'32px', border:'3px solid var(--vx-border)', borderTop:'3px solid var(--vx-yellow)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
