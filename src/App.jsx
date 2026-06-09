// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from './authConfig';
import { useGroups } from './hooks/useGroups';

import Layout    from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import AccessDenied  from './components/AccessDenied';
import Home         from './pages/Home';
import Schedule     from './pages/Schedule';
import Availability from './pages/Availability';
import MyLeave      from './pages/MyLeave';

// ─── Auth guard ───────────────────────────────────────────────
function RequireAuth({ children }) {
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  if (inProgress === InteractionStatus.Startup ||
      inProgress === InteractionStatus.HandleRedirect) {
    return <LoadingScreen message="Signing you in…" />;
  }

  if (!isAuthenticated) {
    instance.loginRedirect(loginRequest).catch(console.error);
    return <LoadingScreen message="Redirecting to Microsoft login…" />;
  }

  return children;
}

// ─── Route guard — checks group membership ────────────────────
function RequireGroup({ canAccess, children }) {
  const { groups, groupsLoading } = useGroups();
  if (groupsLoading) return <LoadingScreen message="Checking access…" />;
  if (!canAccess(groups)) return <AccessDenied />;
  return children;
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <RequireAuth>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/"            element={<Home />} />
            <Route path="/myLeave"     element={<MyLeave />} />

            <Route path="/schedule" element={
              <RequireGroup canAccess={g => g?.canAccessSchedule}>
                <Schedule />
              </RequireGroup>
            } />

            <Route path="/availability" element={
              <RequireGroup canAccess={g => g?.canAccessAvailability}>
                <Availability />
              </RequireGroup>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </RequireAuth>
    </BrowserRouter>
  );
}
