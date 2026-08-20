import { useState } from 'react';
import { api } from '../api/client';

export default function LoginPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const session = await api.auth.login(username, password);
      localStorage.setItem('workflow.authToken', session.token);
      localStorage.setItem('workflow.currentUserId', session.userId);
      localStorage.setItem('workflow.authExpiresAt', session.expiresAt);
      onAuthenticated();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Đăng nhập thất bại'); }
    finally { setLoading(false); }
  };
  return <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
    <form onSubmit={submit} className="w-full max-w-sm rounded-xl border bg-white p-7 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Workflow Builder</h1>
      <p className="mt-1 text-sm text-slate-500">Đăng nhập bằng tài khoản HRM nội bộ</p>
      <label className="mt-6 block text-sm font-medium">Tên đăng nhập</label>
      <input autoFocus autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
      <label className="mt-4 block text-sm font-medium">Mật khẩu</label>
      <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="mt-5 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form>
  </div>;
}
