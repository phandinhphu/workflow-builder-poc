-- =========================================================================
-- V12: Add failure_reason column to workflow_instances
-- Supports decoupling technical instance execution status and business outcome
-- =========================================================================

ALTER TABLE workflow_instances ADD COLUMN failure_reason VARCHAR(2000) NULL;
