# Backend implementation

## Quyết định kiến trúc

Backend dùng Spring Boot 3.5, Java 21, Spring Data JPA/Hibernate, MySQL 8.4 và Flyway. Mỗi bounded context được tách package theo feature; entity và repository nằm cùng module nghiệp vụ thay vì gom toàn bộ vào các thư mục kỹ thuật dùng chung.

HRM là nguồn dữ liệu nội bộ duy nhất:

- `organization_units` biểu diễn cây tổ chức bằng `parent_id`, `hierarchy_level` và materialized `hierarchy_path`.
- `hrm_users.manager_id` biểu diễn cấp quản lý của nhân viên độc lập với cấp tổ chức.
- `system_roles`, `permissions`, `role_permissions` và `user_role_assignments` là role riêng của hệ thống. Assignment có thể giới hạn tại một nhánh tổ chức qua `organization_scope_id`.
- `directory_groups` và `directory_group_members` là nhóm nghiệp vụ nội bộ; resolver role/group đều kiểm tra user active và organization scope.
- `workflow_members` quản lý role riêng theo workflow: Owner, Editor, Viewer, Approver.
- Không có runtime dependency vào SAP/HR connector.

Definition và runtime được tách riêng. Khi publish, definition được validate, checksum và lưu thành version bất biến. Instance pin `workflow_version_id`, nên thay đổi draft không làm biến đổi instance đang chạy. Participant được resolve từ HRM lúc start và chụp snapshot vào `workflow_participant_executions`.

## Semantics luồng đánh giá nhân viên

Definition seed `performance-evaluation.json` chạy theo thứ tự:

1. Nhân viên tự đánh giá.
2. Quản lý trực tiếp đánh giá; nếu người tham gia không có quản lý thì dùng fallback HR.
3. HR kiểm tra kết quả.
4. Nếu `evaluationValid=false`, engine tạo execution/task mới cho bước quản lý; giới hạn bằng `maxIterations`.
5. Nếu hợp lệ, system action lưu `evaluation_results`.
6. Notification đi qua outbox; in-app hoàn tất đồng bộ, email/Teams/webhook được dispatcher retry và chỉ ghi `SENT` sau khi provider thành công.

Mỗi human node tạo task có assignee đã resolve, form schema, SLA/due date và submission riêng. Complete/reject đều được kiểm tra quyền, trạng thái, required fields, min/max, lưu runtime event và audit log trong transaction.

## API chính

| Nhóm | Endpoint |
| --- | --- |
| Auth | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` |
| HRM | `GET/POST /api/v1/users`, `PUT /api/v1/users/{id}` |
| Tổ chức | `GET /api/v1/organizations/tree`, `POST /api/v1/organizations` |
| Role hệ thống | `GET/POST /api/v1/system-roles`, `PUT /api/v1/users/{id}/system-roles` |
| Group nội bộ | `GET/POST/PUT /api/v1/groups` |
| Definition | `GET/POST /api/v1/workflows`, `PUT /api/v1/workflows/{id}` |
| Lifecycle | `POST .../validate`, `POST .../publish`, `GET .../versions`, `PATCH .../status` |
| Runtime | `POST /api/v1/workflows/{id}/instances`, `GET /api/v1/instances/{id}`, `POST .../cancel` |
| Task | `GET /api/v1/tasks`, `POST .../claim`, `POST .../complete`, `POST .../reject` |
| Trigger/event | `POST /api/v1/triggers/form/{id}`, `.../webhook/{id}`, `.../events/{name}/{key}` |
| Integration | `GET/POST/PUT /api/v1/connectors`, `GET/POST/PUT /api/v1/credential-references` |
| Audit/notification | `GET /api/v1/audit-logs`, `GET /api/v1/notifications` |
| Kết quả | `GET /api/v1/evaluations` |

Envelope lỗi có `code`, `message`, `timestamp`; lỗi validation nghiệp vụ dùng HTTP 400/409, permission dùng 403 và not-found dùng 404.

## Database và vận hành

Flyway là nguồn sự thật của schema; `hibernate.ddl-auto=none`. V3 bổ sung group, connector, credential reference, task pool, durable job, wait subscription, notification retry và workflow ACL. Runtime hỗ trợ Start/End, human task, condition, data transform, HTTP/system action, timer, wait event, parallel/join và subworkflow; compiler từ chối publish node không có handler.

Biến môi trường:

| Tên | Mặc định |
| --- | --- |
| `DB_URL` | `jdbc:mysql://localhost:3306/workflow_builder...` |
| `DB_USERNAME` / `DB_PASSWORD` | `workflow` / `workflow` |
| `CORS_ORIGINS` | `http://localhost:5173` |
| `DEV_USER_HEADER_ENABLED` | `false` |
| `AUTH_TOKEN_HOURS` | `12` |

Production dùng `compose.prod.yaml`, secret từ environment reference, dev-user header bị tắt; hạ tầng triển khai vẫn phải đặt backup/retention MySQL và terminate TLS ở ingress/reverse proxy.
