ALTER TABLE node_executions ADD COLUMN execution_order INT NOT NULL DEFAULT 0;
CREATE INDEX idx_node_exec_order ON node_executions(instance_id, execution_order);
