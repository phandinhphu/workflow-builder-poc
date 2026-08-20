import { useEffect, useState } from 'react';
import { BuildingOffice2Icon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { api, type OrganizationUnit } from '../api/client';
import { orgUsers } from '../data/mockData';

function TreeNode({ unit }: { unit: OrganizationUnit }) {
  return (
    <li>
      <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 mb-2">
        <BuildingOffice2Icon className="w-5 h-5 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-navy">{unit.name}</p>
          <p className="text-xs text-muted">{unit.code} · {unit.unitType} · cấp {unit.hierarchyLevel}</p>
        </div>
        <span className="text-xs text-gray-500">{unit.directUserCount ?? 0} nhân sự</span>
        {unit.headUserName && <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-1">Trưởng đơn vị: {unit.headUserName}</span>}
      </div>
      {!!unit.children?.length && <ul className="ml-7 border-l pl-4">{unit.children.map(child => <TreeNode key={child.id} unit={child} />)}</ul>}
    </li>
  );
}

export default function OrganizationsPage() {
  const [tree, setTree] = useState<OrganizationUnit[]>([]);
  const [flat, setFlat] = useState<OrganizationUnit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ code: '', name: '', unitType: 'DEPARTMENT', parentId: 'ORG-COMPANY', headUserId: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [nextTree, nextFlat] = await Promise.all([api.organizations.tree(), api.organizations.list()]);
      setTree(nextTree); setFlat(nextFlat); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được cơ cấu tổ chức'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.organizations.create(form);
      setOpen(false); setForm({ code: '', name: '', unitType: 'DEPARTMENT', parentId: 'ORG-COMPANY', headUserId: '' });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tạo được đơn vị'); }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div><h1 className="text-xl font-bold text-navy">Cơ cấu tổ chức</h1><p className="text-sm text-muted mt-1">HRM nội bộ quản lý organization nhiều cấp và trưởng đơn vị.</p></div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm"><PlusIcon className="w-4 h-4" /> Thêm đơn vị</button>
      </div>
      <div className="bg-white border rounded-xl p-5 overflow-auto flex-1">
        {loading ? <p className="text-sm text-muted">Đang tải cây tổ chức…</p> : error ? <p className="text-sm text-red-600">{error}</p> : <ul>{tree.map(unit => <TreeNode key={unit.id} unit={unit} />)}</ul>}
      </div>
      {open && <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4">
        <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-xl">
          <div className="p-5 border-b flex justify-between"><h2 className="font-bold">Thêm đơn vị tổ chức</h2><button type="button" onClick={() => setOpen(false)}><XMarkIcon className="w-5 h-5" /></button></div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <label className="text-sm">Mã đơn vị *<input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" /></label>
            <label className="text-sm">Tên đơn vị *<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" /></label>
            <label className="text-sm">Loại<select value={form.unitType} onChange={e => setForm({ ...form, unitType: e.target.value })} className="mt-1 w-full border rounded px-3 py-2"><option>DIVISION</option><option>DEPARTMENT</option><option>TEAM</option><option>BRANCH</option></select></label>
            <label className="text-sm">Đơn vị cha<select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })} className="mt-1 w-full border rounded px-3 py-2">{flat.map(unit => <option key={unit.id} value={unit.id}>{'—'.repeat(unit.hierarchyLevel)} {unit.name}</option>)}</select></label>
            <label className="text-sm col-span-2">Trưởng đơn vị<select value={form.headUserId} onChange={e => setForm({ ...form, headUserId: e.target.value })} className="mt-1 w-full border rounded px-3 py-2"><option value="">Chưa chỉ định</option>{orgUsers.filter(user => user.status === 'Active').map(user => <option key={user.id} value={user.id}>{user.displayName}</option>)}</select></label>
          </div>
          <div className="p-4 border-t flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border rounded text-sm">Hủy</button><button className="px-4 py-2 bg-primary text-white rounded text-sm">Tạo đơn vị</button></div>
        </form>
      </div>}
    </div>
  );
}
