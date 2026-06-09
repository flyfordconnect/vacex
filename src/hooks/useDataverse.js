// src/hooks/useDataverse.js
// ─────────────────────────────────────────────────────────────
// Custom hook that acquires an MSAL access token scoped to
// Dataverse and returns a ready-to-use authenticated fetch
// function. Handles token refresh automatically via MSAL.
// ─────────────────────────────────────────────────────────────
import { useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { dataverseRequest, DATAVERSE_URL } from '../authConfig';
import { dvFetch } from '../api/dataverse';

export function useDataverse() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  // Returns an authenticated dvFetch function — pass this as
  // the first argument to all API functions in dataverse.js
  const callDataverse = useCallback(async (path, options = {}) => {
    if (!account) throw new Error('No authenticated account');
    const tokenResponse = await instance.acquireTokenSilent({
      ...dataverseRequest(DATAVERSE_URL),
      account,
    });
    return dvFetch(tokenResponse.accessToken, path, options);
  }, [instance, account]);

  const userEmail = account?.username?.toLowerCase() ?? '';
  const userName  = account?.name ?? '';

  return { callDataverse, userEmail, userName };
}
