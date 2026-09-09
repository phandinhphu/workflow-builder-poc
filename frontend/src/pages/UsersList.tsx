import { useEffect, useMemo, useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, ShieldCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Pagination from '../components/Pagination';
import Toast, { useToasts } from '../components/Toast';
import { api, type OrganizationUnit, type SystemRole } from '../api/client';
import { replaceBackendData } from '../data/mockData';
import type { OrgUser } from '../types/workflow';
import Can from '../components/auth/Can';

const PAGE_SIZE = 8;
const emptyForm = { id: '', employeeCode: '', username: '', password: '', displayName: '', email: '', phone: '', jobTitle: '', organizationUnitId: 'ORG-COMPANY', managerId: '', employmentLevel: 'Staff', status: 'Active' };

export default function UsersList() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationUnit[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const toasts = useToasts();

  const load = async () => {
    setLoading(true);
    try {
      const [nextUsers, nextOrganizations, nextRoles] = await Promise.all([api.users.list(), api.organizations.list(), api.roles.list()]);
      setUsers(nextUsers); setOrganizations(nextOrganizations); setRoles(nextRoles); replaceBackendData({ users: nextUsers });
    } catch (cause) { toasts.pushToast('error', cause instanceof Error ? cause.message : 'Không tải được người dùng'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filteredUsers = useMemo(() => users.filter(user => user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase()) || user.externalId.toLowerCase().includes(searchTerm.toLowerCase())), [users, searchTerm]);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const displayName = (id?: string) => users.find(user => user.id === id)?.displayName ?? '—';

  const openCreate = () => { setForm({ ...emptyForm, organizationUnitId: organizations[0]?.id ?? 'ORG-COMPANY' }); setEditOpen(true); };
  const openEdit = (user: any) => { setForm({ id: user.id, employeeCode: user.employeeCode ?? user.externalId, username: user.username ?? '', password: '', displayName: user.displayName, email: user.email, phone: user.phone ?? '', jobTitle: user.jobTitle ?? user.role ?? '', organizationUnitId: user.organizationUnitId ?? '', managerId: user.managerId ?? '', employmentLevel: user.employmentLevel ?? user.level ?? 'Staff', status: user.status }); setEditOpen(true); };
  const submitUser = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (form.id) await api.users.update(form.id, form); else await api.users.create(form);
      setEditOpen(false); toasts.pushToast('success', form.id ? 'Đã cập nhật hồ sơ nhân sự.' : 'Đã tạo nhân sự trong HRM nội bộ.'); await load();
    } catch (cause) { toasts.pushToast('error', cause instanceof Error ? cause.message : 'Không lưu được người dùng'); }
  };
  const openRoles = (user: any) => { setRoleUser(user); setSelectedRoles((user.systemRoles ?? []).map((role: any) => role.id)); };
  const saveRoles = async () => {
    try { await api.users.assignRoles(roleUser.id, selectedRoles.map(roleId => ({ roleId }))); setRoleUser(null); toasts.pushToast('success', 'Đã cập nhật vai trò hệ thống.'); await load(); }
    catch (cause) { toasts.pushToast('error', cause instanceof Error ? cause.message : 'Không cập nhật được role'); }
  };

  return <div className="h-full flex flex-col p-6">
    <div className="bg-surface rounded-xl border border-border shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b bg-gray-50/50 flex justify-between"><div><h2 className="text-lg font-bold text-navy">Quản lý nhân sự nội bộ</h2><p className="text-sm text-muted mt-1">Người dùng, tuyến quản lý và đơn vị tổ chức do hệ thống HRM này sở hữu dữ liệu.</p></div><div className="text-right"><p className="text-2xl font-bold text-primary">{users.length}</p><p className="text-xs text-muted">hồ sơ nhân sự</p></div></div>
      <div className="p-4 border-b flex justify-between"><div className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Tìm tên, email, mã nhân viên…" className="pl-9 pr-4 py-2 text-sm border rounded-md w-80" /></div><Can permission="USER_MANAGE"><button onClick={openCreate} className="px-4 py-2 bg-primary text-white text-sm rounded-md flex items-center gap-2"><PlusIcon className="w-4 h-4" /> Thêm người dùng</button></Can></div>
      <div className="flex-1 overflow-auto"><table className="w-full text-left"><thead className="bg-gray-50 sticky top-0"><tr>{['Nhân sự','Email','Đơn vị','Chức danh HRM','Quản lý trực tiếp','System role','Trạng thái','Hành động'].map(item => <th key={item} className="py-3 px-4 text-xs font-semibold text-muted uppercase border-b">{item}</th>)}</tr></thead><tbody>
        {paged.map((user: any, idx) => <tr key={user.id} className={clsx('border-b hover:bg-gray-50', idx % 2 ? 'bg-gray-50/30' : 'bg-white')}><td className="py-3 px-4"><p className="text-sm font-medium text-navy">{user.displayName}</p><p className="text-xs text-muted">{user.employeeCode ?? user.externalId}</p></td><td className="py-3 px-4 text-sm text-gray-600">{user.email}</td><td className="py-3 px-4 text-sm text-gray-600">{user.organizationName ?? user.department}</td><td className="py-3 px-4 text-sm text-gray-600">{user.jobTitle ?? user.role}</td><td className="py-3 px-4 text-sm text-gray-600">{user.managerName ?? displayName(user.managerId)}</td><td className="py-3 px-4"><div className="flex flex-wrap gap-1">{(user.systemRoles ?? []).map((role: any) => <span key={role.id} className="text-[10px] bg-purple-50 text-purple-700 rounded px-1.5 py-0.5">{role.code}</span>)}</div></td><td className="py-3 px-4"><span className={clsx('text-xs rounded-full px-2 py-1', user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>{user.status}</span></td><td className="py-3 px-4"><div className="flex gap-1"><Can permission="USER_MANAGE"><button onClick={() => openEdit(user)} title="Sửa hồ sơ" className="p-1.5 hover:bg-gray-100 rounded"><PencilSquareIcon className="w-4 h-4" /></button></Can><Can permission="ROLE_MANAGE"><button onClick={() => openRoles(user)} title="Phân quyền hệ thống" className="p-1.5 hover:bg-purple-50 text-purple-700 rounded"><ShieldCheckIcon className="w-4 h-4" /></button></Can></div></td></tr>)}
      </tbody></table>{!loading && !paged.length && <p className="p-8 text-center text-sm text-muted">Không có người dùng phù hợp.</p>}{loading && <p className="p-8 text-center text-sm text-muted">Đang tải…</p>}</div>
      <Pagination page={safePage} total={filteredUsers.length} onChange={setPage} pageSize={PAGE_SIZE} label="người dùng" />
    </div>
    {editOpen && <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4"><form onSubmit={submitUser} className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-auto"><div className="p-5 border-b flex justify-between"><h2 className="font-bold">{form.id ? 'Cập nhật hồ sơ nhân sự' : 'Thêm người dùng HRM'}</h2><button type="button" onClick={() => setEditOpen(false)}><XMarkIcon className="w-5 h-5" /></button></div><div className="p-5 grid grid-cols-2 gap-4">
      <label className="text-sm">Mã nhân viên *<input required disabled={!!form.id} value={form.employeeCode} onChange={e => setForm({ ...form, employeeCode: e.target.value })} className="mt-1 w-full border rounded px-3 py-2 disabled:bg-gray-50" /></label><label className="text-sm">Username *<input required disabled={!!form.id} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="mt-1 w-full border rounded px-3 py-2 disabled:bg-gray-50" /></label>
      <label className="text-sm">Họ tên *<input required value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" /></label><label className="text-sm">Email *<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" /></label>
      <label className="text-sm">Chức danh HRM<input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" /></label><label className="text-sm">Cấp nhân sự<input value={form.employmentLevel} onChange={e => setForm({ ...form, employmentLevel: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" /></label>
      <label className="text-sm">Đơn vị tổ chức *<select required value={form.organizationUnitId} onChange={e => setForm({ ...form, organizationUnitId: e.target.value })} className="mt-1 w-full border rounded px-3 py-2">{organizations.map(unit => <option key={unit.id} value={unit.id}>{'—'.repeat(unit.hierarchyLevel)} {unit.name}</option>)}</select></label><label className="text-sm">Quản lý trực tiếp<select value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })} className="mt-1 w-full border rounded px-3 py-2"><option value="">Không có</option>{users.filter(user => user.id !== form.id && user.status === 'Active').map(user => <option key={user.id} value={user.id}>{user.displayName}</option>)}</select></label>
      <label className="text-sm">Trạng thái<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="mt-1 w-full border rounded px-3 py-2"><option>Active</option><option>Inactive</option></select></label><label className="text-sm">{form.id ? 'Đặt lại mật khẩu' : 'Mật khẩu ban đầu'}<input type="password" value={form.password} placeholder={form.id ? 'Để trống nếu không đổi' : 'Mặc định Welcome@123'} onChange={e => setForm({ ...form, password: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" /></label>
    </div><div className="p-4 border-t flex justify-end gap-2"><button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 border rounded text-sm">Hủy</button><button className="px-4 py-2 bg-primary text-white rounded text-sm">Lưu hồ sơ</button></div></form></div>}
    {roleUser && <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4"><div className="bg-white rounded-xl w-full max-w-xl"><div className="p-5 border-b flex justify-between"><div><h2 className="font-bold">Phân quyền hệ thống</h2><p className="text-sm text-muted">{roleUser.displayName} · không thay đổi chức danh HRM</p></div><button onClick={() => setRoleUser(null)}><XMarkIcon className="w-5 h-5" /></button></div><div className="p-5 space-y-2">{roles.map(role => <label key={role.id} className="flex gap-3 border rounded-lg p-3"><input type="checkbox" checked={selectedRoles.includes(role.id)} onChange={e => setSelectedRoles(e.target.checked ? [...selectedRoles, role.id] : selectedRoles.filter(id => id !== role.id))} /><div><p className="text-sm font-medium">{role.name}</p><p className="text-xs text-muted">{role.code} · {role.description}</p></div></label>)}</div><div className="p-4 border-t flex justify-end gap-2"><button onClick={() => setRoleUser(null)} className="px-4 py-2 border rounded text-sm">Hủy</button><button onClick={() => void saveRoles()} className="px-4 py-2 bg-primary text-white rounded text-sm">Lưu phân quyền</button></div></div></div>}
    <Toast toasts={toasts.toasts} onDismiss={toasts.dismissToast} />
  </div>;
}
