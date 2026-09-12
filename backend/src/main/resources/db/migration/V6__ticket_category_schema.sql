CREATE TABLE ticket_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(64),
    color VARCHAR(32),
    form_version_id VARCHAR(36) NOT NULL,
    workflow_executable_id VARCHAR(36) NOT NULL,
    field_mapping LONGTEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_tc_form_version FOREIGN KEY (form_version_id) REFERENCES form_versions(id),
    CONSTRAINT fk_tc_workflow_version FOREIGN KEY (workflow_executable_id) REFERENCES workflow_versions(id),
    CONSTRAINT fk_tc_creator FOREIGN KEY (created_by) REFERENCES hrm_users(id)
);

CREATE INDEX idx_tc_form_version ON ticket_categories (form_version_id);
CREATE INDEX idx_tc_workflow_version ON ticket_categories (workflow_executable_id);
CREATE INDEX idx_tc_is_active ON ticket_categories (is_active);

-- Seed permissions for Ticket Category
INSERT INTO permissions (code, name, description) VALUES
('CATEGORY_VIEW', 'Xem danh mục ticket', 'Xem danh sách và cấu hình liên kết danh mục ticket'),
('CATEGORY_MANAGE', 'Quản trị danh mục ticket', 'Tạo, sửa, xóa và cấu hình liên kết Form - Workflow');

-- Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_code) VALUES
('ROLE-ADMIN', 'CATEGORY_VIEW'),
('ROLE-ADMIN', 'CATEGORY_MANAGE'),
('ROLE-DESIGNER', 'CATEGORY_VIEW'),
('ROLE-DESIGNER', 'CATEGORY_MANAGE'),
('ROLE-USER', 'CATEGORY_VIEW');
