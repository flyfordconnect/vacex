// src/authConfig.js
// ─────────────────────────────────────────────────────────────
// MSAL configuration for Vac-Ex Microsoft 365 tenant.
// ─────────────────────────────────────────────────────────────

export const msalConfig = {
  auth: {
    clientId: 'a4efba87-cf64-4dc1-adc8-5c46f6eafd61',
    authority: 'https://login.microsoftonline.com/14556a49-f8ea-419b-a7df-989680ae75a2',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

// Scopes requested on login
export const loginRequest = {
  scopes: [
    'User.Read',
    'https://vacex-sandbox.crm11.dynamics.com/user_impersonation',
  ],
};

// Scopes for Dataverse API calls
export const dataverseRequest = (orgUrl) => ({
  scopes: [`${orgUrl}/user_impersonation`],
});

// Scopes for Microsoft Graph API calls (group membership checks)
export const graphRequest = {
  scopes: ['https://graph.microsoft.com/GroupMember.Read.All'],
};

// Dataverse Sandbox environment URL
export const DATAVERSE_URL = 'https://vacex-sandbox.crm11.dynamics.com';

// ─── Security Groups ──────────────────────────────────────────
// Access to /schedule and /availability — operators only view
export const OPERATIONS_GROUP_ID = 'db82586d-682a-4de0-97dc-c7cdad9ebf2a';

// Elevated add/cancel leave for operators on /availability
export const LEAVE_ADMIN_OPERATORS_GROUP_ID = '4450fab5-d2ed-4d38-af57-614c4296f973';

// Access to /availability — all staff visible, elevated add/cancel for everyone
export const LEAVE_ADMIN_ALL_STAFF_GROUP_ID = 'a875edd3-1eac-4bd3-9f40-a15b30d54b2b';
