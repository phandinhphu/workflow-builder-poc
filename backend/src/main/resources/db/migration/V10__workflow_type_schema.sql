CREATE TABLE workflow_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_type_allowed_nodes (
    id VARCHAR(36) PRIMARY KEY,
    workflow_type_id VARCHAR(50) NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wtan_type FOREIGN KEY (workflow_type_id) REFERENCES workflow_types(id) ON DELETE CASCADE,
    CONSTRAINT uq_wtan_type_node UNIQUE (workflow_type_id, node_type)
);

CREATE INDEX idx_wtan_type ON workflow_type_allowed_nodes(workflow_type_id);

CREATE TABLE workflow_type_validation_rules (
    id VARCHAR(36) PRIMARY KEY,
    workflow_type_id VARCHAR(50) NOT NULL,
    rule_code VARCHAR(50) NOT NULL,
    target_node_type VARCHAR(50) NULL,
    error_message VARCHAR(500) NOT NULL,
    rule_config LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wtvr_type FOREIGN KEY (workflow_type_id) REFERENCES workflow_types(id) ON DELETE CASCADE
);

CREATE INDEX idx_wtvr_type ON workflow_type_validation_rules(workflow_type_id);

-- =========================================================================
-- Seed Data: 5 Workflow Types
-- =========================================================================

INSERT INTO workflow_types (id, name, description, is_active, sort_order) VALUES
('APPROVAL', 'Quy trình phê duyệt', 'Quy trình yêu cầu xét duyệt qua một hoặc nhiều cấp trước khi hoàn tất.', TRUE, 1),
('NOTIFICATION', 'Quy trình thông báo', 'Quy trình chỉ thực hiện gửi thông báo tự động tới người dùng hoặc các kênh liên quan.', TRUE, 2),
('AUTOMATION', 'Quy trình tự động hoá', 'Quy trình tự động thực thi các tác vụ hệ thống, gọi API và biến đổi dữ liệu.', TRUE, 3),
('REVIEW', 'Quy trình kiểm duyệt', 'Quy trình kiểm tra, rà soát và đánh giá nội dung hoặc hồ sơ nghiệp vụ.', TRUE, 4),
('CUSTOM', 'Quy trình tự do (Tuỳ biến)', 'Quy trình không bị ràng buộc bởi các khuôn mẫu nghiệp vụ đặc thù, cho phép sử dụng toàn bộ các loại node.', TRUE, 5);

-- Allowed Nodes for APPROVAL
INSERT INTO workflow_type_allowed_nodes (id, workflow_type_id, node_type) VALUES
('wtan-appr-01', 'APPROVAL', 'START'),
('wtan-appr-02', 'APPROVAL', 'END'),
('wtan-appr-03', 'APPROVAL', 'APPROVAL'),
('wtan-appr-04', 'APPROVAL', 'ASSIGNMENT'),
('wtan-appr-05', 'APPROVAL', 'NOTIFICATION'),
('wtan-appr-06', 'APPROVAL', 'CONDITION'),
('wtan-appr-07', 'APPROVAL', 'TIMER'),
('wtan-appr-08', 'APPROVAL', 'WAIT_EVENT'),
('wtan-appr-09', 'APPROVAL', 'PARALLEL_SPLIT'),
('wtan-appr-10', 'APPROVAL', 'JOIN'),
('wtan-appr-11', 'APPROVAL', 'SUBWORKFLOW');

-- Allowed Nodes for NOTIFICATION
INSERT INTO workflow_type_allowed_nodes (id, workflow_type_id, node_type) VALUES
('wtan-noti-01', 'NOTIFICATION', 'START'),
('wtan-noti-02', 'NOTIFICATION', 'END'),
('wtan-noti-03', 'NOTIFICATION', 'NOTIFICATION'),
('wtan-noti-04', 'NOTIFICATION', 'CONDITION'),
('wtan-noti-05', 'NOTIFICATION', 'TIMER'),
('wtan-noti-06', 'NOTIFICATION', 'WAIT_EVENT'),
('wtan-noti-07', 'NOTIFICATION', 'PARALLEL_SPLIT'),
('wtan-noti-08', 'NOTIFICATION', 'JOIN'),
('wtan-noti-09', 'NOTIFICATION', 'SUBWORKFLOW');

-- Allowed Nodes for AUTOMATION
INSERT INTO workflow_type_allowed_nodes (id, workflow_type_id, node_type) VALUES
('wtan-auto-01', 'AUTOMATION', 'START'),
('wtan-auto-02', 'AUTOMATION', 'END'),
('wtan-auto-03', 'AUTOMATION', 'SYSTEM'),
('wtan-auto-04', 'AUTOMATION', 'HTTP'),
('wtan-auto-05', 'AUTOMATION', 'DATA'),
('wtan-auto-06', 'AUTOMATION', 'DATA_TRANSFORM'),
('wtan-auto-07', 'AUTOMATION', 'NOTIFICATION'),
('wtan-auto-08', 'AUTOMATION', 'CONDITION'),
('wtan-auto-09', 'AUTOMATION', 'TIMER'),
('wtan-auto-10', 'AUTOMATION', 'WAIT_EVENT'),
('wtan-auto-11', 'AUTOMATION', 'PARALLEL_SPLIT'),
('wtan-auto-12', 'AUTOMATION', 'JOIN'),
('wtan-auto-13', 'AUTOMATION', 'SUBWORKFLOW');

-- Allowed Nodes for REVIEW
INSERT INTO workflow_type_allowed_nodes (id, workflow_type_id, node_type) VALUES
('wtan-revw-01', 'REVIEW', 'START'),
('wtan-revw-02', 'REVIEW', 'END'),
('wtan-revw-03', 'REVIEW', 'REVIEW'),
('wtan-revw-04', 'REVIEW', 'ASSIGNMENT'),
('wtan-revw-05', 'REVIEW', 'NOTIFICATION'),
('wtan-revw-06', 'REVIEW', 'CONDITION'),
('wtan-revw-07', 'REVIEW', 'TIMER'),
('wtan-revw-08', 'REVIEW', 'WAIT_EVENT'),
('wtan-revw-09', 'REVIEW', 'PARALLEL_SPLIT'),
('wtan-revw-10', 'REVIEW', 'JOIN'),
('wtan-revw-11', 'REVIEW', 'SUBWORKFLOW');

-- Allowed Nodes for CUSTOM (All 16 nodes)
INSERT INTO workflow_type_allowed_nodes (id, workflow_type_id, node_type) VALUES
('wtan-cust-01', 'CUSTOM', 'START'),
('wtan-cust-02', 'CUSTOM', 'END'),
('wtan-cust-03', 'CUSTOM', 'APPROVAL'),
('wtan-cust-04', 'CUSTOM', 'REVIEW'),
('wtan-cust-05', 'CUSTOM', 'ASSIGNMENT'),
('wtan-cust-06', 'CUSTOM', 'NOTIFICATION'),
('wtan-cust-07', 'CUSTOM', 'CONDITION'),
('wtan-cust-08', 'CUSTOM', 'SYSTEM'),
('wtan-cust-09', 'CUSTOM', 'DATA'),
('wtan-cust-10', 'CUSTOM', 'HTTP'),
('wtan-cust-11', 'CUSTOM', 'DATA_TRANSFORM'),
('wtan-cust-12', 'CUSTOM', 'TIMER'),
('wtan-cust-13', 'CUSTOM', 'WAIT_EVENT'),
('wtan-cust-14', 'CUSTOM', 'PARALLEL_SPLIT'),
('wtan-cust-15', 'CUSTOM', 'JOIN'),
('wtan-cust-16', 'CUSTOM', 'SUBWORKFLOW');

-- Validation Rules
INSERT INTO workflow_type_validation_rules (id, workflow_type_id, rule_code, target_node_type, error_message, rule_config) VALUES
('wtvr-appr-01', 'APPROVAL', 'REQUIRED_NODE', 'APPROVAL', 'Workflow loại Phê duyệt bắt buộc phải có ít nhất 1 bước Phê duyệt (Approval).', '{"min": 1}'),
('wtvr-noti-01', 'NOTIFICATION', 'REQUIRED_NODE', 'NOTIFICATION', 'Workflow loại Thông báo bắt buộc phải có ít nhất 1 bước Thông báo (Notification).', '{"min": 1}'),
('wtvr-noti-02', 'NOTIFICATION', 'FORBIDDEN_NODE', 'APPROVAL', 'Workflow loại Thông báo không được chứa bước Phê duyệt (Approval).', '{"max": 0}'),
('wtvr-auto-01', 'AUTOMATION', 'REQUIRED_NODE', 'SYSTEM', 'Workflow loại Tự động hoá bắt buộc phải có ít nhất 1 bước Tác vụ hệ thống (System Action).', '{"min": 1}'),
('wtvr-revw-01', 'REVIEW', 'REQUIRED_NODE', 'REVIEW', 'Workflow loại Kiểm duyệt bắt buộc phải có ít nhất 1 bước Kiểm duyệt (Review).', '{"min": 1}');
