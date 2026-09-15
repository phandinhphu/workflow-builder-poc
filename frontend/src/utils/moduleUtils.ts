import type { ModuleResponse, UserModuleAccessResponse } from '../types/module';

export interface StandardModuleInfo {
  id: string;
  name: string;
  code: string;
  badgeClass: string;
  departmentId?: string;
  description?: string;
}

export const FALLBACK_MODULES: StandardModuleInfo[] = [
  {
    id: 'MOD_GENERAL',
    name: 'Module Chung',
    code: 'GENERAL',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Quy trình áp dụng chung toàn tổ chức',
  },
  {
    id: 'MOD_HR',
    name: 'Nhân sự',
    code: 'HR',
    badgeClass: 'bg-pink-100 text-pink-700 border-pink-200',
    departmentId: 'ORG-HR',
    description: 'Quy trình liên quan đến quản lý nhân sự, chế độ chính sách',
  },
  {
    id: 'MOD_IT',
    name: 'Công nghệ thông tin',
    code: 'IT',
    badgeClass: 'bg-sky-100 text-sky-700 border-sky-200',
    departmentId: 'ORG-TECH',
    description: 'Quy trình hỗ trợ kỹ thuật, phần mềm và hạ tầng IT',
  },
  {
    id: 'MOD_FIN',
    name: 'Tài chính - Kế toán',
    code: 'FIN',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    departmentId: 'ORG-FIN',
    description: 'Quy trình tài chính, thanh toán và hạch toán kế toán',
  },
  {
    id: 'MOD_SALES',
    name: 'Kinh doanh',
    code: 'SALES',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    departmentId: 'ORG-SALES',
    description: 'Quy trình bán hàng, hợp đồng và khách hàng',
  },
  {
    id: 'MOD_MKT',
    name: 'Marketing',
    code: 'MKT',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    departmentId: 'ORG-MKT',
    description: 'Quy trình truyền thông, sự kiện và tiếp thị',
  },
  {
    id: 'MOD_LEGAL',
    name: 'Pháp chế',
    code: 'LEGAL',
    badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    departmentId: 'ORG-LEGAL',
    description: 'Quy trình rà soát hợp đồng và tư vấn pháp lý',
  },
  {
    id: 'MOD_OPS',
    name: 'Vận hành',
    code: 'OPS',
    badgeClass: 'bg-teal-100 text-teal-700 border-teal-200',
    description: 'Quy trình vận hành doanh nghiệp và cơ sở vật chất',
  },
];

const MODULE_BADGE_STYLES: Record<string, string> = {
  MOD_GENERAL: 'bg-slate-100 text-slate-700 border-slate-200',
  MOD_HR: 'bg-pink-100 text-pink-700 border-pink-200',
  MOD_IT: 'bg-sky-100 text-sky-700 border-sky-200',
  MOD_FIN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  MOD_SALES: 'bg-amber-100 text-amber-700 border-amber-200',
  MOD_MKT: 'bg-purple-100 text-purple-700 border-purple-200',
  MOD_LEGAL: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  MOD_OPS: 'bg-teal-100 text-teal-700 border-teal-200',
};

export function getModuleBadgeStyle(moduleId?: string): string {
  if (!moduleId) return 'bg-gray-100 text-gray-700 border-gray-200';
  const upper = moduleId.toUpperCase();
  if (MODULE_BADGE_STYLES[upper]) return MODULE_BADGE_STYLES[upper];
  
  // Legacy aliases
  if (upper.includes('HR') || upper.includes('NHÂN SỰ')) return MODULE_BADGE_STYLES.MOD_HR;
  if (upper.includes('IT') || upper.includes('TECH') || upper.includes('CNTT')) return MODULE_BADGE_STYLES.MOD_IT;
  if (upper.includes('FIN') || upper.includes('TÀI CHÍNH')) return MODULE_BADGE_STYLES.MOD_FIN;
  if (upper.includes('SALES') || upper.includes('KINH DOANH')) return MODULE_BADGE_STYLES.MOD_SALES;
  if (upper.includes('MKT') || upper.includes('MARKETING')) return MODULE_BADGE_STYLES.MOD_MKT;
  if (upper.includes('LEGAL') || upper.includes('PHÁP CHẾ')) return MODULE_BADGE_STYLES.MOD_LEGAL;
  if (upper.includes('OPS') || upper.includes('OPERATIONS') || upper.includes('VẬN HÀNH')) return MODULE_BADGE_STYLES.MOD_OPS;

  return 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getModuleName(
  moduleId?: string,
  customModules?: (ModuleResponse | UserModuleAccessResponse)[]
): string {
  if (!moduleId) return 'Chưa phân loại';
  
  if (customModules && customModules.length > 0) {
    const found = customModules.find((m) => {
      const id = 'moduleId' in m ? m.moduleId : m.id;
      return id === moduleId;
    });
    if (found) {
      return 'moduleName' in found ? found.moduleName : found.name;
    }
  }

  const fallback = FALLBACK_MODULES.find((m) => m.id === moduleId || m.code === moduleId);
  if (fallback) return fallback.name;

  // Legacy fallback
  if (moduleId === 'Operations') return 'Vận hành';
  if (moduleId === 'Finance') return 'Tài chính - Kế toán';
  if (moduleId === 'HR') return 'Nhân sự';
  if (moduleId === 'IT') return 'Công nghệ thông tin';

  return moduleId;
}

export function normalizeModuleId(moduleValue?: string): string {
  if (!moduleValue) return 'MOD_GENERAL';
  const upper = moduleValue.trim().toUpperCase();
  if (upper.startsWith('MOD_')) return upper;
  
  if (['IT', 'PHÒNG IT', 'CNTT', 'TECH'].includes(upper)) return 'MOD_IT';
  if (['HR', 'NHÂN SỰ'].includes(upper)) return 'MOD_HR';
  if (['FINANCE', 'FIN', 'TÀI CHÍNH', 'KẾ TOÁN'].includes(upper)) return 'MOD_FIN';
  if (['OPERATIONS', 'OPS', 'VẬN HÀNH'].includes(upper)) return 'MOD_OPS';
  if (['SALES', 'KINH DOANH'].includes(upper)) return 'MOD_SALES';
  if (['MARKETING', 'MKT'].includes(upper)) return 'MOD_MKT';
  if (['LEGAL', 'PHÁP CHẾ'].includes(upper)) return 'MOD_LEGAL';
  if (['GENERAL', 'CHUNG', 'MODULE CHUNG'].includes(upper)) return 'MOD_GENERAL';

  return moduleValue;
}
