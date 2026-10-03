import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './components/ui/Toast.js';
import { Layout, RequireAuth, RequireRole } from './components/layout/Layout.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { TraineePage } from './pages/trainee/TraineePage.js';
import { InstructorDashboard } from './pages/instructor/InstructorDashboard.js';
import { ControlRoom } from './pages/instructor/ControlRoom.js';
import { AARView } from './pages/instructor/AARView.js';
import { ScenarioEditor } from './pages/admin/ScenarioEditor.js';
import { AdminOverview } from './pages/admin/AdminOverview.js';
import { AdminUsers } from './pages/admin/AdminUsers.js';
import { AdminExercises } from './pages/admin/AdminExercises.js';
import { AdminAudit } from './pages/admin/AdminAudit.js';
import { AdminSettings } from './pages/admin/AdminSettings.js';

const RoleBasedHome: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'INSTRUCTOR') return <Navigate to="/instructor" replace />;
  return <Navigate to="/play" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Auth */}
            <Route path="/login" element={<LoginPage />} />

            {/* Application shell */}
            <Route path="/" element={<Layout />}>
              <Route index element={<RoleBasedHome />} />

              {/* Trainee routes */}
              <Route
                path="play"
                element={
                  <RequireAuth>
                    <TraineePage />
                  </RequireAuth>
                }
              />

              {/* Instructor routes */}
              <Route
                path="instructor"
                element={
                  <RequireAuth>
                    <RequireRole allowedRoles={['INSTRUCTOR', 'ADMIN']}>
                      <InstructorDashboard />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="instructor/exercises/:id"
                element={
                  <RequireAuth>
                    <RequireRole allowedRoles={['INSTRUCTOR', 'ADMIN']}>
                      <ControlRoom />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="instructor/exercises/:id/aar"
                element={
                  <RequireAuth>
                    <RequireRole allowedRoles={['INSTRUCTOR', 'ADMIN']}>
                      <AARView />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="instructor/scenarios"
                element={
                  <RequireAuth>
                    <RequireRole allowedRoles={['INSTRUCTOR', 'ADMIN']}>
                      <ScenarioEditor />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              {/* Admin routes */}
              <Route
                path="admin"
                element={
                  <RequireAuth>
                    <RequireRole allowedRoles={['ADMIN']}>
                      <AdminOverview />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="admin/users"
                element={
                  <RequireAuth>
                    <RequireRole allowedRoles={['ADMIN']}>
                      <AdminUsers />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="admin/scenarios"
                element={
                  <RequireAuth>
                    <RequireRole allowedRoles={['ADMIN', 'INSTRUCTOR']}>
                      <ScenarioEditor />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="admin/exercises"
                element={
                  <RequireAuth>
                    <RequireRole allowedRoles={['ADMIN']}>
                      <AdminExercises />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="admin/audit"
                element={
                  <RequireAuth>
                    <RequireRole allowedRoles={['ADMIN']}>
                      <AdminAudit />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="admin/settings"
                element={
                  <RequireAuth>
                    <RequireRole allowedRoles={['ADMIN']}>
                      <AdminSettings />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
