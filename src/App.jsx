// src/App.jsx
// ─────────────────────────────────────────────────────────────
// Root component. Sets up routing and enforces authentication
// on every route. Unauthenticated users are redirected to
// Microsoft login — no app content is ever rendered without
// a valid Vac-Ex M365 session.
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from './authConfig';

import Layout from './components/Layout';
import Schedule from './pages/Schedule';
import Availability from './pages/Availability';
import MyLeave from './pages/MyLeave';
import LoadingScreen from './components/LoadingScreen';

// ─── Auth guard ───────────────────────────────────────────────
// Wraps every route. If the user is not authenticated, triggers
// the Microsoft login redirect. Shows a loading screen while
// MSAL is initialising to prevent a flash of unauthenticated UI.
function RequireAuth({ children }) {
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  if (inProgress === InteractionStatus.Startup ||
      inProgress === InteractionStatus.HandleRedirect) {
    return <LoadingScreen message="Signing you in…" />;
  }

  if (!isAuthenticated) {
    // Trigger redirect to Microsoft login
    instance.loginRedirect(loginRequest).catch(console.error);
    return <LoadingScreen message="Redirecting to Microsoft login…" />;
  }

  return children;
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <RequireAuth>
        <Routes>
          {/* Default route redirects to schedule */}
          <Route path="/" element={<Navigate to="/schedule" replace />} />

          {/* All routes share the same Layout (header + nav) */}
          <Route element={<Layout />}>
            <Route path="/schedule"     element={<Schedule />} />
            <Route path="/availability" element={<Availability />} />
            <Route path="/myLeave"      element={<MyLeave />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </RequireAuth>
    </BrowserRouter>
  );
}
