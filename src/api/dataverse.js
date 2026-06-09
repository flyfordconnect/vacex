// src/api/dataverse.js
// ─────────────────────────────────────────────────────────────
// Dataverse Web API client.
// All functions accept `callDataverse` from useDataverse hook.
// Token acquisition and refresh handled by MSAL automatically.
// ─────────────────────────────────────────────────────────────
import { DATAVERSE_URL } from '../authConfig';

const API_BASE = `${DATAVERSE_URL}/api/data/v9.2`;

// ─── Core fetch wrapper ───────────────────────────────────────
export async function dvFetch(token, path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Prefer': 'odata.include-annotations="*"',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || `Dataverse error: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

// ─── Leave Entitlements ───────────────────────────────────────
export async function fetchLeaveEntitlements(callDataverse, userEmail, leaveYear) {
  const filter = `cr1d8_employeeemail eq '${userEmail}' and cr1d8_leaveyear eq ${leaveYear}`;
  const select = 'cr1d8_leaveentitlementid,cr1d8_Newcolumn,cr1d8_leavetype,cr1d8_annualallowance,cr1d8_daystaken,cr1d8_daysremaining,cr1d8_carryover,cr1d8_manageremail,cr1d8_leaveyear';
  const data = await callDataverse(`/cr1d8_leaveentitlements?$filter=${encodeURIComponent(filter)}&$select=${select}`);
  return data?.value ?? [];
}

// ─── Leave Requests ───────────────────────────────────────────
export async function fetchLeaveRequests(callDataverse, userEmail) {
  const filter  = `cr1d8_employeeemail eq '${userEmail}'`;
  const select  = 'cr1d8_leaverequestid,cr1d8_Newcolumn,cr1d8_startdate,cr1d8_enddate,cr1d8_daysrequested,cr1d8_leavetype,cr1d8_status,cr1d8_employeenotes,cr1d8_declinereason,cr1d8_decidedon,cr1d8_outlookeventid';
  const orderby = 'cr1d8_startdate desc';
  const data = await callDataverse(`/cr1d8_leaverequests?$filter=${encodeURIComponent(filter)}&$select=${select}&$orderby=${orderby}`);
  return data?.value ?? [];
}

// ─── Submit Leave Request ─────────────────────────────────────
export async function submitLeaveRequest(callDataverse, payload) {
  return callDataverse('/cr1d8_leaverequests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Cancel Leave Request ─────────────────────────────────────
export async function cancelLeaveRequest(callDataverse, requestId) {
  return callDataverse(`/cr1d8_leaverequests(${requestId})`, {
    method: 'PATCH',
    body: JSON.stringify({ cr1d8_status: 654460003 }),
  });
}

// ─── Constants ────────────────────────────────────────────────
export const LEAVE_TYPES = {
  654460000: 'Annual Leave',
  654460001: 'Sick',
  654460002: 'Compassionate Leave',
  654460003: 'Reservist Leave',
  654460004: 'Unpaid Leave',
  654460005: 'Parental Leave',
};

export const LEAVE_STATUS = {
  654460000: 'Pending',
  654460001: 'Approved',
  654460002: 'Declined',
  654460003: 'Cancelled',
};

export const LEAVE_STATUS_COLOURS = {
  Pending:   { bg:'rgba(245,158,11,.2)',  border:'rgba(245,158,11,.4)',  text:'#fcd34d' },
  Approved:  { bg:'rgba(34,197,94,.2)',   border:'rgba(34,197,94,.4)',   text:'#86efac' },
  Declined:  { bg:'rgba(239,68,68,.2)',   border:'rgba(239,68,68,.4)',   text:'#fca5a5' },
  Cancelled: { bg:'rgba(107,114,128,.2)', border:'rgba(107,114,128,.4)', text:'#9ca3af' },
};

// Leave year: April to April
export function currentLeaveYear() {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

// Days between two dates inclusive (matches Canvas App DateDiff + 1)
export function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

// Format date for display
export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day:'2-digit', month:'short', year:'numeric'
  });
}
