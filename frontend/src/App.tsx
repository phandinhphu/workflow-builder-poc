import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import WorkflowList from './pages/WorkflowList';
import WorkflowBuilder from './pages/WorkflowBuilder';
import WorkflowDetail from './pages/WorkflowDetail';
import InstancesList from './pages/InstancesList';
import InstanceDetail from './pages/InstanceDetail';
import UsersList from './pages/UsersList';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-gray-500">
      <p className="text-sm mb-4">{title} — màn hình sẽ được triển khai ở giai đoạn tiếp theo.</p>
    </div>
  );
}

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
      { path: '/', element: <Navigate to="/workflows" replace /> },
      { path: '/dashboard', element: <PlaceholderPage title="Dashboard" /> },
      { path: '/workflows', element: <WorkflowList /> },
      { path: '/workflows/new', element: <WorkflowBuilder /> },
      { path: '/workflows/new/designer', element: <WorkflowBuilder /> },
      { path: '/workflows/:id', element: <WorkflowDetail /> },
      { path: '/workflows/:id/history', element: <WorkflowDetail /> },
      { path: '/workflows/:id/runtime', element: <InstancesList /> },
      { path: '/workflows/:id/designer', element: <WorkflowBuilder /> },
      { path: '/workflows/:workflowId/instances/:instanceId', element: <InstanceDetail /> },
      { path: '/users', element: <UsersList /> },
      { path: '/sync', element: <PlaceholderPage title="Đồng bộ dữ liệu" /> },
      { path: '/settings', element: <PlaceholderPage title="Cài đặt" /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;