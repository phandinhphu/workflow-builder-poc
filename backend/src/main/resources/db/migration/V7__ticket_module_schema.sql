CREATE TABLE tickets (
    id VARCHAR(36) PRIMARY KEY,
    ticket_code VARCHAR(64) NOT NULL UNIQUE,
    category_id VARCHAR(36) NOT NULL,
    form_version_id VARCHAR(36) NOT NULL,
    workflow_instance_id VARCHAR(36) NULL,
    initiator_id VARCHAR(36) NOT NULL,
    initiator_name VARCHAR(255) NOT NULL,
    initiator_department_id VARCHAR(36) NULL,
    form_data LONGTEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    current_step_name VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    CONSTRAINT fk_ticket_category FOREIGN KEY (category_id) REFERENCES ticket_categories(id),
    CONSTRAINT fk_ticket_form_version FOREIGN KEY (form_version_id) REFERENCES form_versions(id),
    CONSTRAINT fk_ticket_instance FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id),
    CONSTRAINT fk_ticket_initiator FOREIGN KEY (initiator_id) REFERENCES hrm_users(id)
);

CREATE INDEX idx_ticket_initiator ON tickets (initiator_id, created_at DESC);
CREATE INDEX idx_ticket_category ON tickets (category_id);
CREATE INDEX idx_ticket_status ON tickets (status);
CREATE INDEX idx_ticket_instance ON tickets (workflow_instance_id);

-- Seed permissions for Ticket Module
INSERT INTO permissions (code, name, description) VALUES
('TICKET_CREATE', 'Tạo yêu cầu vé', 'Gửi yêu cầu mới từ danh mục ticket'),
('TICKET_VIEW', 'Xem vé của tôi', 'Xem danh sách và chi tiết các vé đã tạo'),
('TICKET_MANAGE', 'Quản trị toàn bộ vé', 'Xem và quản lý tất cả các vé trên hệ thống');

-- Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_code) VALUES
('ROLE-ADMIN', 'TICKET_CREATE'),
('ROLE-ADMIN', 'TICKET_VIEW'),
('ROLE-ADMIN', 'TICKET_MANAGE'),
('ROLE-DESIGNER', 'TICKET_CREATE'),
('ROLE-DESIGNER', 'TICKET_VIEW'),
('ROLE-USER', 'TICKET_CREATE'),
('ROLE-USER', 'TICKET_VIEW');
