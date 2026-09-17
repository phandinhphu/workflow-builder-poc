CREATE TABLE modules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000) NULL,
    department_id VARCHAR(36) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_module_department FOREIGN KEY (department_id) REFERENCES organization_units(id) ON DELETE SET NULL
);

CREATE INDEX idx_modules_department ON modules(department_id);

CREATE TABLE user_module_access (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    module_id VARCHAR(50) NOT NULL,
    access_level VARCHAR(20) NOT NULL DEFAULT 'VIEWER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_uma_user FOREIGN KEY (user_id) REFERENCES hrm_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_uma_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_module UNIQUE (user_id, module_id)
);

CREATE INDEX idx_uma_user ON user_module_access(user_id);
CREATE INDEX idx_uma_module ON user_module_access(module_id);

-- =========================================================================
-- Seed Data: 8 Standard Modules
-- =========================================================================

INSERT INTO modules (id, name, description, department_id, is_active, sort_order) VALUES
('MOD_GENERAL', 'Module Chung', 'Quy trình áp dụng chung toàn tổ chức', NULL, TRUE, 1),
('MOD_HR', 'Nhân sự', 'Quy trình liên quan đến quản lý nhân sự, chế độ chính sách', 'ORG-HR', TRUE, 2),
('MOD_IT', 'Công nghệ thông tin', 'Quy trình hỗ trợ kỹ thuật, phần mềm và hạ tầng IT', 'ORG-TECH', TRUE, 3),
('MOD_FIN', 'Tài chính - Kế toán', 'Quy trình tài chính, thanh toán và hạch toán kế toán', 'ORG-FIN', TRUE, 4),
('MOD_SALES', 'Kinh doanh', 'Quy trình bán hàng, hợp đồng và khách hàng', 'ORG-SALES', TRUE, 5),
('MOD_MKT', 'Marketing', 'Quy trình truyền thông, sự kiện và tiếp thị', 'ORG-MKT', TRUE, 6),
('MOD_LEGAL', 'Pháp chế', 'Quy trình rà soát hợp đồng và tư vấn pháp lý', 'ORG-LEGAL', TRUE, 7),
('MOD_OPS', 'Vận hành', 'Quy trình vận hành doanh nghiệp và cơ sở vật chất', NULL, TRUE, 8);

-- =========================================================================
-- Seed Initial User Module Access
-- =========================================================================

INSERT INTO user_module_access (id, user_id, module_id, access_level) VALUES
('uma-001', 'U001', 'MOD_HR', 'MANAGER'),
('uma-002', 'U001', 'MOD_GENERAL', 'EDITOR'),
('uma-003', 'U002', 'MOD_IT', 'MANAGER'),
('uma-004', 'U002', 'MOD_GENERAL', 'EDITOR'),
('uma-005', 'U003', 'MOD_SALES', 'MANAGER'),
('uma-006', 'U003', 'MOD_GENERAL', 'VIEWER'),
('uma-007', 'U004', 'MOD_FIN', 'MANAGER'),
('uma-008', 'U004', 'MOD_GENERAL', 'VIEWER'),
('uma-009', 'U005', 'MOD_MKT', 'MANAGER'),
('uma-010', 'U005', 'MOD_GENERAL', 'VIEWER'),
('uma-011', 'U006', 'MOD_GENERAL', 'MANAGER'),
('uma-012', 'U006', 'MOD_OPS', 'MANAGER'),
('uma-013', 'U008', 'MOD_LEGAL', 'MANAGER'),
('uma-014', 'U008', 'MOD_GENERAL', 'VIEWER');

-- =========================================================================
-- Migrate Workflow Definitions Data: module_name -> module_id
-- =========================================================================

ALTER TABLE workflow_definitions ADD COLUMN module_id VARCHAR(50) NULL;

UPDATE workflow_definitions SET module_id = 'MOD_IT' WHERE LOWER(TRIM(module_name)) IN ('it', 'phòng it', 'công nghệ', 'tech', 'cntt');
UPDATE workflow_definitions SET module_id = 'MOD_HR' WHERE LOWER(TRIM(module_name)) IN ('hr', 'nhân sự');
UPDATE workflow_definitions SET module_id = 'MOD_FIN' WHERE LOWER(TRIM(module_name)) IN ('finance', 'tài chính', 'fin', 'kế toán');
UPDATE workflow_definitions SET module_id = 'MOD_OPS' WHERE LOWER(TRIM(module_name)) IN ('operations', 'vận hành', 'ops');
UPDATE workflow_definitions SET module_id = 'MOD_SALES' WHERE LOWER(TRIM(module_name)) IN ('sales', 'kinh doanh');
UPDATE workflow_definitions SET module_id = 'MOD_MKT' WHERE LOWER(TRIM(module_name)) IN ('marketing', 'mkt');
UPDATE workflow_definitions SET module_id = 'MOD_LEGAL' WHERE LOWER(TRIM(module_name)) IN ('legal', 'pháp chế');
UPDATE workflow_definitions SET module_id = 'MOD_GENERAL' WHERE module_id IS NULL;

ALTER TABLE workflow_definitions MODIFY COLUMN module_id VARCHAR(50) NOT NULL;
ALTER TABLE workflow_definitions ADD CONSTRAINT fk_workflow_module FOREIGN KEY (module_id) REFERENCES modules(id);
CREATE INDEX idx_workflow_module ON workflow_definitions(module_id);

ALTER TABLE workflow_definitions DROP COLUMN module_name;
