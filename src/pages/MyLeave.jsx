// src/pages/MyLeave.jsx
// ─────────────────────────────────────────────────────────────
// My Leave — Office Staff Self-Service Portal
// Shows personal leave balance, request history, submit and
// cancel. Available to all authenticated Vac-Ex M365 users.
// Data filtered server-side by logged-in user's email.
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { useDataverse } from '../hooks/useDataverse';
import {
  fetchLeaveEntitlements,
  fetchLeaveRequests,
  submitLeaveRequest,
  cancelLeaveRequest,
  LEAVE_TYPES,
  LEAVE_STATUS,
  LEAVE_STATUS_COLOURS,
  currentLeaveYear,
  daysBetween,
  formatDate,
} from '../api/dataverse';

const LEAVE_TYPE_OPTIONS = [
  { label: 'Annual Leave',        value: 654460000 },
  { label: 'Sick',                value: 654460001 },
  { label: 'Compassionate Leave', value: 654460002 },
  { label: 'Reservist Leave',     value: 654460003 },
  { label: 'Unpaid Leave',        value: 654460004 },
  { label: 'Parental Leave',      value: 654460005 },
];

const LEAVE_YEAR = currentLeaveYear();

export default function MyLeave() {
  const { callDataverse, userEmail, userName } = useDataverse();

  const [entitlements, setEntitlements] = useState([]);
  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showForm,     setShowForm]     = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState(null);

  const [formType,  setFormType]  = useState(654460000);
  const [formStart, setFormStart] = useState('');
  const [formEnd,   setFormEnd]   = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  }

  const loadData = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    setError(null);
    try {
      const [ents, reqs] = await Promise.all([
        fetchLeaveEntitlements(callDataverse, userEmail, LEAVE_YEAR),
        fetchLeaveRequests(callDataverse, userEmail),
      ]);
      setEntitlements(ents);
      setRequests(reqs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [callDataverse, userEmail]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit() {
    setFormError('');
    if (!formStart || !formEnd) { setFormError('Please select start and end dates.'); return; }
    if (new Date(formStart) > new Date(formEnd)) { setFormError('End date must be on or after start date.'); return; }

    const daysRequested = daysBetween(formStart, formEnd);

    if (formType === 654460000) {
      const annualEnt = entitlements.find(e => e.cr1d8_leavetype === 654460000);
      if (annualEnt && daysRequested > annualEnt.cr1d8_daysremaining) {
        setFormError(`You only have ${annualEnt.cr1d8_daysremaining} days Annual Leave remaining. Requested: ${daysRequested} days.`);
        return;
      }
    }

    const annualEnt    = entitlements.find(e => e.cr1d8_leavetype === 654460000);
    const managerEmail = annualEnt?.cr1d8_manageremail ?? '';
    const title        = `Leave ${new Date(formStart).toLocaleDateString('en-GB')} - ${new Date(formEnd).toLocaleDateString('en-GB')}`;

    const payload = {
      cr1d8_newcolumn:     title,
      cr1d8_employeeemail: userEmail,
      cr1d8_startdate:     formStart,
      cr1d8_enddate:       formEnd,
      cr1d8_daysrequested: daysRequested,
      cr1d8_leavetype:     formType,
      cr1d8_employeenotes: formNotes,
      cr1d8_managerid:     managerEmail,
      cr1d8_status:        654460000,
    };

    setSubmitting(true);
    try {
      await submitLeaveRequest(callDataverse, payload);
      setShowForm(false);
      setFormStart(''); setFormEnd(''); setFormNotes(''); setFormType(654460000);
      showToast('Leave request submitted successfully.');
      await loadData();
    } catch (err) {
      setFormError(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(req) {
    try {
      await cancelLeaveRequest(callDataverse, req.cr1d8_leaverequestid);
      showToast('Leave request cancelled.');
      await loadData();
    } catch (err) {
      showToast(`Cancellation failed: ${err.message}`, true);
    }
  }

  function canCancelApproved(req) {
    if (LEAVE_STATUS[req.cr1d8_status] !== 'Approved') return false;
    const start = new Date(req.cr1d8_startdate);
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.round((start - today) / 86400000) >= 5;
  }

  function isPast(req) { return new Date(req.cr1d8_enddate) < new Date(); }

  const formDays = formStart && formEnd && new Date(formStart) <= new Date(formEnd)
    ? daysBetween(formStart, formEnd) : null;

  if (loading) return <PageCenter><Spinner /><Muted>Loading your leave…</Muted></PageCenter>;
  if (error)   return <PageCenter><Muted style={{ color:'var(--red-txt)' }}>Error: {error}</Muted></PageCenter>;

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'24px 32px', maxWidth:'900px', margin:'0 auto', width:'100%' }}>

      <div style={{ marginBottom:'28px' }}>
        <h1 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'24px', fontWeight:700, color:'var(--vx-yellow)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'4px' }}>
          {userName ? `${userName.split(' ')[0]}'s Leave` : 'My Leave'}
        </h1>
        <p style={{ fontSize:'12px', color:'var(--vx-muted)' }}>
          Leave year {LEAVE_YEAR} — 1 April {LEAVE_YEAR} to 31 March {LEAVE_YEAR + 1}
        </p>
      </div>

      <Section label="Leave Balances">
        {entitlements.length === 0 ? (
          <Muted>No entitlement records found for this leave year. Contact your administrator.</Muted>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:'12px' }}>
            {[...entitlements].sort((a, b) => a.cr1d8_leavetype - b.cr1d8_leavetype).map(ent => {
              const typeName = LEAVE_TYPES[ent.cr1d8_leavetype] ?? 'Unknown';
              return (
                <div key={ent.cr1d8_leaveentitlementid} style={{ background:'var(--vx-surface)', border:'1px solid var(--vx-border)', borderRadius:'8px', padding:'14px 16px' }}>
                  <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--vx-muted)', marginBottom:'8px' }}>{typeName}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'28px', fontWeight:700, color:'var(--vx-yellow)', lineHeight:1 }}>
                    {ent.cr1d8_daysremaining ?? 0}
                  </div>
                  <div style={{ fontSize:'11px', color:'var(--vx-muted)', marginTop:'4px' }}>
                    of {ent.cr1d8_annualallowance ?? 0} days remaining
                  </div>
                  {(ent.cr1d8_daystaken ?? 0) > 0 && (
                    <div style={{ fontSize:'10px', color:'var(--vx-muted2)', marginTop:'2px' }}>
                      {ent.cr1d8_daystaken} taken
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <div style={{ marginBottom:'24px' }}>
        <button onClick={() => setShowForm(v => !v)} style={{ background:showForm?'var(--vx-surface2)':'var(--vx-yellow)', border:'1px solid', borderColor:showForm?'var(--vx-border)':'var(--vx-yellow)', color:showForm?'var(--vx-muted)':'var(--vx-black)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', padding:'10px 24px', borderRadius:'5px', cursor:'pointer' }}>
          {showForm ? 'Cancel' : '+ Request Leave'}
        </button>
      </div>

      {showForm && (
        <Section label="New Leave Request" style={{ marginBottom:'24px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
            <div style={{ gridColumn:'1/-1' }}>
              <Label>Leave Type</Label>
              <select value={formType} onChange={e => setFormType(Number(e.target.value))} style={{ width:'100%', background:'var(--vx-surface2)', border:'1px solid var(--vx-border)', color:'var(--vx-text)', padding:'9px 12px', borderRadius:'5px', fontSize:'13px', fontFamily:"'Barlow',sans-serif" }}>
                {LEAVE_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Start Date</Label>
              <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} style={{ width:'100%', background:'var(--vx-surface2)', border:'1px solid var(--vx-border)', color:'var(--vx-text)', padding:'9px 12px', borderRadius:'5px', fontSize:'13px', fontFamily:"'Barlow',sans-serif" }} />
            </div>
            <div>
              <Label>End Date</Label>
              <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} style={{ width:'100%', background:'var(--vx-surface2)', border:'1px solid var(--vx-border)', color:'var(--vx-text)', padding:'9px 12px', borderRadius:'5px', fontSize:'13px', fontFamily:"'Barlow',sans-serif" }} />
            </div>
            {formDays && (
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ fontSize:'12px', color:'var(--vx-muted)', background:'var(--vx-surface)', border:'1px solid var(--vx-border)', borderRadius:'5px', padding:'8px 12px' }}>
                  <strong style={{ color:'var(--vx-yellow)' }}>{formDays}</strong> day{formDays !== 1 ? 's' : ''} requested (includes weekends — submit two requests if leave spans a weekend)
                </div>
              </div>
            )}
            <div style={{ gridColumn:'1/-1' }}>
              <Label>Notes <span style={{ color:'var(--vx-muted2)' }}>(optional)</span></Label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={3} style={{ width:'100%', background:'var(--vx-surface2)', border:'1px solid var(--vx-border)', color:'var(--vx-text)', padding:'9px 12px', borderRadius:'5px', fontSize:'13px', fontFamily:"'Barlow',sans-serif", resize:'vertical' }} />
            </div>
          </div>
          {formError && <div style={{ background:'var(--red-bg)', border:'1px solid var(--red-bd)', color:'var(--red-txt)', borderRadius:'5px', padding:'10px 14px', fontSize:'12px', marginBottom:'16px' }}>{formError}</div>}
          <button onClick={handleSubmit} disabled={submitting} style={{ background:'var(--vx-yellow)', border:'none', color:'var(--vx-black)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', padding:'10px 28px', borderRadius:'5px', cursor:submitting?'not-allowed':'pointer', opacity:submitting?0.6:1 }}>
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </Section>
      )}

      <Section label="Request History">
        {requests.length === 0 ? <Muted>No leave requests found.</Muted> : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {requests.map(req => {
              const statusLabel = LEAVE_STATUS[req.cr1d8_status] ?? 'Unknown';
              const colours     = LEAVE_STATUS_COLOURS[statusLabel] ?? LEAVE_STATUS_COLOURS.Cancelled;
              const past        = isPast(req);
              const isPending   = statusLabel === 'Pending';
              const canCancel   = isPending || canCancelApproved(req);
              const isUpcoming  = statusLabel === 'Approved' && !past;

              return (
                <div key={req.cr1d8_leaverequestid} style={{ background:'var(--vx-surface)', border:'1px solid var(--vx-border)', borderRadius:'8px', padding:'14px 16px', opacity:past ? 0.65 : 1 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', flexWrap:'wrap' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'14px', fontWeight:600, color:past?'var(--vx-muted)':'var(--vx-text)', marginBottom:'3px' }}>
                        {formatDate(req.cr1d8_startdate)} — {formatDate(req.cr1d8_enddate)}
                      </div>
                      <div style={{ fontSize:'12px', color:'var(--vx-muted)', marginBottom:'3px' }}>
                        {LEAVE_TYPES[req.cr1d8_leavetype] ?? 'Unknown'} · {req.cr1d8_daysrequested} day{req.cr1d8_daysrequested !== 1 ? 's' : ''}
                      </div>
                      {statusLabel === 'Declined' && req.cr1d8_declinereason && (
                        <div style={{ fontSize:'11px', color:'var(--red-txt)', marginTop:'4px' }}>Reason: {req.cr1d8_declinereason}</div>
                      )}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                      {isUpcoming && <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'3px', textTransform:'uppercase', letterSpacing:'.5px', background:'var(--green-bg)', border:'1px solid var(--green-bd)', color:'var(--green-txt)' }}>Upcoming</span>}
                      <span style={{ fontSize:'10px', fontWeight:700, padding:'3px 10px', borderRadius:'4px', textTransform:'uppercase', letterSpacing:'.5px',
                        background: past && statusLabel==='Approved' ? 'rgba(107,114,128,.2)' : colours.bg,
                        border: `1px solid ${past && statusLabel==='Approved' ? 'rgba(107,114,128,.4)' : colours.border}`,
                        color: past && statusLabel==='Approved' ? 'var(--grey-txt)' : colours.text }}>
                        {statusLabel}
                      </span>
                      {canCancel && (
                        <button onClick={() => handleCancel(req)} style={{ fontSize:'11px', fontWeight:600, padding:'4px 12px', borderRadius:'4px', background:'transparent', border:'1px solid var(--red-bd)', color:'var(--red-txt)', cursor:'pointer' }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {toast && (
        <div style={{ position:'fixed', bottom:'32px', left:'50%', transform:'translateX(-50%)', background:'var(--vx-surface2)', border:`1px solid ${toast.isError?'var(--red-bd)':'var(--vx-border)'}`, borderLeft:`3px solid ${toast.isError?'var(--red)':'var(--vx-yellow)'}`, color:'var(--vx-text)', padding:'10px 20px', borderRadius:'6px', fontSize:'13px', fontWeight:500, zIndex:1000, whiteSpace:'nowrap' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Section({ label, children, style }) {
  return (
    <div style={{ marginBottom:'28px', ...style }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--vx-muted2)', marginBottom:'12px', paddingBottom:'8px', borderBottom:'1px solid var(--vx-border)' }}>{label}</div>
      {children}
    </div>
  );
}
function Label({ children }) {
  return <div style={{ fontSize:'11px', fontWeight:600, color:'var(--vx-muted)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'1px' }}>{children}</div>;
}
function Muted({ children, style }) {
  return <p style={{ fontSize:'12px', color:'var(--vx-muted)', ...style }}>{children}</p>;
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
