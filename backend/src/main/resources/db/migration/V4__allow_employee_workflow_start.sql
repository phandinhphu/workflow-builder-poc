INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM system_roles r
JOIN permissions p ON p.code = 'INSTANCE_START'
WHERE r.id = 'ROLE-USER'
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions existing
      WHERE existing.role_id = r.id
        AND existing.permission_code = p.code
  );
