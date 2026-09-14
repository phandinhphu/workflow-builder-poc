import { useCallback, useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import WorkflowList from './pages/WorkflowList';
import WorkflowBuilder from './pages/WorkflowBuilder';
import WorkflowDetail from './pages/WorkflowDetail';
import FormList from './pages/FormList';
import FormBuilder from './pages/FormBuilder';
import CategoryList from './pages/CategoryList';
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
import TicketHub from './pages/TicketHub';
import CreateTicketPage from './pages/CreateTicketPage';
import TicketDetailPage from './pages/TicketDetail';
import ProtectedRoute from './components/auth/ProtectedRoute';
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
      { path: '/', element: <Navigate to="/tickets" replace /> },
      { path: '/tickets', element: <TicketHub /> },
      { path: '/tickets/new/:categoryId', element: <CreateTicketPage /> },
      { path: '/tickets/:id', element: <TicketDetailPage /> },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute permission="INSTANCE_VIEW">
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/workflows',
        element: (
          <ProtectedRoute permissions={['WORKFLOW_VIEW', 'WORKFLOW_EDIT']}>
            <WorkflowList />
          </ProtectedRoute>
        ),
      },
      {
        path: '/forms',
        element: (
          <ProtectedRoute permissions={['FORM_VIEW', 'FORM_EDIT']}>
            <FormList />
          </ProtectedRoute>
        ),
      },
      {
        path: '/forms/:id/builder',
        element: (
          <ProtectedRoute permissions={['FORM_EDIT', 'WORKFLOW_EDIT']}>
            <FormBuilder />
          </ProtectedRoute>
        ),
      },
      {
        path: '/categories',
        element: (
          <ProtectedRoute permissions={['CATEGORY_MANAGE']}>
            <CategoryList />
          </ProtectedRoute>
        ),
      },
      {
        path: '/workflows/new',
        element: (
          <ProtectedRoute permissions={['WORKFLOW_CREATE', 'WORKFLOW_EDIT']}>
            <WorkflowBuilder />
          </ProtectedRoute>
        ),
      },
      {
        path: '/workflows/new/designer',
        element: (
          <ProtectedRoute permissions={['WORKFLOW_CREATE', 'WORKFLOW_EDIT']}>
            <WorkflowBuilder />
          </ProtectedRoute>
        ),
      },
      {
        path: '/workflows/:id',
        element: (
          <ProtectedRoute permissions={['WORKFLOW_VIEW', 'WORKFLOW_EDIT']}>
            <WorkflowDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: '/workflows/:id/history',
        element: (
          <ProtectedRoute permissions={['WORKFLOW_VIEW', 'WORKFLOW_EDIT']}>
            <WorkflowDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: '/workflows/:id/runtime',
        element: (
          <ProtectedRoute permission="INSTANCE_VIEW">
            <InstancesList />
          </ProtectedRoute>
        ),
      },
      {
        path: '/workflows/:id/instances',
        element: (
          <ProtectedRoute permission="INSTANCE_VIEW">
            <InstancesList />
          </ProtectedRoute>
        ),
      },
      {
        path: '/workflows/:id/designer',
        element: (
          <ProtectedRoute permissions={['WORKFLOW_EDIT']}>
            <WorkflowBuilder />
          </ProtectedRoute>
        ),
      },
      {
        path: '/workflows/:workflowId/instances/:instanceId',
        element: (
          <ProtectedRoute permission="INSTANCE_VIEW">
            <InstanceDetail />
          </ProtectedRoute>
        ),
      },
      { path: '/my-tasks', element: <MyTasksPage /> },
      {
        path: '/connectors',
        element: (
          <ProtectedRoute permission="CONNECTOR_MANAGE">
            <ConnectorManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/users',
        element: (
          <ProtectedRoute permissions={['USER_VIEW', 'USER_MANAGE']}>
            <UsersList />
          </ProtectedRoute>
        ),
      },
      {
        path: '/sync',
        element: (
          <ProtectedRoute permissions={['ORG_VIEW', 'ORG_MANAGE']}>
            <OrganizationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/settings',
        element: (
          <ProtectedRoute permission="ROLE_MANAGE">
            <RolesPage />
          </ProtectedRoute>
        ),
      },
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
    if (!localStorage.getItem('workflow.authToken') && !(import.meta.env.DEV && import.meta.env.VITE_ALLOW_DEV_USER_HEADER === 'true')) {
      setState('unauthenticated');
      return;
    }
    try {
      // Load current user profile & permissions first
      await loadCurrentUser();

      // Fetch background data resilience-wrapped
      const [usersRes, workflowsRes, instancesRes] = await Promise.allSettled([
        api.users.list(),
        api.workflows.list(),
        api.runtime.instances(),
      ]);
      const users = usersRes.status === 'fulfilled' ? usersRes.value : [];
      const workflowSummaries = workflowsRes.status === 'fulfilled' ? workflowsRes.value : [];
      const workflowInstances = instancesRes.status === 'fulfilled' ? instancesRes.value : [];

      const workflowDefsRes = await Promise.allSettled(workflowSummaries.map((w) => api.workflows.get(w.id)));
      const workflowDefinitions = workflowDefsRes
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter((w): w is NonNullable<typeof w> => w !== null);

      replaceBackendData({ users, workflowDefinitions, workflowInstances });
      setState('ready');
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        localStorage.removeItem('workflow.authToken');
        setState('unauthenticated');
        return;
      }
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
