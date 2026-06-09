// src/pages/Availability.jsx
// ─────────────────────────────────────────────────────────────
// Team Availability Timeline — Phase 1.5
// Operator rows × day columns for the selected month.
// Colour coded leave blocks per leave type.
// Elevated users (Leave Administrators group) can add and
// cancel leave directly from the timeline.
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { useDataverse } from '../hooks/useDataverse';
import {
  fetchOperators,
  fetchAllLeaveRequests,
  cancelLeaveRequest,
  createApprovedLeaveRequest,
  LEAVE_TYPES,
  LEAVE_TYPE_COLOURS,
  currentLeaveYear,
  daysBetween,
} from '../api/dataverse';
import { useGroups } from '../hooks/useGroups';

// ─── Helpers ──────────────────────────────────────────────────
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function isWeekend(year, month, day) {
  const d = new Date(year, month, day).getDay();
  return d === 0 || d === 6;
}

function dayOfWeekLabel(year, month, day) {
  return ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(year, month, day).getDay()];
}

const LEAVE_TYPE_OPTIONS_LIST = [
  { label:'Annual Leave',        value:654460000 },
  { label:'Sick',                value:654460001 },
  { label:'Compassionate Leave', value:654460002 },
  { label:'Reservist Leave',     value:654460003 },
  { label:'Unpaid Leave',        value:654460004 },
  { label:'Parental Leave',      value:654460005 },
];

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];



// ─── Component ────────────────────────────────────────────────
export default function Availability() {
  const { callDataverse, userEmail } = useDataverse();
  const { instance, accounts } = useMsal();
  const { groups } = useGroups();

  const isAdmin      = groups?.canElevateOperators ?? false;
  const canSeeAll    = groups?.canSeeAllStaff ?? false;

  // Current month/year navigation
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  // Data
  const [operators,     setOperators]     = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [toast,         setToast]         = useState(null);

  // Filters
  const [nameFilter,    setNameFilter]    = useState('');
  const [hiddenOps,     setHiddenOps]     = useState(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem('hiddenOps') ?? '[]')); }
    catch { return new Set(); }
  });

  // Add leave modal
  const [addModal,      setAddModal]      = useState(null); // { operator }
  const [modalType,     setModalType]     = useState(654460000);
  const [modalStart,    setModalStart]    = useState('');
  const [modalEnd,      setModalEnd]      = useState('');
  const [modalNotes,    setModalNotes]    = useState('');
  const [modalError,    setModalError]    = useState('');
  const [modalSaving,   setModalSaving]   = useState(false);

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Month bounds ──
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const monthStart  = toDateStr(new Date(viewYear, viewMonth, 1));
  const monthEnd    = toDateStr(new Date(viewYear, viewMonth, daysInMonth));

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ops, reqs] = await Promise.all([
        fetchOperators(callDataverse),
        fetchAllLeaveRequests(callDataverse, monthStart, monthEnd),
      ]);
      // Operations group sees operators only — filter by job title or department
      // Leave Administrators All Staff sees everyone
      setOperators(canSeeAll ? ops : ops.filter(op =>
        op.sshared_jobtitle?.toLowerCase().includes('operator') ||
        op.sshared_jobtitle?.toLowerCase().includes('plant')
      ));
      setLeaveRequests(reqs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [callDataverse, monthStart, monthEnd, canSeeAll]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Month navigation ──
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // ── Toggle operator visibility ──
  function toggleOperator(id) {
    setHiddenOps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      sessionStorage.setItem('hiddenOps', JSON.stringify([...next]));
      return next;
    });
  }

  // ── Get leave blocks for an operator on a given day ──
  function getLeaveForDay(operatorEmail, day) {
    const dateStr = toDateStr(new Date(viewYear, viewMonth, day));
    return leaveRequests.filter(req =>
      req.cr1d8_employeeemail?.toLowerCase() === operatorEmail?.toLowerCase() &&
      req.cr1d8_startdate <= dateStr &&
      req.cr1d8_enddate   >= dateStr
    );
  }

  // ── Cancel leave from timeline ──
  async function handleCancelLeave(req) {
    try {
      await cancelLeaveRequest(callDataverse, req.cr1d8_leaverequestid);
      showToast('Leave cancelled.');
      await loadData();
    } catch (err) {
      showToast(`Cancel failed: ${err.message}`, true);
    }
  }

  // ── Add leave modal submit ──
  async function handleAddLeave() {
    setModalError('');
    if (!modalStart || !modalEnd) { setModalError('Please select start and end dates.'); return; }
    if (new Date(modalStart) > new Date(modalEnd)) { setModalError('End date must be on or after start date.'); return; }

    const op    = addModal.operator;
    const days  = daysBetween(modalStart, modalEnd);
    const title = `Leave ${new Date(modalStart).toLocaleDateString('en-GB')} - ${new Date(modalEnd).toLocaleDateString('en-GB')}`;

    setModalSaving(true);
    try {
      await createApprovedLeaveRequest(callDataverse, {
        cr1d8_newcolumn:     title,
        cr1d8_employeeemail: op.sshared_companyemail?.toLowerCase(),
        cr1d8_startdate:     modalStart,
        cr1d8_enddate:       modalEnd,
        cr1d8_daysrequested: days,
        cr1d8_leavetype:     modalType,
        cr1d8_employeenotes: modalNotes,
      });
      setAddModal(null);
      setModalStart(''); setModalEnd(''); setModalNotes(''); setModalType(654460000);
      showToast(`Leave added for ${op.sshared_name}.`);
      await loadData();
    } catch (err) {
      setModalError(`Failed: ${err.message}`);
    } finally {
      setModalSaving(false);
    }
  }

  // ── Filtered operators ──
  const filteredOps = operators.filter(op => {
    if (nameFilter && !op.sshared_name?.toLowerCase().includes(nameFilter.toLowerCase())) return false;
    return true;
  });

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  if (loading) return <PageCenter><Spinner /><Muted>Loading availability…</Muted></PageCenter>;
  if (error)   return <PageCenter><Muted style={{ color:'var(--red-txt)' }}>Error: {error}</Muted></PageCenter>;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date();
  const isToday = (day) => today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* ── Toolbar ── */}
      <div style={{ background:'var(--vx-dark)', borderBottom:'1px solid var(--vx-border)', padding:'10px 16px', display:'flex', alignItems:'center', gap:'16px', flexShrink:0, flexWrap:'wrap' }}>

        {/* Month navigation */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={prevMonth} style={navBtnStyle}>‹</button>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'16px', fontWeight:700, color:'var(--vx-text)', minWidth:'160px', textAlign:'center' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} style={navBtnStyle}>›</button>
          <button onClick={() => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); }} style={todayBtnStyle}>Today</button>
        </div>

        {/* Name filter */}
        <input
          type="text"
          placeholder="Search operator…"
          value={nameFilter}
          onChange={e => setNameFilter(e.target.value)}
          style={{ background:'var(--vx-surface)', border:'1px solid var(--vx-border)', color:'var(--vx-text)', padding:'6px 12px', borderRadius:'4px', fontSize:'12px', fontFamily:"'Barlow',sans-serif", width:'180px' }}
        />

        {/* Admin badge */}
        {isAdmin && (
          <span style={{ fontSize:'10px', fontWeight:700, padding:'3px 10px', borderRadius:'3px', textTransform:'uppercase', letterSpacing:'1px', background:'rgba(245,200,0,.15)', border:'1px solid rgba(245,200,0,.3)', color:'var(--vx-yellow)' }}>
            Leave Administrator
          </span>
        )}

        {/* Legend */}
        <div style={{ marginLeft:'auto', display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
          {Object.entries(LEAVE_TYPE_COLOURS).map(([type, col]) => (
            <div key={type} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'10px', color:'var(--vx-muted)' }}>
              <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:col.bg, border:`1px solid ${col.border}` }} />
              {col.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ flex:1, overflow:'auto' }}>
        <table style={{ borderCollapse:'collapse', minWidth:'100%', tableLayout:'fixed' }}>

          {/* Column widths */}
          <colgroup>
            <col style={{ width:'160px' }} />
            {days.map(d => <col key={d} style={{ width:`${Math.max(32, Math.floor((window.innerWidth - 160) / daysInMonth))}px` }} />)}
          </colgroup>

          {/* Header row — day numbers */}
          <thead>
            <tr style={{ background:'var(--vx-dark)', position:'sticky', top:0, zIndex:20 }}>
              <th style={{ padding:'8px 12px', textAlign:'left', borderBottom:'2px solid var(--vx-border)', borderRight:'1px solid var(--vx-border)', fontSize:'11px', fontWeight:700, color:'var(--vx-muted)', textTransform:'uppercase', letterSpacing:'1px', position:'sticky', left:0, background:'var(--vx-dark)', zIndex:30 }}>
                Operator
              </th>
              {days.map(day => (
                <th key={day} style={{
                  padding:'4px 2px', textAlign:'center',
                  borderBottom:'2px solid var(--vx-border)',
                  borderLeft:'1px solid var(--vx-border)',
                  background: isToday(day) ? 'rgba(245,200,0,.08)' : isWeekend(viewYear, viewMonth, day) ? 'rgba(255,255,255,.02)' : 'var(--vx-dark)',
                  minWidth:'32px',
                }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'12px', fontWeight:700, color: isToday(day) ? 'var(--vx-yellow)' : isWeekend(viewYear, viewMonth, day) ? 'var(--vx-muted2)' : 'var(--vx-muted)' }}>
                    {day}
                  </div>
                  <div style={{ fontSize:'9px', color: isToday(day) ? 'rgba(245,200,0,.6)' : 'var(--vx-muted2)' }}>
                    {dayOfWeekLabel(viewYear, viewMonth, day)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Operator rows */}
          <tbody>
            {filteredOps.length === 0 && (
              <tr>
                <td colSpan={daysInMonth + 1} style={{ padding:'24px', textAlign:'center', color:'var(--vx-muted)', fontSize:'12px' }}>
                  No operators found.
                </td>
              </tr>
            )}
            {filteredOps.map((op, idx) => {
              const email    = op.sshared_companyemail?.toLowerCase();
              const isHidden = hiddenOps.has(op.sshared_employeeid);

              return (
                <React.Fragment key={op.sshared_employeeid}>
                  <tr style={{ borderBottom:'1px solid var(--vx-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>

                    {/* Operator label — sticky left */}
                    <td style={{ padding:'6px 12px', borderRight:'1px solid var(--vx-border)', position:'sticky', left:0, background: idx % 2 === 0 ? 'var(--vx-dark)' : '#1e1e1e', zIndex:10, minHeight:'44px' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
                        <div>
                          <div style={{ fontSize:'12px', fontWeight:600, color:'var(--vx-text)', whiteSpace:'nowrap' }}>{op.sshared_name}</div>
                          {op.sshared_jobtitle && <div style={{ fontSize:'10px', color:'var(--vx-muted)', marginTop:'1px' }}>{op.sshared_jobtitle}</div>}
                        </div>
                        <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
                          {/* Toggle visibility */}
                          <button onClick={() => toggleOperator(op.sshared_employeeid)} title={isHidden ? 'Show' : 'Hide'}
                            style={{ background:'transparent', border:'1px solid var(--vx-border)', color:'var(--vx-muted2)', width:'20px', height:'20px', borderRadius:'3px', cursor:'pointer', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {isHidden ? '👁' : '−'}
                          </button>
                          {/* Add leave (admin only) */}
                          {isAdmin && (
                            <button onClick={() => { setAddModal({ operator:op }); setModalStart(monthStart); setModalEnd(monthStart); }}
                              title="Add leave"
                              style={{ background:'rgba(245,200,0,.1)', border:'1px solid rgba(245,200,0,.3)', color:'var(--vx-yellow)', width:'20px', height:'20px', borderRadius:'3px', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Day cells */}
                    {!isHidden && days.map(day => {
                      const dayLeave = getLeaveForDay(email, day);
                      const weekend  = isWeekend(viewYear, viewMonth, day);
                      return (
                        <td key={day} style={{
                          borderLeft:'1px solid var(--vx-border)',
                          padding:'2px',
                          verticalAlign:'top',
                          background: isToday(day) ? 'rgba(245,200,0,.04)' : weekend ? 'rgba(255,255,255,.01)' : 'transparent',
                          minWidth:'32px',
                          height:'44px',
                        }}>
                          {dayLeave.map(req => {
                            const col = LEAVE_TYPE_COLOURS[req.cr1d8_leavetype] ?? LEAVE_TYPE_COLOURS[654460000];
                            // Only show label on first day of the block
                            const dateStr   = toDateStr(new Date(viewYear, viewMonth, day));
                            const isFirst   = req.cr1d8_startdate === dateStr || day === 1;
                            return (
                              <div key={req.cr1d8_leaverequestid}
                                title={`${LEAVE_TYPES[req.cr1d8_leavetype] ?? 'Leave'} — click to cancel`}
                                onClick={() => isAdmin && handleCancelLeave(req)}
                                style={{
                                  background: col.bg,
                                  borderTop:`2px solid ${col.border}`,
                                  color: col.text,
                                  fontSize:'9px',
                                  fontWeight:700,
                                  padding:'2px 4px',
                                  borderRadius:'2px',
                                  height:'100%',
                                  minHeight:'36px',
                                  display:'flex',
                                  alignItems:'center',
                                  cursor: isAdmin ? 'pointer' : 'default',
                                  overflow:'hidden',
                                  whiteSpace:'nowrap',
                                }}>
                                {isFirst ? col.label : ''}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                    {/* Collapsed row */}
                    {isHidden && (
                      <td colSpan={daysInMonth} style={{ borderLeft:'1px solid var(--vx-border)', padding:'4px 12px' }}>
                        <span style={{ fontSize:'10px', color:'var(--vx-muted2)', fontStyle:'italic' }}>Hidden — click eye to show</span>
                      </td>
                    )}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Add Leave Modal ── */}
      {addModal && (
        <>
          <div onClick={() => setAddModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:200 }} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'var(--vx-dark)', border:'1px solid var(--vx-border)', borderTop:'3px solid var(--vx-yellow)', borderRadius:'8px', padding:'24px', width:'420px', zIndex:201, maxWidth:'90vw' }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--vx-yellow)', marginBottom:'4px' }}>
              Add Leave
            </div>
            <div style={{ fontSize:'12px', color:'var(--vx-muted)', marginBottom:'20px' }}>
              {addModal.operator.sshared_name} — pre-approved, no notification sent
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <Label>Leave Type</Label>
                <select value={modalType} onChange={e => setModalType(Number(e.target.value))} style={selectStyle}>
                  {LEAVE_TYPE_OPTIONS_LIST.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <Label>Start Date</Label>
                  <input type="date" value={modalStart} onChange={e => setModalStart(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <input type="date" value={modalEnd} onChange={e => setModalEnd(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <Label>Notes <span style={{ color:'var(--vx-muted2)' }}>(required for sick leave)</span></Label>
                <textarea value={modalNotes} onChange={e => setModalNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize:'vertical' }} />
              </div>
            </div>

            {modalError && <div style={{ background:'var(--red-bg)', border:'1px solid var(--red-bd)', color:'var(--red-txt)', borderRadius:'4px', padding:'8px 12px', fontSize:'12px', marginTop:'12px' }}>{modalError}</div>}

            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              <button onClick={handleAddLeave} disabled={modalSaving}
                style={{ flex:1, background:'var(--vx-yellow)', border:'none', color:'var(--vx-black)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', padding:'10px', borderRadius:'5px', cursor:modalSaving?'not-allowed':'pointer', opacity:modalSaving?.6:1 }}>
                {modalSaving ? 'Saving…' : 'Add Leave'}
              </button>
              <button onClick={() => setAddModal(null)}
                style={{ flex:1, background:'transparent', border:'1px solid var(--vx-border)', color:'var(--vx-muted)', fontFamily:"'Barlow',sans-serif", fontSize:'13px', padding:'10px', borderRadius:'5px', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position:'fixed', bottom:'32px', left:'50%', transform:'translateX(-50%)', background:'var(--vx-surface2)', border:`1px solid ${toast.isError?'var(--red-bd)':'var(--vx-border)'}`, borderLeft:`3px solid ${toast.isError?'var(--red)':'var(--vx-yellow)'}`, color:'var(--vx-text)', padding:'10px 20px', borderRadius:'6px', fontSize:'13px', fontWeight:500, zIndex:1000, whiteSpace:'nowrap' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const navBtnStyle = { background:'var(--vx-surface)', border:'1px solid var(--vx-border)', color:'var(--vx-muted)', width:'28px', height:'28px', borderRadius:'4px', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' };
const todayBtnStyle = { background:'transparent', border:'1px solid var(--vx-border)', color:'var(--vx-muted)', padding:'5px 12px', fontSize:'12px', borderRadius:'4px', cursor:'pointer', fontFamily:"'Barlow',sans-serif" };
const selectStyle = { width:'100%', background:'var(--vx-surface2)', border:'1px solid var(--vx-border)', color:'var(--vx-text)', padding:'8px 12px', borderRadius:'5px', fontSize:'13px', fontFamily:"'Barlow',sans-serif" };
const inputStyle  = { width:'100%', background:'var(--vx-surface2)', border:'1px solid var(--vx-border)', color:'var(--vx-text)', padding:'8px 12px', borderRadius:'5px', fontSize:'13px', fontFamily:"'Barlow',sans-serif" };

// ─── Helper components ─────────────────────────────────────────
function Label({ children }) {
  return <div style={{ fontSize:'11px', fontWeight:600, color:'var(--vx-muted)', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'1px' }}>{children}</div>;
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
