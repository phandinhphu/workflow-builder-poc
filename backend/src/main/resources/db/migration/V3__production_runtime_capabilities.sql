CREATE TABLE directory_groups (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    organization_scope_id VARCHAR(36),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_org FOREIGN KEY (organization_scope_id) REFERENCES organization_units(id)
);

CREATE TABLE directory_group_members (
    group_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id),
    CONSTRAINT fk_group_member_group FOREIGN KEY (group_id) REFERENCES directory_groups(id),
    CONSTRAINT fk_group_member_user FOREIGN KEY (user_id) REFERENCES hrm_users(id)
);

CREATE TABLE integration_connectors (
    id VARCHAR(36) PRIMARY KEY,
    connector_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    connector_type VARCHAR(40) NOT NULL,
    base_url VARCHAR(1000),
    auth_type VARCHAR(40) NOT NULL DEFAULT 'NONE',
    configuration LONGTEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    lock_version BIGINT NOT NULL DEFAULT 0,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_connector_creator FOREIGN KEY (created_by) REFERENCES hrm_users(id)
);

CREATE TABLE credential_references (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    credential_type VARCHAR(40) NOT NULL,
    secret_reference VARCHAR(500) NOT NULL,
    organization_scope_id VARCHAR(36),
    metadata LONGTEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_credential_org FOREIGN KEY (organization_scope_id) REFERENCES organization_units(id),
    CONSTRAINT fk_credential_creator FOREIGN KEY (created_by) REFERENCES hrm_users(id)
);

CREATE TABLE task_candidate_users (
    task_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (task_id, user_id),
    CONSTRAINT fk_candidate_task FOREIGN KEY (task_id) REFERENCES workflow_tasks(id),
    CONSTRAINT fk_candidate_user FOREIGN KEY (user_id) REFERENCES hrm_users(id)
);

CREATE TABLE runtime_jobs (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36),
    participant_execution_id VARCHAR(36),
    node_execution_id VARCHAR(36),
    task_id VARCHAR(36),
    job_type VARCHAR(40) NOT NULL,
    dedup_key VARCHAR(255) NOT NULL UNIQUE,
    state VARCHAR(20) NOT NULL,
    due_at TIMESTAMP NOT NULL,
    payload LONGTEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    last_error VARCHAR(2000),
    locked_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_instance FOREIGN KEY (instance_id) REFERENCES workflow_instances(id),
    CONSTRAINT fk_job_participant FOREIGN KEY (participant_execution_id) REFERENCES participant_executions(id),
    CONSTRAINT fk_job_execution FOREIGN KEY (node_execution_id) REFERENCES node_executions(id),
    CONSTRAINT fk_job_task FOREIGN KEY (task_id) REFERENCES workflow_tasks(id)
);

CREATE TABLE wait_subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36) NOT NULL,
    participant_execution_id VARCHAR(36),
    node_execution_id VARCHAR(36) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    correlation_key VARCHAR(500) NOT NULL,
    state VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP,
    event_payload LONGTEXT,
    consumed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_name, correlation_key, state),
    CONSTRAINT fk_wait_instance FOREIGN KEY (instance_id) REFERENCES workflow_instances(id),
    CONSTRAINT fk_wait_participant FOREIGN KEY (participant_execution_id) REFERENCES participant_executions(id),
    CONSTRAINT fk_wait_execution FOREIGN KEY (node_execution_id) REFERENCES node_executions(id)
);

CREATE TABLE trigger_fires (
    id VARCHAR(36) PRIMARY KEY,
    workflow_id VARCHAR(36) NOT NULL,
    trigger_type VARCHAR(30) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    payload LONGTEXT NOT NULL,
    instance_id VARCHAR(36),
    status VARCHAR(20) NOT NULL,
    error_message VARCHAR(2000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE (workflow_id, trigger_type, idempotency_key),
    CONSTRAINT fk_fire_workflow FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id),
    CONSTRAINT fk_fire_instance FOREIGN KEY (instance_id) REFERENCES workflow_instances(id)
);

CREATE TABLE workflow_members (
    workflow_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    workflow_role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workflow_id, user_id),
    CONSTRAINT fk_member_workflow FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id),
    CONSTRAINT fk_member_user FOREIGN KEY (user_id) REFERENCES hrm_users(id)
);

ALTER TABLE workflow_instances ADD COLUMN parent_instance_id VARCHAR(36);
ALTER TABLE workflow_instances ADD COLUMN parent_node_execution_id VARCHAR(36);
ALTER TABLE workflow_instances ADD COLUMN lock_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE notification_deliveries ADD COLUMN attempts INT NOT NULL DEFAULT 0;
ALTER TABLE notification_deliveries ADD COLUMN next_attempt_at TIMESTAMP;
ALTER TABLE notification_deliveries ADD COLUMN last_error VARCHAR(2000);
ALTER TABLE notification_deliveries ADD COLUMN provider_message_id VARCHAR(255);
ALTER TABLE notification_deliveries ADD COLUMN read_at TIMESTAMP;

CREATE INDEX idx_group_scope ON directory_groups(organization_scope_id, status);
CREATE INDEX idx_candidate_user ON task_candidate_users(user_id, task_id);
CREATE INDEX idx_runtime_job_due ON runtime_jobs(state, due_at);
CREATE INDEX idx_wait_lookup ON wait_subscriptions(event_name, correlation_key, state);
CREATE INDEX idx_notice_dispatch ON notification_deliveries(delivery_status, next_attempt_at);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id, created_at);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at);
CREATE INDEX idx_workflow_member_user ON workflow_members(user_id, workflow_role);

INSERT INTO permissions (code, name, description) VALUES
('GROUP_MANAGE', 'Quản lý nhóm người dùng', 'Tạo nhóm và quản lý thành viên nội bộ'),
('CONNECTOR_MANAGE', 'Quản lý kết nối', 'Quản lý connector và credential reference'),
('AUDIT_VIEW', 'Xem audit log', 'Tra cứu lịch sử thay đổi và runtime audit');

INSERT INTO role_permissions (role_id, permission_code) VALUES
('ROLE-ADMIN', 'GROUP_MANAGE'),
('ROLE-ADMIN', 'CONNECTOR_MANAGE'),
('ROLE-ADMIN', 'AUDIT_VIEW'),
('ROLE-HR', 'GROUP_MANAGE');

INSERT INTO directory_groups (id, code, name, description, organization_scope_id, status) VALUES
('GROUP-HR-REVIEWERS', 'HR_REVIEWERS', 'HR Reviewers', 'Nhóm kiểm tra kết quả đánh giá', 'ORG-HR', 'ACTIVE'),
('GROUP-TECH-LEADS', 'TECH_LEADS', 'Technology Leads', 'Nhóm lãnh đạo khối công nghệ', 'ORG-TECH', 'ACTIVE');

INSERT INTO directory_group_members (group_id, user_id) VALUES
('GROUP-HR-REVIEWERS', 'U001'),
('GROUP-TECH-LEADS', 'U002'),
('GROUP-TECH-LEADS', 'U004');
