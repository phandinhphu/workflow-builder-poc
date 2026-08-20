CREATE TABLE organization_units (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    unit_type VARCHAR(32) NOT NULL,
    hierarchy_level INT NOT NULL,
    parent_id VARCHAR(36),
    hierarchy_path VARCHAR(1000) NOT NULL,
    head_user_id VARCHAR(36),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_parent FOREIGN KEY (parent_id) REFERENCES organization_units(id)
);

CREATE TABLE hrm_users (
    id VARCHAR(36) PRIMARY KEY,
    employee_code VARCHAR(64) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    job_title VARCHAR(255),
    organization_unit_id VARCHAR(36) NOT NULL,
    manager_id VARCHAR(36),
    employment_level VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_org FOREIGN KEY (organization_unit_id) REFERENCES organization_units(id),
    CONSTRAINT fk_user_manager FOREIGN KEY (manager_id) REFERENCES hrm_users(id)
);

CREATE TABLE system_roles (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    built_in BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    code VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000)
);

CREATE TABLE role_permissions (
    role_id VARCHAR(36) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    PRIMARY KEY (role_id, permission_code),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES system_roles(id),
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_code) REFERENCES permissions(code)
);

CREATE TABLE user_role_assignments (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    role_id VARCHAR(36) NOT NULL,
    organization_scope_id VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, role_id, organization_scope_id),
    CONSTRAINT fk_ura_user FOREIGN KEY (user_id) REFERENCES hrm_users(id),
    CONSTRAINT fk_ura_role FOREIGN KEY (role_id) REFERENCES system_roles(id),
    CONSTRAINT fk_ura_org FOREIGN KEY (organization_scope_id) REFERENCES organization_units(id)
);

CREATE TABLE auth_tokens (
    token_hash VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES hrm_users(id)
);

CREATE TABLE workflow_definitions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(2000),
    workflow_type VARCHAR(100) NOT NULL,
    module_name VARCHAR(100),
    owner_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL,
    draft_version VARCHAR(30) NOT NULL,
    draft_definition LONGTEXT NOT NULL,
    active_version_id VARCHAR(36),
    lock_version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_workflow_owner FOREIGN KEY (owner_id) REFERENCES hrm_users(id)
);

CREATE TABLE workflow_versions (
    id VARCHAR(36) PRIMARY KEY,
    workflow_id VARCHAR(36) NOT NULL,
    version_no VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    definition_snapshot LONGTEXT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    validation_report LONGTEXT,
    author_id VARCHAR(36) NOT NULL,
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workflow_id, version_no),
    CONSTRAINT fk_version_workflow FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id),
    CONSTRAINT fk_version_author FOREIGN KEY (author_id) REFERENCES hrm_users(id)
);

CREATE TABLE workflow_instances (
    id VARCHAR(36) PRIMARY KEY,
    request_code VARCHAR(64) NOT NULL UNIQUE,
    workflow_id VARCHAR(36) NOT NULL,
    workflow_version_id VARCHAR(36) NOT NULL,
    creator_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL,
    business_outcome VARCHAR(50),
    trigger_data LONGTEXT NOT NULL,
    variables_data LONGTEXT NOT NULL,
    context_data LONGTEXT NOT NULL,
    idempotency_key VARCHAR(255),
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workflow_id, idempotency_key),
    CONSTRAINT fk_instance_workflow FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id),
    CONSTRAINT fk_instance_version FOREIGN KEY (workflow_version_id) REFERENCES workflow_versions(id),
    CONSTRAINT fk_instance_creator FOREIGN KEY (creator_id) REFERENCES hrm_users(id)
);

CREATE TABLE participant_executions (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    participant_snapshot LONGTEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    current_node_id VARCHAR(100),
    iteration_no INT NOT NULL DEFAULT 0,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE (instance_id, user_id),
    CONSTRAINT fk_participant_instance FOREIGN KEY (instance_id) REFERENCES workflow_instances(id),
    CONSTRAINT fk_participant_user FOREIGN KEY (user_id) REFERENCES hrm_users(id)
);

CREATE TABLE node_executions (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36) NOT NULL,
    participant_execution_id VARCHAR(36),
    node_id VARCHAR(100) NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    iteration_no INT NOT NULL,
    state VARCHAR(20) NOT NULL,
    outcome_port VARCHAR(100),
    input_snapshot LONGTEXT NOT NULL,
    output_data LONGTEXT NOT NULL,
    error_data LONGTEXT,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT fk_node_instance FOREIGN KEY (instance_id) REFERENCES workflow_instances(id),
    CONSTRAINT fk_node_participant FOREIGN KEY (participant_execution_id) REFERENCES participant_executions(id)
);

CREATE TABLE workflow_tasks (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36) NOT NULL,
    participant_execution_id VARCHAR(36),
    node_execution_id VARCHAR(36) NOT NULL,
    node_id VARCHAR(100) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description VARCHAR(2000),
    assignee_id VARCHAR(36),
    claimant_id VARCHAR(36),
    status VARCHAR(20) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    due_at TIMESTAMP,
    form_schema LONGTEXT NOT NULL,
    allowed_actions LONGTEXT NOT NULL,
    resolution_snapshot LONGTEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    claimed_at TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT fk_task_instance FOREIGN KEY (instance_id) REFERENCES workflow_instances(id),
    CONSTRAINT fk_task_participant FOREIGN KEY (participant_execution_id) REFERENCES participant_executions(id),
    CONSTRAINT fk_task_node FOREIGN KEY (node_execution_id) REFERENCES node_executions(id),
    CONSTRAINT fk_task_assignee FOREIGN KEY (assignee_id) REFERENCES hrm_users(id),
    CONSTRAINT fk_task_claimant FOREIGN KEY (claimant_id) REFERENCES hrm_users(id)
);

CREATE TABLE task_submissions (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    revision_no INT NOT NULL,
    action VARCHAR(30) NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    form_data LONGTEXT NOT NULL,
    comment_text VARCHAR(2000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (task_id, revision_no),
    CONSTRAINT fk_submission_task FOREIGN KEY (task_id) REFERENCES workflow_tasks(id),
    CONSTRAINT fk_submission_actor FOREIGN KEY (actor_id) REFERENCES hrm_users(id)
);

CREATE TABLE evaluation_results (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36) NOT NULL,
    participant_user_id VARCHAR(36) NOT NULL,
    period_key VARCHAR(100) NOT NULL,
    self_score DECIMAL(10,2),
    manager_score DECIMAL(10,2),
    manager_competency VARCHAR(100),
    evaluation_valid BOOLEAN NOT NULL,
    result_data LONGTEXT NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (instance_id, participant_user_id),
    CONSTRAINT fk_eval_instance FOREIGN KEY (instance_id) REFERENCES workflow_instances(id),
    CONSTRAINT fk_eval_user FOREIGN KEY (participant_user_id) REFERENCES hrm_users(id)
);

CREATE TABLE notification_deliveries (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36),
    task_id VARCHAR(36),
    recipient_id VARCHAR(36) NOT NULL,
    channel VARCHAR(30) NOT NULL,
    title_text VARCHAR(500) NOT NULL,
    body_text LONGTEXT NOT NULL,
    delivery_status VARCHAR(30) NOT NULL,
    dedup_key VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    CONSTRAINT fk_notice_instance FOREIGN KEY (instance_id) REFERENCES workflow_instances(id),
    CONSTRAINT fk_notice_task FOREIGN KEY (task_id) REFERENCES workflow_tasks(id),
    CONSTRAINT fk_notice_user FOREIGN KEY (recipient_id) REFERENCES hrm_users(id)
);

CREATE TABLE runtime_events (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36) NOT NULL,
    participant_execution_id VARCHAR(36),
    node_execution_id VARCHAR(36),
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description VARCHAR(2000),
    event_status VARCHAR(30) NOT NULL,
    actor_id VARCHAR(36),
    event_data LONGTEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_instance FOREIGN KEY (instance_id) REFERENCES workflow_instances(id)
);

CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    actor_id VARCHAR(36),
    action VARCHAR(80) NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    organization_scope_id VARCHAR(36),
    before_data LONGTEXT,
    after_data LONGTEXT,
    metadata LONGTEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_org_parent ON organization_units(parent_id);
CREATE INDEX idx_user_org ON hrm_users(organization_unit_id);
CREATE INDEX idx_user_manager ON hrm_users(manager_id);
CREATE INDEX idx_instance_workflow ON workflow_instances(workflow_id, started_at);
CREATE INDEX idx_participant_instance ON participant_executions(instance_id, status);
CREATE INDEX idx_task_assignee ON workflow_tasks(assignee_id, status, due_at);
CREATE INDEX idx_task_instance ON workflow_tasks(instance_id, status);
CREATE INDEX idx_event_instance ON runtime_events(instance_id, created_at);
