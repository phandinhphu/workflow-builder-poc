INSERT INTO organization_units (id, code, name, unit_type, hierarchy_level, parent_id, hierarchy_path, status) VALUES
('ORG-COMPANY', 'COMPANY', 'Công ty Cổ phần ACME', 'COMPANY', 0, NULL, '/ORG-COMPANY/', 'ACTIVE'),
('ORG-BOD', 'BOD', 'Ban Giám đốc', 'BOARD', 1, 'ORG-COMPANY', '/ORG-COMPANY/ORG-BOD/', 'ACTIVE'),
('ORG-HR', 'HR', 'Khối Nhân sự', 'DIVISION', 1, 'ORG-COMPANY', '/ORG-COMPANY/ORG-HR/', 'ACTIVE'),
('ORG-HR-OPS', 'HR-OPS', 'Phòng Nhân sự', 'DEPARTMENT', 2, 'ORG-HR', '/ORG-COMPANY/ORG-HR/ORG-HR-OPS/', 'ACTIVE'),
('ORG-TECH', 'TECH', 'Khối Công nghệ', 'DIVISION', 1, 'ORG-COMPANY', '/ORG-COMPANY/ORG-TECH/', 'ACTIVE'),
('ORG-TECH-BE', 'TECH-BE', 'Phòng Công nghệ', 'DEPARTMENT', 2, 'ORG-TECH', '/ORG-COMPANY/ORG-TECH/ORG-TECH-BE/', 'ACTIVE'),
('ORG-SALES', 'SALES', 'Phòng Kinh doanh', 'DEPARTMENT', 1, 'ORG-COMPANY', '/ORG-COMPANY/ORG-SALES/', 'ACTIVE'),
('ORG-FIN', 'FIN', 'Phòng Tài chính', 'DEPARTMENT', 1, 'ORG-COMPANY', '/ORG-COMPANY/ORG-FIN/', 'ACTIVE'),
('ORG-MKT', 'MKT', 'Phòng Marketing', 'DEPARTMENT', 1, 'ORG-COMPANY', '/ORG-COMPANY/ORG-MKT/', 'ACTIVE'),
('ORG-LEGAL', 'LEGAL', 'Phòng Pháp chế', 'DEPARTMENT', 1, 'ORG-COMPANY', '/ORG-COMPANY/ORG-LEGAL/', 'ACTIVE');

INSERT INTO hrm_users (id, employee_code, username, password_hash, display_name, email, job_title, organization_unit_id, manager_id, employment_level, status) VALUES
('U006', 'EXT-006', 'chau.dh', '{seed}Welcome@123', 'Đỗ Hữu Châu', 'chau.dh@company.com', 'Chief Executive Officer', 'ORG-BOD', NULL, 'C-Level', 'ACTIVE'),
('U000', 'ADMIN-001', 'admin', '{seed}admin123', 'Nguyễn Văn B', 'admin@company.com', 'Quản trị hệ thống', 'ORG-BOD', 'U006', 'Administrator', 'ACTIVE'),
('U003', 'EXT-003', 'tam.lm', '{seed}Welcome@123', 'Lê Minh Tâm', 'tam.lm@company.com', 'Sales Lead', 'ORG-SALES', 'U006', 'Manager', 'ACTIVE'),
('U004', 'EXT-004', 'dang.ph', '{seed}Welcome@123', 'Phạm Hồng Đăng', 'dang.ph@company.com', 'Chief Accountant', 'ORG-FIN', 'U006', 'Manager', 'ACTIVE'),
('U005', 'EXT-005', 'trinh.vn', '{seed}Welcome@123', 'Vũ Ngọc Trinh', 'trinh.vn@company.com', 'Marketing Director', 'ORG-MKT', 'U006', 'Director', 'ACTIVE'),
('U001', 'EXT-001', 'mai.nt', '{seed}Welcome@123', 'Nguyễn Thị Mai', 'mai.nt@company.com', 'HR Specialist', 'ORG-HR-OPS', 'U003', 'Staff', 'ACTIVE'),
('U002', 'EXT-002', 'bach.th', '{seed}Welcome@123', 'Trần Hoàng Bách', 'bach.th@company.com', 'Backend Engineer', 'ORG-TECH-BE', 'U004', 'Staff', 'ACTIVE'),
('U007', 'EXT-007', 'viet.hq', '{seed}Welcome@123', 'Hoàng Quốc Việt', 'viet.hq@company.com', 'DevOps Specialist', 'ORG-TECH-BE', 'U004', 'Staff', 'INACTIVE'),
('U008', 'EXT-008', 'thao.bp', '{seed}Welcome@123', 'Bùi Phương Thảo', 'thao.bp@company.com', 'Legal Counsel', 'ORG-LEGAL', 'U006', 'Staff', 'ACTIVE');

UPDATE organization_units SET head_user_id = 'U006' WHERE id IN ('ORG-COMPANY', 'ORG-BOD');
UPDATE organization_units SET head_user_id = 'U001' WHERE id IN ('ORG-HR', 'ORG-HR-OPS');
UPDATE organization_units SET head_user_id = 'U002' WHERE id IN ('ORG-TECH', 'ORG-TECH-BE');
UPDATE organization_units SET head_user_id = 'U003' WHERE id = 'ORG-SALES';
UPDATE organization_units SET head_user_id = 'U004' WHERE id = 'ORG-FIN';
UPDATE organization_units SET head_user_id = 'U005' WHERE id = 'ORG-MKT';
UPDATE organization_units SET head_user_id = 'U008' WHERE id = 'ORG-LEGAL';

INSERT INTO permissions (code, name, description) VALUES
('USER_VIEW', 'Xem người dùng', 'Xem directory nhân sự trong phạm vi tổ chức'),
('USER_MANAGE', 'Quản lý người dùng', 'Tạo, sửa, vô hiệu hóa người dùng'),
('ORG_VIEW', 'Xem tổ chức', 'Xem cây tổ chức'),
('ORG_MANAGE', 'Quản lý tổ chức', 'Tạo và cập nhật đơn vị tổ chức'),
('ROLE_MANAGE', 'Quản lý vai trò hệ thống', 'Quản lý role và permission riêng của Workflow Builder'),
('WORKFLOW_VIEW', 'Xem workflow', 'Xem workflow definition'),
('WORKFLOW_EDIT', 'Sửa workflow', 'Tạo và sửa bản nháp'),
('WORKFLOW_PUBLISH', 'Publish workflow', 'Validate và publish phiên bản bất biến'),
('INSTANCE_START', 'Khởi chạy workflow', 'Tạo workflow instance'),
('INSTANCE_VIEW', 'Theo dõi runtime', 'Xem instance và audit timeline'),
('TASK_MANAGE_ALL', 'Xử lý toàn bộ task', 'Quản trị task ngoài assignment cá nhân');

INSERT INTO system_roles (id, code, name, description, built_in, status) VALUES
('ROLE-ADMIN', 'SYSTEM_ADMIN', 'Quản trị hệ thống', 'Toàn quyền Workflow Builder và HRM nội bộ', TRUE, 'ACTIVE'),
('ROLE-HR', 'HR_ADMIN', 'Quản trị HRM', 'Quản lý cây tổ chức và hồ sơ nhân sự theo scope', TRUE, 'ACTIVE'),
('ROLE-DESIGNER', 'WORKFLOW_DESIGNER', 'Thiết kế workflow', 'Tạo, sửa và publish workflow', TRUE, 'ACTIVE'),
('ROLE-USER', 'EMPLOYEE', 'Người dùng nghiệp vụ', 'Xem và thực hiện task được giao', TRUE, 'ACTIVE');

INSERT INTO role_permissions (role_id, permission_code)
SELECT 'ROLE-ADMIN', code FROM permissions;

INSERT INTO role_permissions (role_id, permission_code) VALUES
('ROLE-HR', 'USER_VIEW'), ('ROLE-HR', 'USER_MANAGE'), ('ROLE-HR', 'ORG_VIEW'), ('ROLE-HR', 'ORG_MANAGE'),
('ROLE-HR', 'INSTANCE_VIEW'), ('ROLE-DESIGNER', 'WORKFLOW_VIEW'), ('ROLE-DESIGNER', 'WORKFLOW_EDIT'),
('ROLE-DESIGNER', 'WORKFLOW_PUBLISH'), ('ROLE-DESIGNER', 'INSTANCE_START'), ('ROLE-DESIGNER', 'INSTANCE_VIEW'),
('ROLE-USER', 'WORKFLOW_VIEW'), ('ROLE-USER', 'INSTANCE_VIEW');

INSERT INTO user_role_assignments (id, user_id, role_id, organization_scope_id) VALUES
('URA-ADMIN', 'U000', 'ROLE-ADMIN', NULL),
('URA-HR', 'U001', 'ROLE-HR', 'ORG-COMPANY'),
('URA-DESIGNER', 'U001', 'ROLE-DESIGNER', NULL),
('URA-U001', 'U001', 'ROLE-USER', NULL),
('URA-U002', 'U002', 'ROLE-USER', NULL),
('URA-U003', 'U003', 'ROLE-USER', NULL),
('URA-U004', 'U004', 'ROLE-USER', NULL),
('URA-U005', 'U005', 'ROLE-USER', NULL),
('URA-U006', 'U006', 'ROLE-USER', NULL),
('URA-U007', 'U007', 'ROLE-USER', NULL),
('URA-U008', 'U008', 'ROLE-USER', NULL);
