import { useEffect, useState } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, UserIcon, UsersIcon, BriefcaseIcon, HomeIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { api, type SystemRole } from '../api/client';
import type { OrgUser } from '../types/workflow';

export interface AssigneeResolverConfig {
  type: 'fixed' | 'role' | 'group' | 'initiator' | 'creator' | 'manager_of' | 'current_participant' | 'participant_manager' | 'creator_manager' | 'department_head' | 'dynamic' | 'each_participant_manager' | 'each_participant';
  value?: string; // userId, roleId, groupId, expression
  label?: string; // display label
}

interface AssigneeResolverProps {
  config: AssigneeResolverConfig;
  onChange: (config: AssigneeResolverConfig) => void;
  participants?: any[]; // for preview
  availableNodes?: Array<{ id: string; name: string; type: string }>;
}

const RESOLVER_TYPES = [
  { value: 'initiator', label: 'Người tạo / Kích hoạt đơn (Initiator)', description: 'Người bắt đầu quy trình/sự kiện này', icon: UserIcon },
  { value: 'manager_of', label: 'Quản lý trực tiếp của người tạo (Manager of Initiator)', description: 'Tự động xác định Quản lý trực tiếp của người nộp đơn (HrmUser.managerId)', icon: ArrowRightIcon },
  { value: 'fixed', label: 'Người dùng cụ thể', description: 'Chọn một người dùng cố định', icon: UserIcon },
  { value: 'each_participant_manager', label: 'Quản lý của từng nhân viên (Multi-Manager)', description: 'Tạo task phê duyệt riêng cho quản lý của từng người nộp form ở bước trước', icon: ArrowRightIcon },
  { value: 'each_participant', label: 'Từng nhân viên tham gia (Personalized)', description: 'Gửi riêng đến từng nhân viên được phê duyệt/từ chối', icon: UserIcon },
  { value: 'dynamic', label: 'Lấy động từ bước trước (Dynamic List)', description: 'Lấy từ kết quả Node Assignment hoặc biến context', icon: ArrowRightIcon },
  { value: 'role', label: 'Theo vai trò (Role)', description: 'Chọn theo vai trò như Manager, Director', icon: BriefcaseIcon },
  { value: 'group', label: 'Theo nhóm (Group)', description: 'Chọn theo nhóm/team', icon: UsersIcon },
  { value: 'current_participant', label: 'Người tham gia hiện tại', description: 'Mỗi participant nhận task riêng', icon: UserIcon },
  { value: 'participant_manager', label: 'Quản lý của participant', description: 'Resolve participant.managerId', icon: ArrowRightIcon },
  { value: 'creator_manager', label: 'Quản lý của người tạo', description: 'Resolve trigger.creator.managerId', icon: ArrowRightIcon },
  { value: 'department_head', label: 'Trưởng phòng ban', description: 'Resolve theo org metadata', icon: HomeIcon },
];

const VALUE_LESS_TYPES: AssigneeResolverConfig['type'][] = ['initiator', 'creator', 'manager_of', 'current_participant', 'participant_manager', 'creator_manager', 'department_head', 'each_participant_manager', 'each_participant'];

export default function AssigneeResolver({ config, onChange, participants }: AssigneeResolverProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [loadError, setLoadError] = useState('');
  useEffect(() => { void Promise.all([api.users.list(), api.roles.list(), api.groups.list()]).then(([nextUsers, nextRoles, nextGroups]) => {
    setUsers(nextUsers); setRoles(nextRoles); setGroups(nextGroups); setLoadError('');
  }).catch(cause => setLoadError(cause instanceof Error ? cause.message : 'Không tải được directory')); }, []);
  const directoryUsers = users.map(user => ({ id: user.id, name: user.displayName, email: user.email, avatar: user.displayName.split(' ').slice(-1)[0].charAt(0) + user.displayName.split(' ')[0].charAt(0) }));
  const selectedType = RESOLVER_TYPES.find(t => t.value === config.type) ?? RESOLVER_TYPES[0];

  const filteredUsers = directoryUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedSummary = (): string => {
    switch (config.type) {
      case 'fixed': {
        const user = directoryUsers.find(u => u.id === config.value);
        return user ? `Đã chọn: ${user.name}` : 'Chưa chọn người dùng';
      }
      case 'role': {
        const role = roles.find(r => r.id === config.value || r.code === config.value);
        return role ? `Đã chọn: ${role.name}` : 'Chưa chọn vai trò';
      }
      case 'group': {
        const group = groups.find(g => g.id === config.value);
        return group ? `Đã chọn: ${group.name}` : 'Chưa chọn nhóm';
      }
      case 'dynamic':
        return config.value ? `Biểu thức: ${config.value}` : 'Chưa nhập biểu thức';
      case 'current_participant':
        return participants && participants.length > 0 ? `Mỗi participant (${participants.length}) nhận task riêng` : 'Mỗi participant nhận task riêng';
      case 'participant_manager':
        return 'Resolve participant.managerId';
      case 'each_participant_manager':
        return 'Tạo task phê duyệt riêng cho từng Quản lý ứng với từng nhân viên nộp form';
      case 'each_participant':
        return 'Gửi thông báo cá nhân hóa riêng đến từng nhân viên';
      case 'creator_manager':
        return 'Resolve manager của người tạo';
      case 'manager_of':
        return 'Tự động xác định Quản lý trực tiếp của người gửi phiếu';
      case 'department_head':
        return 'Resolve theo org metadata';
      default:
        return '';
    }
  };

  const handleTypeChange = (newType: AssigneeResolverConfig['type']) => {
    onChange({ type: newType, value: '', label: '' });
  };

  const handleValueChange = (type: AssigneeResolverConfig['type'], value: string) => {
    onChange({ type, value, label: value });
  };

  const renderValueConfig = () => {
    switch (config.type) {
      case 'fixed':
        return (
          <div className="border border-border rounded-md overflow-hidden">
            <div className="relative p-2 border-b border-gray-100 bg-white">
              <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm người dùng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1 bg-white">
              {filteredUsers.length === 0 && <p className="px-3 py-3 text-sm text-muted text-center">Không tìm thấy người dùng</p>}
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleValueChange('fixed', user.id)}
                  className={clsx("w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-100", config.value === user.id && "bg-primary/10 text-primary")}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0">
                    {user.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  {config.value === user.id && <CheckIcon className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        );
      case 'role':
        return (
          <div className="border border-border rounded-md overflow-hidden max-h-56 overflow-y-auto py-1 bg-white">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => handleValueChange('role', role.id)}
                className={clsx("w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-100", config.value === role.id && "bg-primary/10 text-primary")}
              >
                <BriefcaseIcon className="w-5 h-5 text-gray-400 shrink-0" />
                <span className="flex-1">{role.name}</span>
                {config.value === role.id && <CheckIcon className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        );
      case 'group':
        return (
          <div className="border border-border rounded-md overflow-hidden max-h-56 overflow-y-auto py-1 bg-white">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => handleValueChange('group', group.id)}
                className={clsx("w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-100", config.value === group.id && "bg-primary/10 text-primary")}
              >
                <UsersIcon className="w-5 h-5 text-gray-400 shrink-0" />
                <span className="flex-1">{group.name}</span>
                {config.value === group.id && <CheckIcon className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        );
      case 'dynamic':
        return (
          <div className="border border-border rounded-md p-3 bg-white">
            <input
              type="text"
              placeholder="Ví dụ: ${nodes.lookup.output.ownerId}"
              value={config.value || ''}
              onChange={(e) => handleValueChange('dynamic', e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-muted mt-2">Nhập đường dẫn context hoặc biểu thức trả về userId</p>
          </div>
        );
      default:
        return (
          <div className="border border-border rounded-md p-3 bg-white text-center">
            <p className="text-sm text-gray-600">Loại này không cần cấu hình thêm — hệ thống resolve tự động khi tạo task.</p>
            {participants && participants.length > 0 && (
              <p className="text-xs text-muted mt-1">Sẽ resolve cho {participants.length} participant</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <div className="flex items-center gap-2 min-w-0">
          <selectedType.icon className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="font-medium text-navy truncate">{selectedType.label}</span>
        </div>
        <ChevronDownIcon className={clsx("w-4 h-4 text-gray-400 transition-transform shrink-0", isExpanded && "rotate-180")} />
      </button>

      <p className={clsx("text-xs px-1", config.value || !VALUE_LESS_TYPES.includes(config.type) ? 'text-gray-700' : 'text-muted')}>
        {selectedSummary()}
      </p>

      {isExpanded && (
        <div className="space-y-3 p-3 border border-border rounded-md bg-gray-50">
          {loadError && <p className="text-xs text-red-600">{loadError}</p>}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide px-1 mb-1.5">Chọn loại resolver</p>
            <div className="grid gap-1">
              {RESOLVER_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => handleTypeChange(type.value as any)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded hover:bg-gray-100",
                    config.type === type.value ? "bg-primary/10 text-primary" : "bg-white border border-border"
                  )}
                >
                  <type.icon className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-xs text-gray-500 truncate">{type.description}</p>
                  </div>
                  {config.type === type.value && <CheckIcon className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide px-1 mb-1.5">Cấu hình giá trị</p>
            {renderValueConfig()}
          </div>
        </div>
      )}
    </div>
  );
}
