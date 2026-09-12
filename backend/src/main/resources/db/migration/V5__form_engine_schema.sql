CREATE TABLE form_definitions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    draft_schema LONGTEXT NOT NULL,
    active_version_id VARCHAR(36),
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_form_def_creator FOREIGN KEY (created_by) REFERENCES hrm_users(id)
);

CREATE TABLE form_versions (
    id VARCHAR(36) PRIMARY KEY,
    form_definition_id VARCHAR(36) NOT NULL,
    version_number INT NOT NULL,
    schema_snapshot LONGTEXT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    published_by VARCHAR(36) NOT NULL,
    published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_form_version_def FOREIGN KEY (form_definition_id) REFERENCES form_definitions(id),
    CONSTRAINT fk_form_version_publisher FOREIGN KEY (published_by) REFERENCES hrm_users(id),
    UNIQUE KEY uk_form_def_ver (form_definition_id, version_number)
);

CREATE INDEX idx_form_version_def_ver ON form_versions (form_definition_id, version_number);

-- Seed permissions for Form Engine
INSERT INTO permissions (code, name, description) VALUES
('FORM_VIEW', 'Xem biểu mẫu', 'Xem danh sách và cấu hình biểu mẫu'),
('FORM_EDIT', 'Sửa biểu mẫu', 'Tạo và cập nhật bản nháp biểu mẫu'),
('FORM_PUBLISH', 'Publish biểu mẫu', 'Đóng băng phiên bản FormVersion bất biến');

-- Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_code) VALUES
('ROLE-ADMIN', 'FORM_VIEW'),
('ROLE-ADMIN', 'FORM_EDIT'),
('ROLE-ADMIN', 'FORM_PUBLISH'),
('ROLE-DESIGNER', 'FORM_VIEW'),
('ROLE-DESIGNER', 'FORM_EDIT'),
('ROLE-DESIGNER', 'FORM_PUBLISH'),
('ROLE-USER', 'FORM_VIEW');
