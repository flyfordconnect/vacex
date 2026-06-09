// src/hooks/useGroups.js
// ─────────────────────────────────────────────────────────────
// Checks the logged-in user's Microsoft 365 group memberships
// via the Graph API in a single call. Returns boolean flags
// for each Resourcify security group.
// All access control decisions in the app derive from this hook.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import {
  OPERATIONS_GROUP_ID,
  LEAVE_ADMIN_OPERATORS_GROUP_ID,
  LEAVE_ADMIN_ALL_STAFF_GROUP_ID,
} from '../authConfig';

export function useGroups() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const [groups,  setGroups]  = useState(null); // null = loading
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!account) return;

    async function checkGroups() {
      try {
        const tokenResponse = await instance.acquireTokenSilent({
          scopes: ['https://graph.microsoft.com/GroupMember.Read.All'],
          account,
        });

        const res = await fetch(
          'https://graph.microsoft.com/v1.0/me/memberOf?$select=id',
          { headers: { Authorization: `Bearer ${tokenResponse.accessToken}` } }
        );

        if (!res.ok) throw new Error(`Graph API error: ${res.status}`);

        const data = await res.json();
        const memberIds = new Set((data.value ?? []).map(g => g.id));

        setGroups({
          isOperations:         memberIds.has(OPERATIONS_GROUP_ID),
          isLeaveAdminOperators:memberIds.has(LEAVE_ADMIN_OPERATORS_GROUP_ID),
          isLeaveAdminAllStaff: memberIds.has(LEAVE_ADMIN_ALL_STAFF_GROUP_ID),
          // Convenience flags
          canAccessSchedule:    memberIds.has(OPERATIONS_GROUP_ID),
          canAccessAvailability:memberIds.has(OPERATIONS_GROUP_ID) ||
                                memberIds.has(LEAVE_ADMIN_OPERATORS_GROUP_ID) ||
                                memberIds.has(LEAVE_ADMIN_ALL_STAFF_GROUP_ID),
          canSeeAllStaff:       memberIds.has(LEAVE_ADMIN_ALL_STAFF_GROUP_ID),
          canElevateOperators:  memberIds.has(LEAVE_ADMIN_OPERATORS_GROUP_ID) ||
                                memberIds.has(LEAVE_ADMIN_ALL_STAFF_GROUP_ID),
          canElevateAllStaff:   memberIds.has(LEAVE_ADMIN_ALL_STAFF_GROUP_ID),
        });
      } catch (err) {
        setError(err.message);
        // Fail safe — no access on error
        setGroups({
          isOperations: false, isLeaveAdminOperators: false, isLeaveAdminAllStaff: false,
          canAccessSchedule: false, canAccessAvailability: false,
          canSeeAllStaff: false, canElevateOperators: false, canElevateAllStaff: false,
        });
      }
    }

    checkGroups();
  }, [instance, account]);

  return { groups, groupsLoading: groups === null, groupsError: error };
}
