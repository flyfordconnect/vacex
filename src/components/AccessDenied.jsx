// src/components/AccessDenied.jsx
// Shown when a user navigates to a route they don't have access to.
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'16px' }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'48px', fontWeight:700, color:'var(--vx-border)' }}>
        403
      </div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'16px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--vx-muted)' }}>
        Access Restricted
      </div>
      <p style={{ fontSize:'12px', color:'var(--vx-muted2)', textAlign:'center', maxWidth:'320px', lineHeight:1.6 }}>
        You don't have permission to view this page. Contact your administrator if you believe this is an error.
      </p>
      <button onClick={() => navigate('/')}
        style={{ background:'transparent', border:'1px solid var(--vx-border)', color:'var(--vx-muted)', padding:'8px 20px', borderRadius:'4px', cursor:'pointer', fontSize:'12px', fontFamily:"'Barlow',sans-serif", marginTop:'8px' }}>
        Back to Home
      </button>
    </div>
  );
}
