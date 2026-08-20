import { useEffect, useState } from 'react';
import { ShieldCheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { api, type SystemRole } from '../api/client';

const PERMISSIONS = [
  'USER_VIEW', 'USER_MANAGE', 'ORG_VIEW', 'ORG_MANAGE', 'ROLE_MANAGE',
  'WORKFLOW_VIEW', 'WORKFLOW_EDIT', 'WORKFLOW_PUBLISH', 'INSTANCE_START', 'INSTANCE_VIEW', 'TASK_MANAGE_ALL',
];

export default function RolesPage() {
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ code: '', name: '', description: '', permissions: [] as string[] });
  const load = async () => { try { setRoles(await api.roles.list()); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được vai trò'); } };
  useEffect(() => { void load(); }, []);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); try { await api.roles.create(form); setOpen(false); setForm({ code: '', name: '', description: '', permissions: [] }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tạo được vai trò'); } };
  return <div className="p-6 h-full flex flex-col">
    <div className="flex justify-between mb-4"><div><h1 className="text-xl font-bold text-navy">Vai trò hệ thống</h1><p className="text-sm text-muted mt-1">Role/permission của Workflow Builder tách biệt hoàn toàn với chức danh HRM.</p></div><button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm"><PlusIcon className="w-4 h-4" /> Tạo role</button></div>
    {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
    <div className="grid grid-cols-2 gap-4 overflow-auto">
      {roles.map(role => <div key={role.id} className="bg-white border rounded-xl p-5"><div className="flex items-start gap-3"><ShieldCheckIcon className="w-6 h-6 text-primary" /><div><h2 className="font-bold">{role.name}</h2><p className="font-mono text-xs text-gray-500">{role.code}</p></div>{role.builtIn && <span className="ml-auto text-xs bg-gray-100 rounded-full px-2 py-1">Built-in</span>}</div><p className="text-sm text-gray-600 mt-3">{role.description}</p><div className="flex flex-wrap gap-1 mt-4">{role.permissions.map(permission => <span key={permission.code} className="text-[11px] bg-blue-50 text-blue-700 rounded px-2 py-1">{permission.code}</span>)}</div></div>)}
    </div>
    {open && <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4"><form onSubmit={submit} className="bg-white rounded-xl w-full max-w-2xl"><div className="p-5 border-b flex justify-between"><h2 className="font-bold">Tạo vai trò hệ thống</h2><button type="button" onClick={() => setOpen(false)}><XMarkIcon className="w-5 h-5" /></button></div><div className="p-5 space-y-4"><div className="grid grid-cols-2 gap-4"><label className="text-sm">Mã role *<input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="mt-1 w-full border rounded px-3 py-2" /></label><label className="text-sm">Tên role *<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" /></label></div><label className="text-sm block">Mô tả<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" /></label><div><p className="text-sm font-medium mb-2">Permissions</p><div className="grid grid-cols-2 gap-2">{PERMISSIONS.map(permission => <label key={permission} className="text-xs flex gap-2 items-center border rounded p-2"><input type="checkbox" checked={form.permissions.includes(permission)} onChange={e => setForm({ ...form, permissions: e.target.checked ? [...form.permissions, permission] : form.permissions.filter(item => item !== permission) })} />{permission}</label>)}</div></div></div><div className="p-4 border-t flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border rounded text-sm">Hủy</button><button className="px-4 py-2 bg-primary text-white rounded text-sm">Tạo role</button></div></form></div>}
  </div>;
}
