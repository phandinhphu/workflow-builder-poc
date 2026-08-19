import { useState } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, UserIcon, UsersIcon, BriefcaseIcon, HomeIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { orgUsers } from '../data/mockData';

export interface AssigneeResolverConfig {
  type: 'fixed' | 'role' | 'group' | 'current_participant' | 'participant_manager' | 'creator_manager' | 'department_head' | 'dynamic';
  value?: string; // userId, roleId, groupId, expression
  label?: string; // display label
}

interface AssigneeResolverProps {
  config: AssigneeResolverConfig;
  onChange: (config: AssigneeResolverConfig) => void;
  participants?: any[]; // for preview
}

const RESOLVER_TYPES = [
  { value: 'fixed', label: 'Người dùng cụ thể', description: 'Chọn một người dùng cố định', icon: UserIcon },
  { value: 'role', label: 'Theo vai trò (Role)', description: 'Chọn theo vai trò như Manager, Director', icon: BriefcaseIcon },
  { value: 'group', label: 'Theo nhóm (Group)', description: 'Chọn theo nhóm/team', icon: UsersIcon },
  { value: 'current_participant', label: 'Người tham gia hiện tại', description: 'Mỗi participant nhận task riêng', icon: UserIcon },
  { value: 'participant_manager', label: 'Quản lý của participant', description: 'Resolve participant.managerId', icon: ArrowRightIcon },
  { value: 'creator_manager', label: 'Quản lý của người tạo', description: 'Resolve trigger.creator.managerId', icon: ArrowRightIcon },
  { value: 'department_head', label: 'Trưởng phòng ban', description: 'Resolve theo org metadata', icon: HomeIcon },
  { value: 'dynamic', label: 'Người dùng động (Biểu thức)', description: 'Từ variable/expression trả userId', icon: ArrowRightIcon },
];

const MOCK_USERS = orgUsers.map(u => ({ id: u.id, name: u.displayName, email: u.email, avatar: u.displayName.split(' ').slice(-1)[0].charAt(0) + u.displayName.split(' ')[0].charAt(0) }));

const MOCK_ROLES = [
  { id: 'ROLE_MANAGER', name: 'Manager' },
  { id: 'ROLE_DIRECTOR', name: 'Director' },
  { id: 'ROLE_FINANCE_LEAD', name: 'Finance Lead' },
  { id: 'ROLE_HR_LEAD', name: 'HR Lead' },
];

const MOCK_GROUPS = [
  { id: 'GRP_IT_SUPPORT', name: 'IT Support' },
  { id: 'GRP_HR_TEAM', name: 'HR Team' },
  { id: 'GRP_FINANCE_TEAM', name: 'Finance Team' },
];

export default function AssigneeResolver({ config, onChange, participants }: AssigneeResolverProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectedUser = config.value || null;
  const selectedType = RESOLVER_TYPES.find(t => t.value === config.type) ?? RESOLVER_TYPES[0];

  const getDisplayLabel = (type: string, value: string): string => {
    switch (type) {
      case 'fixed':
        const user = MOCK_USERS.find(u => u.id === value);
        return user ? user.name : value;
      case 'role':
        const role = MOCK_ROLES.find(r => r.id === value);
        return role ? role.name : value;
      case 'group':
        const group = MOCK_GROUPS.find(g => g.id === value);
        return group ? group.name : value;
      case 'dynamic':
        return `\${${value}}`;
      default:
        return value;
    }
  };

  const filteredUsers = MOCK_USERS.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTypeChange = (newType: AssigneeResolverConfig['type']) => {
    onChange({ type: newType, value: '', label: '' });
    setIsDropdownOpen(false);
  };

  const handleValueChange = (type: AssigneeResolverConfig['type'], value: string) => {
    const label = getDisplayLabel(type, value);
    onChange({ type, value, label });
    setIsDropdownOpen(false);
  };

  const renderDropdownContent = () => {
    switch (config.type) {
      case 'fixed':
        return (
          <div className="max-h-60 overflow-y-auto">
            <div className="p-2 border-b border-gray-100">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm người dùng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="py-1">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleValueChange('fixed', user.id)}
                  className={clsx("w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded hover:bg-gray-100", selectedUser === user.id && "bg-primary/10 text-primary")}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                    {user.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case 'role':
        return (
          <div className="py-1 max-h-60 overflow-y-auto">
            {MOCK_ROLES.map(role => (
              <button
                key={role.id}
                onClick={() => handleValueChange('role', role.id)}
                className={clsx("w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded hover:bg-gray-100", config.value === role.id && "bg-primary/10 text-primary")}
              >
                <BriefcaseIcon className="w-5 h-5 text-gray-400" />
                <span>{role.name}</span>
              </button>
            ))}
          </div>
        );
      case 'group':
        return (
          <div className="py-1 max-h-60 overflow-y-auto">
            {MOCK_GROUPS.map(group => (
              <button
                key={group.id}
                onClick={() => handleValueChange('group', group.id)}
                className={clsx("w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded hover:bg-gray-100", config.value === group.id && "bg-primary/10 text-primary")}
              >
                <UsersIcon className="w-5 h-5 text-gray-400" />
                <span>{group.name}</span>
              </button>
            ))}
          </div>
        );
      case 'dynamic':
        return (
          <div className="p-3">
            <input
              type="text"
              placeholder="Ví dụ: \${nodes.lookup.output.ownerId}"
              value={config.value || ''}
              onChange={(e) => handleValueChange('dynamic', e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-muted mt-2">Nhập đường dẫn context hoặc biểu thức trả về userId</p>
          </div>
        );
      default:
        return (
          <div className="p-3 text-center text-gray-500">
            <p className="text-sm">Loại này không cần cấu hình thêm</p>
            {participants && participants.length > 0 && (
              <p className="text-xs text-muted mt-1">Sẽ resolve cho {participants.length} participant</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <div className="flex items-center gap-2">
          <selectedType.icon className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-navy">{selectedType.label}</span>
        </div>
        <ChevronDownIcon className={clsx("w-4 h-4 text-gray-400 transition-transform", isDropdownOpen && "rotate-180")} />
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-border rounded-md shadow-lg overflow-hidden">
          {/* Type selector */}
          <div className="p-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide px-2 py-1">Chọn loại resolver</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {RESOLVER_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => handleTypeChange(type.value as any)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded hover:bg-gray-100",
                    config.type === type.value && "bg-primary/10 text-primary"
                  )}
                >
                  <type.icon className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                  {config.type === type.value && <XMarkIcon className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* Value configuration */}
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide px-2 py-1">Cấu hình giá trị</p>
          </div>
          <div className="p-2">
            {renderDropdownContent()}
          </div>
        </div>
      )}
    </div>
  );
}