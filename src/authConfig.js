// src/authConfig.js
// ─────────────────────────────────────────────────────────────
// MSAL configuration for Vac-Ex Microsoft 365 tenant.
// Replace the placeholder values with your actual App Registration
// details before deploying.
// ─────────────────────────────────────────────────────────────

export const msalConfig = {
  auth: {
    // Your App Registration Client ID (from Azure portal)
    clientId: 'a4efba87-cf64-4dc1-adc8-5c46f6eafd61',
    // Your Vac-Ex tenant ID
    authority: 'https://login.microsoftonline.com/14556a49-f8ea-419b-a7df-989680ae75a2',
    // Must match a Redirect URI registered in your App Registration
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',   // sessionStorage — clears on tab close
    storeAuthStateInCookie: false,
  },
};

// Scopes requested on login — Dynamics + Graph for group membership check
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

// Scopes for Microsoft Graph API calls (security group check)
export const graphRequest = {
  scopes: ['https://graph.microsoft.com/GroupMember.Read.All'],
};

// Your Dataverse environment URL (Sandbox for development)
export const DATAVERSE_URL = 'https://vacex-sandbox.crm11.dynamics.com';

// Resourcify - Leave Administrators security group Object ID
export const LEAVE_ADMIN_GROUP_ID = '4450fab5-d2ed-4d38-af57-614c4296f973';
