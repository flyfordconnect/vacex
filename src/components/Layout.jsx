// src/components/Layout.jsx
import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useGroups } from '../hooks/useGroups';

export default function Layout() {
  const { accounts, instance } = useMsal();
  const location = useLocation();
  const [whatIfOn, setWhatIfOn] = useState(false);
  const { groups } = useGroups();

  const user = accounts[0];
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
    : '??';

  const isSchedule = location.pathname === '/schedule';

  function handleSignOut() {
    instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  }

  // Build nav links based on group membership
  const navLinks = [
    { to:'/', label:'Home' },
    groups?.canAccessSchedule     && { to:'/schedule',     label:'Schedule' },
    groups?.canAccessAvailability && { to:'/availability', label:'Availability' },
    { to:'/myLeave', label:'My Leave' },
  ].filter(Boolean);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>

      <header style={{ background:'var(--vx-black)', borderBottom:'2px solid var(--vx-yellow)', display:'flex', alignItems:'center', padding:'0 20px', height:'52px', flexShrink:0, gap:'20px', zIndex:100 }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center' }}>
          <img src="/vac-ex-logo.png" alt="Vac-Ex" height="36" style={{ display:'block' }} onError={e => { e.target.style.display='none'; }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'18px', fontWeight:700, color:'var(--vx-yellow)', letterSpacing:'2px', textTransform:'uppercase', marginLeft:'10px' }}>
            Resourcify
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ display:'flex', gap:'4px', marginLeft:'16px' }}>
          {navLinks.map(({ to, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:700,
              letterSpacing:'1.5px', textTransform:'uppercase', padding:'5px 14px',
              borderRadius:'3px', border:'1px solid', textDecoration:'none', transition:'all .15s',
              background: isActive ? 'var(--vx-surface2)' : 'transparent',
              borderColor: isActive ? 'var(--vx-yellow)' : 'var(--vx-border)',
              color: isActive ? 'var(--vx-yellow)' : 'var(--vx-muted)',
            })}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'18px' }}>

          {/* What-If toggle — schedule only */}
          {isSchedule && (
            <div style={{ display:'flex', alignItems:'center', gap:'9px' }}>
              <span style={{ fontSize:'12px', fontWeight:500, color: whatIfOn ? 'var(--amber-txt)' : 'var(--vx-muted)' }}>
                {whatIfOn ? 'What-If ON' : 'What-If Mode'}
              </span>
              <button onClick={() => setWhatIfOn(v => !v)}
                style={{ width:'40px', height:'22px', background: whatIfOn ? 'var(--amber)' : 'var(--vx-border)', borderRadius:'11px', border:'none', cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0 }}
                aria-label="Toggle What-If mode">
                <span style={{ position:'absolute', width:'16px', height:'16px', background:'#fff', borderRadius:'50%', top:'3px', left: whatIfOn ? '21px' : '3px', transition:'left .2s' }} />
              </button>
            </div>
          )}

          {/* User badge */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer' }} onClick={handleSignOut} title="Sign out">
            <div style={{ width:'30px', height:'30px', background:'var(--vx-yellow)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'var(--vx-black)' }}>
              {initials}
            </div>
            <span style={{ fontSize:'13px', color:'var(--vx-muted)' }}>
              {user?.name?.split(' ')[0] ?? 'User'} · Sign out
            </span>
          </div>
        </div>
      </header>

      <main style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <Outlet context={{ whatIfOn, setWhatIfOn }} />
      </main>
    </div>
  );
}
