// src/pages/Schedule.jsx
// ─────────────────────────────────────────────────────────────
// Scheduling canvas — rebuilt as React from the approved POC.
// Visual design, colour language, and interaction patterns match
// the client-approved HTML prototype exactly.
// Currently uses mock data. Phase 2 will wire to live Dataverse.
// ─────────────────────────────────────────────────────────────
import React, { useState, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';

// ─── Mock data (Phase 2: replace with Dataverse API calls) ────
const MOCK_JOBS = [
  { id:'VX-2841', client:'Thornton & Co',      loc:'Sheffield', days:2, quals:['NRSWA','CPCS'],  operatorId:null,   vehicleId:null,  startDay:null, isWhatIf:false },
  { id:'VX-2845', client:'NG Bailey',           loc:'Leeds',     days:3, quals:['NRSWA'],         operatorId:null,   vehicleId:null,  startDay:null, isWhatIf:false },
  { id:'VX-2847', client:'Amey Infrastructure', loc:'Doncaster', days:1, quals:['CPCS'],          operatorId:null,   vehicleId:null,  startDay:null, isWhatIf:false },
  { id:'VX-2832', client:'Balfour Beatty',      loc:'Wakefield', days:3, quals:['NRSWA'],         operatorId:'dave', vehicleId:'v07', startDay:0,    isWhatIf:false },
  { id:'VX-2836', client:'Morrison Utility',    loc:'Rotherham', days:4, quals:['NRSWA','EUSR'],  operatorId:'sarah',vehicleId:'v14', startDay:1,    isWhatIf:false },
  { id:'VX-2838', client:'Kier Group',          loc:'Sheffield', days:3, quals:['NRSWA'],         operatorId:'tom',  vehicleId:'v11', startDay:2,    isWhatIf:false },
  { id:'VX-2819', client:'VolkerWessels',       loc:'Barnsley',  days:2, quals:['CPCS'],          operatorId:'james',vehicleId:'v03', startDay:0,    isWhatIf:false, complete:true },
];

const MOCK_OPERATORS = [
  { id:'dave',  name:'Dave Okafor',  sub:'Plant Operator',  quals:['NRSWA','CPCS','S/NVQ2'], leave:[3,4] },
  { id:'sarah', name:'Sarah Mullen', sub:'Plant Operator',  quals:['NRSWA','EUSR'],          leave:[] },
  { id:'james', name:'James Hewitt', sub:'Plant Operator',  quals:['CPCS','NRSWA'],          leave:[] },
  { id:'tom',   name:'Tom Briggs',   sub:'Plant Operator',  quals:['NRSWA','S/NVQ2'],        leave:[] },
  { id:'kelly', name:'Kelly Marsh',  sub:'Senior Operator', quals:['NRSWA','CPCS','EUSR'],   leave:[0,1] },
];

const MOCK_VEHICLES = [
  { id:'v07', name:'Vehicle 07', sub:'8T Vac Unit',  workshop:[3,4] },
  { id:'v14', name:'Vehicle 14', sub:'32T Vac Unit', workshop:[] },
  { id:'v03', name:'Vehicle 03', sub:'12T Vac Unit', workshop:[] },
  { id:'v11', name:'Vehicle 11', sub:'8T Vac Unit',  workshop:[] },
  { id:'v22', name:'Vehicle 22', sub:'12T Vac Unit', workshop:[2] },
];

const MOCK_AI = {
  'VX-2841': { suggestions: [
    { name:'James Hewitt + Vehicle 03', vehicle:'Vehicle 03 — 12T Vac Unit', score:94,
      tags:['NRSWA ✓','CPCS ✓','7 mi away','Free Thu–Fri'], tt:['tq','tq','tl','tc'],
      reason:'James holds valid NRSWA and CPCS (exp. Mar 2027). Free from Thursday. Vehicle 03 finishes Barnsley Wednesday — 18 miles from Sheffield. Highest continuity match.',
      opId:'james', vehId:'v03', day:3, label:'James Hewitt + V03' },
    { name:'Tom Briggs + Vehicle 11', vehicle:'Vehicle 11 — 8T Vac Unit', score:71,
      tags:['NRSWA ✓','CPCS expired','22 mi away'], tt:['tq','tw','tl'],
      reason:'Tom meets NRSWA but CPCS expired Jan 2026. Booked on Kier job Wed–Fri — potential conflict Thursday.',
      opId:null, vehId:null, day:null, label:null },
  ]},
};

const WEEKS = [
  'Week 19 — 5–9 May 2026','Week 20 — 12–16 May 2026',
  'Week 21 — 19–23 May 2026','Week 22 — 26–30 May 2026',
  'Week 23 — 2–6 Jun 2026',
];
const DAYS  = ['Mon','Tue','Wed','Thu','Fri'];
const DATES = ['12 May','13 May','14 May','15 May','16 May'];

// ─── Helpers ──────────────────────────────────────────────────
function jobStatus(j) {
  if (j.complete)                          return 'complete';
  if (!j.operatorId && !j.vehicleId)       return 'unresourced';
  if (j.operatorId  && j.vehicleId)        return j.isWhatIf ? 'whatif' : 'booked';
  return 'partial';
}

// ─── Component ────────────────────────────────────────────────
export default function Schedule() {
  const { whatIfOn } = useOutletContext();

  const [jobs,      setJobs]      = useState(MOCK_JOBS.map(j => ({ ...j })));
  const [weekIdx,   setWeekIdx]   = useState(1);
  const [filter,    setFilter]    = useState('all');
  const [aiJob,     setAiJob]     = useState(null);
  const [toast,     setToast]     = useState(null);
  const [selectedId,setSelectedId]= useState(null);
  const toastTimer = useRef(null);

  // ── Toast ──
  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  // ── Drag ──
  const dragPayload = useRef(null);

  function onJobDragStart(e, job) {
    if (jobStatus(job) === 'booked' || jobStatus(job) === 'complete') return;
    dragPayload.current = { type:'job', job };
    e.dataTransfer.effectAllowed = 'move';
  }

  function onCellDrop(e, res, type, day) {
    e.preventDefault();
    if (!dragPayload.current) return;
    const { job } = dragPayload.current;
    dragPayload.current = null;
    assignResource(job, res, type, day);
  }

  function assignResource(job, res, type, day) {
    setJobs(prev => {
      const next = prev.map(j => j.id === job.id ? { ...j } : j);
      const target = next.find(j => j.id === job.id);

      if (type === 'operator') {
        for (let d = day; d < day + job.days && d < 5; d++) {
          if (res.leave.includes(d)) { showToast(`⚠ ${res.name} is on leave that day`); return prev; }
        }
        const clash = next.find(j => j.id !== job.id && j.operatorId === res.id && j.startDay !== null &&
          !(day + job.days - 1 < j.startDay || day > j.startDay + j.days - 1));
        if (clash) { showToast(`⚠ ${res.name} already on ${clash.id} those days`); return prev; }
        target.operatorId = res.id;
      } else {
        for (let d = day; d < day + job.days && d < 5; d++) {
          if (res.workshop.includes(d)) { showToast(`⚠ ${res.name} is in the workshop`); return prev; }
        }
        const clash = next.find(j => j.id !== job.id && j.vehicleId === res.id && j.startDay !== null &&
          !(day + job.days - 1 < j.startDay || day > j.startDay + j.days - 1));
        if (clash) { showToast(`⚠ ${res.name} already on ${clash.id} those days`); return prev; }
        target.vehicleId = res.id;
      }

      if (target.startDay === null) target.startDay = day;
      target.isWhatIf = whatIfOn;

      const st = jobStatus(target);
      if (st === 'booked' || st === 'whatif') {
        showToast(whatIfOn ? `⚡ What-If: ${job.id} fully assigned` : `✓ ${job.id} fully booked — operator + vehicle confirmed`);
      } else {
        showToast(`${type === 'operator' ? '👷' : '🚛'} ${res.name} → ${job.id} · Still needs a ${type === 'operator' ? 'vehicle' : 'operator'}`);
      }
      return next;
    });
  }

  function removeResource(jobId, type) {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      const next = { ...j };
      if (type === 'operator') { next.operatorId = null; showToast(`↩ Operator removed from ${jobId}`); }
      else                     { next.vehicleId  = null; showToast(`↩ Vehicle removed from ${jobId}`); }
      if (!next.operatorId && !next.vehicleId) { next.startDay = null; next.isWhatIf = false; }
      return next;
    }));
  }

  // ── Filtered resources ──
  const visibleOps  = filter === 'vehicles' ? [] : MOCK_OPERATORS;
  const visibleVehs = filter === 'operators' ? [] : MOCK_VEHICLES;
  const unresCount  = jobs.filter(j => { const s = jobStatus(j); return s !== 'booked' && s !== 'complete'; }).length;

  // ── Booked/whatif counts ──
  const booked   = jobs.filter(j => jobStatus(j) === 'booked').length;
  const whatif   = jobs.filter(j => jobStatus(j) === 'whatif').length;
  const unres    = jobs.filter(j => jobStatus(j) === 'unresourced').length;
  const onLeave  = MOCK_OPERATORS.reduce((a, o) => a + o.leave.length, 0);
  const workshop = MOCK_VEHICLES.reduce((a, v) => a + v.workshop.length, 0);

  const s = (obj) => Object.entries(obj).map(([k,v]) => `${k}:${v}`).join(';'); // inline style helper

  return (
    <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{ width:'248px', background:'var(--vx-dark)', borderRight:'1px solid var(--vx-border)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'10px 14px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--vx-yellow)', borderBottom:'1px solid var(--vx-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          Jobs — {WEEKS[weekIdx].split('—')[0].trim()}
          <span style={{ background:'var(--red)', color:'#fff', fontSize:'10px', fontWeight:700, padding:'2px 7px', borderRadius:'10px' }}>{unresCount}</span>
        </div>

        {/* Job list */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
          {jobs.map(job => {
            const st = jobStatus(job);
            const op = job.operatorId ? MOCK_OPERATORS.find(o => o.id === job.operatorId) : null;
            const vh = job.vehicleId  ? MOCK_VEHICLES.find(v => v.id  === job.vehicleId)  : null;
            const isSelected = selectedId === job.id;
            return (
              <div key={job.id}
                draggable={st !== 'booked' && st !== 'complete'}
                onDragStart={e => onJobDragStart(e, job)}
                onClick={() => setSelectedId(isSelected ? null : job.id)}
                style={{
                  background: isSelected ? 'rgba(245,200,0,.07)' : 'var(--vx-surface)',
                  border: `1px solid ${isSelected ? 'var(--vx-yellow)' : 'var(--vx-border)'}`,
                  borderLeft: `3px solid ${st==='unresourced'?'var(--red)':st==='partial'?'var(--amber)':st==='booked'||st==='whatif'?'var(--blue)':'var(--green)'}`,
                  borderRadius:'6px', padding:'10px 11px', marginBottom:'7px',
                  cursor: st==='booked'||st==='complete' ? 'default' : 'grab',
                  opacity: st==='booked'||st==='complete' ? .55 : 1,
                  position:'relative', userSelect:'none',
                }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:700, color:'var(--vx-yellow)', letterSpacing:'.5px' }}>{job.id}</div>
                <div style={{ fontSize:'12px', fontWeight:600, color:'var(--vx-text)', margin:'3px 0 2px' }}>{job.client}</div>
                <div style={{ fontSize:'11px', color:'var(--vx-muted)' }}>{job.loc} · {job.days}d</div>
                <div style={{ display:'flex', gap:'4px', marginTop:'5px', flexWrap:'wrap' }}>
                  {job.quals.map(q => (
                    <span key={q} style={{ fontSize:'9px', fontWeight:600, padding:'2px 6px', borderRadius:'3px', textTransform:'uppercase', letterSpacing:'.3px', background:'rgba(34,197,94,.15)', color:'var(--green-txt)', border:'1px solid rgba(34,197,94,.25)' }}>{q}</span>
                  ))}
                </div>
                {(op || vh || (!op && !vh && st !== 'complete')) && (
                  <div style={{ marginTop:'7px', display:'flex', flexDirection:'column', gap:'4px' }}>
                    {op ? <div style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'3px', background:'rgba(59,130,246,.16)', color:'var(--blue-txt)', border:'1px solid rgba(59,130,246,.25)' }}>👷 {op.name}</div>
                        : st !== 'complete' && <div style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'3px', background:'rgba(239,68,68,.12)', color:'var(--red-txt)', border:'1px solid rgba(239,68,68,.2)' }}>👷 Operator needed</div>}
                    {vh ? <div style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'3px', background:'rgba(168,85,247,.16)', color:'var(--purple-txt)', border:'1px solid rgba(168,85,247,.25)' }}>🚛 {vh.name}</div>
                        : st !== 'complete' && <div style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'3px', background:'rgba(239,68,68,.12)', color:'var(--red-txt)', border:'1px solid rgba(239,68,68,.2)' }}>🚛 Vehicle needed</div>}
                  </div>
                )}
                <span style={{ position:'absolute', top:'9px', right:'9px', fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'3px', textTransform:'uppercase', letterSpacing:'.5px',
                  background: st==='booked'||st==='whatif'?'var(--blue)':st==='complete'?'#166534':st==='partial'?'var(--amber)':'var(--red)',
                  color: st==='partial'?'#1a1a1a':'#fff' }}>
                  {st==='whatif'?'What-If':st.charAt(0).toUpperCase()+st.slice(1)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ padding:'12px 14px', borderTop:'1px solid var(--vx-border)' }}>
          <div style={{ fontSize:'10px', fontWeight:600, textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--vx-muted2)', marginBottom:'9px' }}>Status Key</div>
          {[
            { color:'var(--blue)',   label:'Operator row assigned' },
            { color:'var(--purple)', label:'Vehicle row assigned' },
            { color:'var(--amber)',  label:'What-If (speculative)' },
            { color:'var(--red)',    label:'Unresourced / missing' },
            { color:'#4B5563',       label:'On Leave' },
            { color:'#7C3AED',       label:'In Workshop' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'11px', color:'var(--vx-muted)', marginBottom:'6px' }}>
              <div style={{ width:'12px', height:'12px', borderRadius:'3px', background:color, flexShrink:0 }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Toolbar */}
        <div style={{ background:'var(--vx-dark)', padding:'8px 16px', borderBottom:'1px solid var(--vx-border)', display:'flex', alignItems:'center', gap:'14px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <button onClick={() => setWeekIdx(i => Math.max(0, i-1))} style={{ background:'var(--vx-surface)', border:'1px solid var(--vx-border)', color:'var(--vx-muted)', width:'28px', height:'28px', borderRadius:'4px', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:600, color:'var(--vx-text)', minWidth:'230px', textAlign:'center' }}>{WEEKS[weekIdx]}</span>
            <button onClick={() => setWeekIdx(i => Math.min(WEEKS.length-1, i+1))} style={{ background:'var(--vx-surface)', border:'1px solid var(--vx-border)', color:'var(--vx-muted)', width:'28px', height:'28px', borderRadius:'4px', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
            <button onClick={() => setWeekIdx(1)} style={{ background:'transparent', border:'1px solid var(--vx-border)', color:'var(--vx-muted)', padding:'5px 12px', fontSize:'12px', fontWeight:500, borderRadius:'4px', cursor:'pointer' }}>Today</button>
          </div>

          <div style={{ display:'flex', gap:'4px' }}>
            {['all','operators','vehicles'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ background: filter===f?'var(--vx-surface2)':'transparent', border:'1px solid', borderColor: filter===f?'var(--vx-yellow)':'var(--vx-border)', color: filter===f?'var(--vx-yellow)':'var(--vx-muted)', padding:'5px 12px', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', borderRadius:'3px', cursor:'pointer', fontFamily:"'Barlow',sans-serif" }}>
                {f}
              </button>
            ))}
          </div>

          {whatIfOn && (
            <div style={{ marginLeft:'auto', background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)', borderRadius:'4px', padding:'5px 12px', fontSize:'11px', color:'var(--amber-txt)' }}>
              ⚡ What-If mode active — assignments are speculative
            </div>
          )}
        </div>

        {/* Canvas */}
        <div style={{ flex:1, overflow:'auto' }}>
          <div style={{ minWidth:'960px' }}>

            {/* Day headers */}
            <div style={{ display:'grid', gridTemplateColumns:'200px repeat(5,1fr)', position:'sticky', top:0, zIndex:30, background:'var(--vx-dark)', borderBottom:'2px solid var(--vx-border)' }}>
              <div style={{ padding:'9px 10px' }} />
              {DAYS.map((d, i) => (
                <div key={d} style={{ padding:'9px 10px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'13px', fontWeight:600, textAlign:'center', letterSpacing:'.5px', borderLeft:'1px solid var(--vx-border)', color: i===0?'var(--vx-yellow)':'var(--vx-muted)', background: i===0?'rgba(245,200,0,.06)':'transparent' }}>
                  {d}
                  <div style={{ fontSize:'10px', fontWeight:400, fontFamily:"'Barlow',sans-serif", marginTop:'2px', color: i===0?'rgba(245,200,0,.65)':'var(--vx-muted2)' }}>{DATES[i]}</div>
                </div>
              ))}
            </div>

            {/* Operators group */}
            {filter !== 'vehicles' && (
              <>
                <ResourceGroupHeader label="Operators" count={visibleOps.length} />
                {visibleOps.map(op => (
                  <ResourceRow key={op.id} res={op} type="operator" jobs={jobs}
                    onDrop={onCellDrop} onRemove={removeResource}
                    onAI={setAiJob} selectedId={selectedId} />
                ))}
              </>
            )}

            {/* Vehicles group */}
            {filter !== 'operators' && (
              <>
                <ResourceGroupHeader label="Vehicles" count={visibleVehs.length} />
                {visibleVehs.map(veh => (
                  <ResourceRow key={veh.id} res={veh} type="vehicle" jobs={jobs}
                    onDrop={onCellDrop} onRemove={removeResource}
                    onAI={setAiJob} selectedId={selectedId} />
                ))}
              </>
            )}

          </div>
        </div>

        {/* Status bar */}
        <div style={{ background:'var(--vx-black)', borderTop:'1px solid var(--vx-border)', padding:'6px 16px', display:'flex', alignItems:'center', gap:'20px', flexShrink:0 }}>
          {[
            { color:'var(--blue)',   val:booked,   label:'Booked' },
            { color:'var(--amber)',  val:whatif,   label:'What-If' },
            { color:'var(--red)',    val:unres,    label:'Unresourced' },
            { color:'#4B5563',       val:onLeave,  label:'On leave (days)' },
            { color:'var(--purple)', val:workshop, label:'In workshop (days)' },
          ].map(({ color, val, label }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'var(--vx-muted)' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:color }} />
              <strong style={{ color:'var(--vx-text)', fontWeight:600 }}>{val}</strong> {label}
            </div>
          ))}
          <div style={{ marginLeft:'auto', fontSize:'10px', color:'var(--vx-yellow)', display:'flex', alignItems:'center', gap:'5px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'var(--vx-yellow)', animation:'pulse 2s infinite' }} />
            Mock data — Phase 2 connects to Dynamics
          </div>
        </div>
      </div>

      {/* ── AI Panel ── */}
      {aiJob && <AiPanel job={aiJob} onClose={() => setAiJob(null)} onAccept={(job, top) => {
        if (top.opId)  assignResource(job, MOCK_OPERATORS.find(o => o.id === top.opId),  'operator', top.day);
        if (top.vehId) assignResource(job, MOCK_VEHICLES.find(v => v.id  === top.vehId), 'vehicle',  top.day);
        setAiJob(null);
      }} />}

      {/* ── Overlay ── */}
      {aiJob && <div onClick={() => setAiJob(null)} style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,.3)' }} />}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position:'fixed', bottom:'36px', left:'50%', transform:'translateX(-50%)', background:'var(--vx-surface2)', border:'1px solid var(--vx-border)', borderLeft:'3px solid var(--vx-yellow)', color:'var(--vx-text)', padding:'10px 20px', borderRadius:'6px', fontSize:'13px', fontWeight:500, zIndex:1000, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Resource group header ─────────────────────────────────────
function ResourceGroupHeader({ label, count }) {
  return (
    <div style={{ gridColumn:'1/-1', background:'var(--vx-surface)', padding:'6px 16px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'11px', fontWeight:700, letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--vx-yellow)', borderTop:'2px solid var(--vx-border)', display:'flex', alignItems:'center', gap:'10px' }}>
      {label}
      <span style={{ fontFamily:"'Barlow',sans-serif", fontSize:'10px', fontWeight:500, color:'var(--vx-muted)', letterSpacing:0, textTransform:'none' }}>{count} {label.toLowerCase()}</span>
    </div>
  );
}

// ─── Resource row ──────────────────────────────────────────────
function ResourceRow({ res, type, jobs, onDrop, onRemove, onAI, selectedId }) {
  const [dragOver, setDragOver] = useState(null);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px repeat(5,1fr)', borderBottom:'1px solid var(--vx-border)', minHeight:'76px' }}>
      {/* Label */}
      <div style={{ padding:'8px 12px', display:'flex', flexDirection:'column', justifyContent:'center', borderRight:'1px solid var(--vx-border)', background:'var(--vx-dark)', position:'sticky', left:0, zIndex:10 }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'var(--vx-text)' }}>{res.name}</div>
        <div style={{ fontSize:'10px', color:'var(--vx-muted)', marginTop:'2px' }}>{res.sub}</div>
        {res.quals && (
          <div style={{ display:'flex', gap:'3px', marginTop:'5px', flexWrap:'wrap' }}>
            {res.quals.map(q => (
              <span key={q} style={{ fontSize:'8px', fontWeight:700, padding:'1px 5px', borderRadius:'2px', textTransform:'uppercase', letterSpacing:'.3px', background:'rgba(34,197,94,.1)', color:'var(--green-txt)', border:'1px solid rgba(34,197,94,.2)' }}>{q}</span>
            ))}
          </div>
        )}
      </div>

      {/* Day cells */}
      {[0,1,2,3,4].map(day => {
        const isLeave    = res.leave?.includes(day);
        const isWorkshop = res.workshop?.includes(day);
        const cellJobs   = jobs.filter(j => j.startDay !== null &&
          day >= j.startDay && day < j.startDay + j.days &&
          (type === 'operator' ? j.operatorId === res.id : j.vehicleId === res.id));
        const isDragOver = dragOver === day;

        return (
          <div key={day}
            onDragOver={e => { e.preventDefault(); setDragOver(day); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => { setDragOver(null); onDrop(e, res, type, day); }}
            style={{
              borderLeft: isDragOver ? `2px solid ${type==='operator'?'var(--blue)':'var(--purple)'}` : '1px solid var(--vx-border)',
              padding:'4px', position:'relative', minHeight:'76px',
              background: isDragOver ? `rgba(${type==='operator'?'59,130,246':'168,85,247'},.07)` : day===0 ? 'rgba(245,200,0,.025)' : 'transparent',
              transition:'background .1s',
            }}>

            {/* Leave block */}
            {isLeave && <Block label="Leave" style={{ background:'var(--grey-bg)', border:'1px solid var(--grey-bd)', color:'var(--grey-txt)', fontStyle:'italic' }} />}

            {/* Workshop block */}
            {isWorkshop && <Block label="Workshop" style={{ background:'var(--purple-bg)', border:'1px solid var(--purple-bd)', color:'var(--purple-txt)' }} />}

            {/* Job blocks */}
            {!isLeave && !isWorkshop && cellJobs.map(job => {
              const st = job.complete ? 'complete' : job.isWhatIf ? 'whatif' : 'booked';
              const isSelected = selectedId === job.id;
              const blockStyle = st === 'complete'
                ? { background:'var(--green-bg)', border:'1px solid var(--green-bd)', color:'var(--green-txt)' }
                : st === 'whatif'
                ? { background: type==='operator'?'var(--amber-bg)':'rgba(168,85,247,.1)', border:`1px dashed ${type==='operator'?'var(--amber-bd)':'var(--purple-bd)'}`, color: type==='operator'?'var(--amber-txt)':'var(--purple-txt)' }
                : { background: type==='operator'?'var(--blue-bg)':'var(--purple-bg)', border:`1px solid ${type==='operator'?'var(--blue-bd)':'var(--purple-bd)'}`, color: type==='operator'?'var(--blue-txt)':'var(--purple-txt)' };

              return (
                <div key={job.id} onClick={() => onAI(job)}
                  style={{ ...blockStyle, borderRadius:'4px', padding:'4px 8px', display:'flex', flexDirection:'column', justifyContent:'center', cursor:'pointer', position:'relative', minHeight:'32px', marginBottom:'3px',
                    outline: isSelected ? `2px solid ${type==='operator'?'var(--blue)':'var(--purple)'}` : 'none',
                    outlineOffset: isSelected ? '1px' : '0',
                    boxShadow: isSelected ? `0 0 0 4px rgba(${type==='operator'?'59,130,246':'168,85,247'},.18)` : 'none',
                  }}>
                  <div style={{ fontSize:'9px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', opacity:.7, marginBottom:'1px' }}>{st === 'whatif' ? 'What-If' : st}</div>
                  <div style={{ fontSize:'11px', fontWeight:600 }}>{job.client}</div>
                  <div style={{ fontSize:'9px', marginTop:'1px', opacity:.7 }}>{job.loc}</div>
                  <button onClick={e => { e.stopPropagation(); onRemove(job.id, type); }}
                    style={{ position:'absolute', top:'3px', right:'4px', background:'rgba(0,0,0,.45)', border:'none', color:'rgba(255,255,255,.5)', width:'15px', height:'15px', borderRadius:'2px', fontSize:'10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, padding:0 }}>
                    ×
                  </button>
                </div>
              );
            })}

            {/* Empty slot hints */}
            {!isLeave && !isWorkshop && cellJobs.length === 0 && (
              <div style={{ borderRadius:'4px', padding:'4px 8px', minHeight:'32px', display:'flex', alignItems:'center', justifyContent:'center', border:'1px dashed', borderColor: type==='operator'?'rgba(59,130,246,.25)':'rgba(168,85,247,.25)', fontSize:'10px', fontWeight:500, color: type==='operator'?'rgba(59,130,246,.45)':'rgba(168,85,247,.45)' }}>
                {type === 'operator' ? 'Drop operator' : 'Drop vehicle'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Block({ label, style }) {
  return (
    <div style={{ ...style, borderRadius:'4px', padding:'4px 8px', minHeight:'32px', display:'flex', alignItems:'center', fontSize:'11px', fontWeight:600, marginBottom:'3px' }}>
      {label}
    </div>
  );
}

// ─── AI Panel ─────────────────────────────────────────────────
function AiPanel({ job, onClose, onAccept }) {
  const data = MOCK_AI[job.id];
  const top  = data?.suggestions[0];

  return (
    <div style={{ position:'fixed', top:'52px', right:0, bottom:0, width:'330px', background:'var(--vx-dark)', borderLeft:'2px solid var(--vx-yellow)', display:'flex', flexDirection:'column', zIndex:200, boxShadow:'-8px 0 32px rgba(0,0,0,.5)' }}>
      <div style={{ background:'var(--vx-yellow)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--vx-black)' }}>AI Suggestion</span>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--vx-black)', fontSize:'20px', lineHeight:1, padding:0 }}>×</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        {/* Job card */}
        <div style={{ background:'var(--vx-surface)', border:'1px solid var(--vx-border)', borderRadius:'6px', padding:'12px 14px', marginBottom:'16px' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'14px', fontWeight:700, color:'var(--vx-yellow)', letterSpacing:'.5px' }}>{job.id}</div>
          <div style={{ fontSize:'14px', fontWeight:600, color:'#fff', margin:'4px 0' }}>{job.client}</div>
          <div style={{ fontSize:'12px', color:'var(--vx-muted)', lineHeight:1.6 }}>{job.loc} · {job.days} day{job.days>1?'s':''} · {job.quals.join(', ')}</div>
        </div>

        {data ? (
          <>
            <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'var(--vx-muted2)', marginBottom:'10px' }}>Top Recommendation</div>
            {data.suggestions.map((sug, i) => (
              <div key={i} style={{ background:'var(--vx-surface)', border:`1px solid ${i===0?'rgba(245,200,0,.4)':'var(--vx-border)'}`, borderRadius:'6px', padding:'12px 13px', marginBottom:'10px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'3px' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#fff' }}>{sug.name}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'22px', fontWeight:700, color:'var(--vx-yellow)', lineHeight:1 }}>{sug.score}%</div>
                </div>
                <div style={{ fontSize:'11px', color:'var(--vx-muted)', marginBottom:'8px' }}>{sug.vehicle}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', marginBottom:'8px' }}>
                  {sug.tags.map((tag, ti) => (
                    <span key={ti} style={{ fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'3px', textTransform:'uppercase', letterSpacing:'.3px',
                      background: sug.tt[ti]==='tq'?'rgba(34,197,94,.15)':sug.tt[ti]==='tl'?'rgba(59,130,246,.15)':sug.tt[ti]==='tc'?'rgba(245,200,0,.15)':'rgba(239,68,68,.15)',
                      color: sug.tt[ti]==='tq'?'var(--green-txt)':sug.tt[ti]==='tl'?'var(--blue-txt)':sug.tt[ti]==='tc'?'var(--vx-yellow)':'var(--red-txt)',
                      border: `1px solid ${sug.tt[ti]==='tq'?'rgba(34,197,94,.25)':sug.tt[ti]==='tl'?'rgba(59,130,246,.25)':sug.tt[ti]==='tc'?'rgba(245,200,0,.25)':'rgba(239,68,68,.25)'}`,
                    }}>{tag}</span>
                  ))}
                </div>
                <div style={{ fontSize:'11px', color:'#bbb', lineHeight:1.55, fontStyle:'italic', borderTop:'1px solid var(--vx-border)', paddingTop:'8px' }}>{sug.reason}</div>
                {i === 0 && sug.label && (
                  <div style={{ marginTop:'10px', marginBottom:'-4px' }}>
                    <button onClick={() => onAccept(job, sug)} style={{ fontSize:'10px', fontWeight:600, padding:'4px 10px', borderRadius:'3px', background:'rgba(245,200,0,.15)', border:'1px solid rgba(245,200,0,.3)', color:'var(--vx-yellow)', cursor:'pointer' }}>
                      Quick accept — {sug.label}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {i > 0 && <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'var(--vx-muted2)', margin:'16px 0 10px' }}>Alternatives</div>}
          </>
        ) : (
          <p style={{ color:'var(--vx-muted)', fontSize:'12px', lineHeight:1.6 }}>No AI suggestions available for this job.</p>
        )}
      </div>

      {top?.label && (
        <div style={{ padding:'14px 16px', borderTop:'1px solid var(--vx-border)', flexShrink:0 }}>
          <button onClick={() => onAccept(job, top)} style={{ width:'100%', background:'var(--vx-yellow)', border:'none', color:'var(--vx-black)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:'15px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', padding:'11px', borderRadius:'5px', cursor:'pointer', marginBottom:'8px', display:'block' }}>
            Accept — {top.label}
          </button>
          <button onClick={onClose} style={{ width:'100%', background:'transparent', border:'1px solid var(--vx-border)', color:'var(--vx-muted)', fontFamily:"'Barlow',sans-serif", fontSize:'12px', fontWeight:500, padding:'9px', borderRadius:'5px', cursor:'pointer', display:'block' }}>
            Assign Manually
          </button>
        </div>
      )}
    </div>
  );
}
