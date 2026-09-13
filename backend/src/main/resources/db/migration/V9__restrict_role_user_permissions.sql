-- Revoke non-ticket permissions from ROLE-USER so that ROLE_USER can only create/view tickets and handle personal tasks
DELETE FROM role_permissions
WHERE role_id = 'ROLE-USER'
  AND permission_code NOT IN ('TICKET_CREATE', 'TICKET_VIEW');
