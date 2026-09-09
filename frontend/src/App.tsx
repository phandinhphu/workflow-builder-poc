import { useCallback, useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import WorkflowList from './pages/WorkflowList';
import WorkflowBuilder from './pages/WorkflowBuilder';
import WorkflowDetail from './pages/WorkflowDetail';
import InstancesList from './pages/InstancesList';
import InstanceDetail from './pages/InstanceDetail';
import UsersList from './pages/UsersList';
import MyTasksPage from './pages/MyTasks';
import ConnectorManagementPage from './pages/ConnectorManagement';
import Dashboard from './pages/Dashboard';
import OrganizationsPage from './pages/OrganizationsPage';
import RolesPage from './pages/RolesPage';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { api } from './api/client';
import { ApiError } from './api/client';
import { replaceBackendData } from './data/mockData';
import LoginPage from './pages/LoginPage';
import ServiceCatalog from './pages/ServiceCatalog';
import { useAuthStore } from './stores/authStore';
import { useNotificationStore } from './stores/notificationStore';

function AppLayout() {
  return (
    <div className="flex h-screen bg-page overflow-hidden font-sans text-navy">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/catalog" replace /> },
      { path: '/catalog', element: <ServiceCatalog /> },
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/workflows', element: <WorkflowList /> },
      { path: '/workflows/new', element: <WorkflowBuilder /> },
      { path: '/workflows/new/designer', element: <WorkflowBuilder /> },
      { path: '/workflows/:id', element: <WorkflowDetail /> },
      { path: '/workflows/:id/history', element: <WorkflowDetail /> },
      { path: '/workflows/:id/runtime', element: <InstancesList /> },
      { path: '/workflows/:id/designer', element: <WorkflowBuilder /> },
      { path: '/workflows/:workflowId/instances/:instanceId', element: <InstanceDetail /> },
      { path: '/my-tasks', element: <MyTasksPage /> },
      { path: '/connectors', element: <ConnectorManagementPage /> },
      { path: '/users', element: <UsersList /> },
      { path: '/sync', element: <OrganizationsPage /> },
      { path: '/settings', element: <RolesPage /> },
    ],
  },
]);

function App() {
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'unauthenticated'>('loading');
  const [error, setError] = useState('');
  const { loadCurrentUser } = useAuthStore();
  const { startPolling, stopPolling } = useNotificationStore();

  const bootstrap = useCallback(async () => {
    setState('loading');
    if (!localStorage.getItem('workflow.authToken') && !(import.meta.env.DEV && import.meta.env.VITE_ALLOW_DEV_USER_HEADER === 'true')) { setState('unauthenticated'); return; }
    try {
      const [users, workflowSummaries, workflowInstances] = await Promise.all([
        api.users.list(),
        api.workflows.list(),
        api.runtime.instances(),
      ]);
      const workflowDefinitions = await Promise.all(workflowSummaries.map(workflow => api.workflows.get(workflow.id)));
      replaceBackendData({ users, workflowDefinitions, workflowInstances });
      // Load current user profile from /auth/me
      await loadCurrentUser();
      setState('ready');
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) { localStorage.removeItem('workflow.authToken'); setState('unauthenticated'); return; }
      setError(cause instanceof Error ? cause.message : 'Không thể kết nối backend');
      setState('error');
    }
  }, [loadCurrentUser]);

  // Start/stop notification polling based on auth state
  useEffect(() => {
    if (state === 'ready') {
      startPolling();
    } else {
      stopPolling();
    }
    return () => {
      // No-op: polling is managed by state transitions
    };
  }, [state, startPolling, stopPolling]);

  useEffect(() => { void bootstrap(); }, [bootstrap]);

  if (state === 'loading') return <div className="h-screen grid place-items-center text-sm text-gray-500">Đang tải dữ liệu HRM và workflow từ backend…</div>;
  if (state === 'unauthenticated') return <LoginPage onAuthenticated={() => void bootstrap()} />;
  if (state === 'error') return (
    <div className="h-screen grid place-items-center bg-gray-50">
      <div className="bg-white border rounded-xl p-6 max-w-lg text-center shadow-sm">
        <h1 className="font-bold text-red-700">Không kết nối được backend</h1>
        <p className="text-sm text-gray-600 mt-2">{error}</p>
        <p className="text-xs text-gray-500 mt-2">Hãy chạy MySQL và Spring Boot ở cổng 8080.</p>
        <button onClick={() => void bootstrap()} className="mt-4 px-4 py-2 bg-primary text-white rounded-md text-sm">Thử lại</button>
      </div>
    </div>
  );
  return <RouterProvider router={router} />;
}

export default App;
