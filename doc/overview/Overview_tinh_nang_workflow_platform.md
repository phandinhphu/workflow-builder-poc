# Tổng quan tính năng Workflow Platform

## 1. Giới thiệu

Đây là nền tảng Workflow Builder và Workflow Runtime cho phép người dùng định nghĩa quy trình bằng đồ thị node/connection, kiểm tra, publish và thực thi nhiều quy trình khác nhau từ cấu hình JSON. Engine không hard-code một quy trình nghiệp vụ cụ thể; workflow được lưu trong database và instance được ghim vào version đã publish.

Một workflow gồm:

- **Node**: bước khởi đầu/kết thúc, human task, điều kiện, thông báo, system action, xử lý dữ liệu hoặc bước chờ.
- **Connection**: liên kết giữa các node, có `sourcePort`, điều kiện, độ ưu tiên và nhánh mặc định.
- **Variable, trigger và context**: dữ liệu đầu vào, biến có binding và dữ liệu đầu ra của các node trước.

## 2. Phạm vi hiện tại

- Thiết kế workflow kéo-thả trên giao diện React/xyflow.
- Quản lý bản nháp, validate, publish, version bất biến và trạng thái workflow.
- Khởi tạo và theo dõi workflow instance theo participant.
- Giao task cho người dùng hoặc pool, claim, complete, reject và request change.
- Resolve participant/assignee từ HRM nội bộ, role, group, manager và dữ liệu trigger.
- Chạy system action/HTTP qua connector, gửi notification, xử lý SLA và các bước chờ.
- Quản trị HRM nội bộ, cây tổ chức, nhóm, role hệ thống, connector, credential reference và audit log.

Hệ thống hiện không có runtime dependency bắt buộc vào SAP hoặc một HR connector bên ngoài; HRM nội bộ là nguồn dữ liệu cho user, manager, organization và group.

## 3. Người dùng và phân quyền

### 3.1. Role hệ thống được seed

| Role | Phạm vi chính |
|---|---|
| `SYSTEM_ADMIN` | Toàn quyền Workflow Builder và HRM nội bộ |
| `HR_ADMIN` | Quản lý user, tổ chức và group trong phạm vi được cấp |
| `WORKFLOW_DESIGNER` | Tạo, sửa, validate, publish workflow và khởi tạo instance |
| `EMPLOYEE` | Xem workflow/instance và thực hiện task được giao |

Permission được lưu riêng trong `permissions`, liên kết qua `role_permissions`. Assignment của user có thể giới hạn theo `organization_scope_id`; backend kiểm tra cả permission và quan hệ cây tổ chức.

### 3.2. ACL theo workflow

Mỗi workflow có bảng thành viên riêng với các vai trò:

- `OWNER`: sở hữu và quản lý workflow.
- `EDITOR`: sửa bản nháp.
- `VIEWER`: xem workflow và instance.
- `APPROVER`: tham gia các human task theo cấu hình.

ACL workflow không thay thế role hệ thống: request vẫn phải qua cả kiểm tra permission hệ thống và quyền trên workflow khi use case yêu cầu.

## 4. Vòng đời workflow

```text
Workflow Definition (DRAFT)
        | validate
        v
Workflow Version (snapshot bất biến)
        | publish/activate
        v
Active Version
        | start
        v
Workflow Instance -> Participant Execution -> Node Execution
```

- Bản nháp nằm trong `workflow_definitions.draft_definition`.
- Validate kiểm tra graph, start/end, node handler, connection, cấu hình node, trigger, resolver, form, SLA và connector.
- Publish tạo snapshot trong `workflow_versions`, checksum và validation report. Runtime chỉ dùng version active.
- Definition có thể chuyển `DRAFT`, `PUBLISHED`, `SUSPENDED` hoặc `DELETED`; xóa là xóa mềm.
- Instance lưu `workflow_version_id`, vì vậy thay đổi draft không làm thay đổi instance đang chạy.
- Instance hỗ trợ idempotency key theo workflow để tránh tạo trùng.

## 5. Node và runtime

Runtime handler hiện có các loại sau:

| Nhóm | Node/type được hỗ trợ | Kết quả hoặc hành vi |
|---|---|---|
| Điều khiển | `START`, `END`, `CONDITION` | Bắt đầu/kết thúc; điều kiện trả `TRUE` hoặc `FALSE` |
| Human task | `ASSIGNMENT`, `APPROVAL`, `REVIEW`, `FORM` | Tạo task, resolve assignee, form, completion policy và submission |
| Thông báo | `NOTIFICATION` | Tạo delivery theo kênh và dispatch bất đồng bộ |
| Tích hợp | `SYSTEM`, `HTTP` | Gọi action/connector đã cấu hình |
| Dữ liệu | `DATA`, `DATA_TRANSFORM` | Mapping/transform context và trả output |
| Chờ | `TIMER`, `WAIT_EVENT` | Tạo durable job hoặc subscription; tiếp tục khi đến hạn/có event |
| Điều phối | `PARALLEL_SPLIT`, `JOIN` | Chạy các nhánh song song và chờ join |
| Composition | `SUBWORKFLOW` | Khởi chạy workflow con và liên kết instance cha-con |

Compiler từ chối publish node không có runtime handler. `CODE` hiện có trong model/designer type nhưng không có executor backend độc lập; không nên mô tả đây là node code đã chạy trong runtime.

### 5.1. Routing và context

Connection dùng port tường minh như `SUCCESS`, `APPROVED`, `REJECTED`, `TRUE`, `FALSE`, `TIMEOUT`, `ERROR` hoặc `JOINED`. Engine lưu input snapshot, output, outcome port và lỗi cho từng `node_execution`, sau đó đánh giá connection theo outcome, điều kiện và priority.

Biểu thức có thể tham chiếu:

- `nodes.<nodeId>.output.<field>`
- `variables.<name>`
- `trigger.<field>`
- context runtime của instance/participant

Instance status (`RUNNING`, `COMPLETED`, `REJECTED`, `CANCELLED`) được tách khỏi business outcome và outcome của từng task.

## 6. Participant, task và SLA

Participant được resolve lúc khởi tạo instance và lưu snapshot. Các resolver đang được mô hình hóa gồm user cố định, role, group, initiator/creator, participant hiện tại, manager, department head, dynamic và các resolver theo từng participant.

Human task hỗ trợ:

- assignment trực tiếp một người, tất cả người được resolve hoặc claimable pool;
- candidate user cho pool;
- completion policy `ALL`, `ANY`, `THRESHOLD`, `PER_PARTICIPANT`;
- action `COMPLETE`, `REJECT`, `REQUEST_CHANGE`;
- form schema, required fields, kiểu dữ liệu và giới hạn min/max;
- due date/SLA, priority và notification channel.

SLA được lưu dưới dạng runtime job `SLA_DUE`. Khi đến hạn, cấu hình có thể nhắc nhở, escalate/reassign hoặc reject task. Job và notification có retry, backoff và trạng thái lỗi; scheduler chạy trong backend runtime với chu kỳ cấu hình mặc định 5 giây.

## 7. Trigger và notification

Workflow hỗ trợ các trigger:

- manual;
- form;
- webhook có thể nhận `X-Workflow-Signature` và `Idempotency-Key`;
- schedule được mô hình hóa trong definition và xử lý qua runtime job.

Wait event nhận signal qua `POST /api/v1/triggers/events/{eventName}/{correlationKey}`. Trigger fire có idempotency key và trạng thái xử lý.

Notification lưu delivery riêng cho recipient. Kênh backend hiện hỗ trợ in-app, email, Teams/webhook tùy cấu hình connector. Dispatcher retry tối đa 5 lần; in-app có thể hoàn tất đồng bộ, còn email/Teams/webhook cần provider/connector tương ứng.

## 8. Frontend

Frontend dùng React 19, TypeScript, Vite, Tailwind CSS, Zustand và `@xyflow/react`. Các màn hình chính:

- Service catalog và dashboard;
- workflow list/detail, designer, validation drawer và version history;
- instance list/detail, timeline, context explorer;
- My Tasks;
- user, organization, system role và group;
- connector/credential reference;
- notification.

Designer có node library, trigger library, node/edge config, form builder, assignee resolver, SLA config, test runner và backend validation. Ứng dụng gọi REST API `/api/v1`, nạp user/workflow/instance từ backend và polling notification khi đã xác thực.

## 9. Backend và kiến trúc

Backend là Spring Boot modular monolith, package theo bounded context:

- `auth`: đăng nhập, token, current user và permission;
- `identity`: user, organization, system role và assignment;
- `directory`: HRM, organization tree và group;
- `workflow`: definition, compiler, publish, version và workflow ACL;
- `runtime`: engine, executor, instance, participant, task, evaluation, job và notification;
- `integration`: connector và credential reference;
- `audit`: audit log;
- `common/config`: lỗi API, JSON, security, seed và cấu hình.

Mỗi module chủ yếu gồm controller/service/domain/repository. Runtime executor được đăng ký qua `NodeExecutorFactory`, nên node handler được kiểm tra tập trung khi compile và thực thi.

## 10. Database và dữ liệu

- MySQL 8.4 là database production; H2 MySQL compatibility mode được dùng cho integration test.
- Flyway là nguồn sự thật của schema; Hibernate dùng `ddl-auto=none`.
- Các nhóm bảng chính: HRM/identity, workflow definition/version/member, instance/participant/node execution, task/submission/candidate, evaluation, runtime event/job/wait subscription, notification delivery, connector/credential và audit.
- `V3__production_runtime_capabilities.sql` bổ sung group, connector, credential reference, workflow ACL, durable job, wait subscription, trigger fire, candidate user và notification retry.
- Audit ghi actor, resource, hành động và thời điểm; workflow definition được soft-delete để giữ lịch sử.

## 11. API và vận hành

Các nhóm API chính:

| Nhóm | Base path |
|---|---|
| Auth | `/api/v1/auth` |
| HRM/tổ chức/role/group | `/api/v1/users`, `/organizations`, `/system-roles`, `/groups` |
| Workflow | `/api/v1/workflows` |
| Runtime/Task | `/api/v1/instances`, `/tasks`, `/evaluations` |
| Trigger/event | `/api/v1/triggers` |
| Integration | `/api/v1/connectors`, `/credential-references` |
| Notification/Audit | `/api/v1/notifications`, `/audit-logs` |

Các endpoint runtime đáng chú ý: start instance, xem instance/timeline, cancel instance, list/claim/complete/reject task, signal wait event và xem evaluation. Lỗi API có `code`, `message`, `timestamp`; lỗi permission là HTTP 403, not-found là 404, validation/conflict thường là 400/409.

## 12. Công nghệ

| Hạng mục | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 3.5.16, Spring Web, Spring Data JPA/Hibernate, Spring Security, Maven |
| Database | MySQL 8.4, Flyway; H2 cho test |
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS, Zustand, xyflow |
| Integration | HTTP connector, Spring Mail, credential reference |
| Monitoring | Spring Boot Actuator, Micrometer Prometheus |
| Deployment | Docker Compose |

Cấu hình runtime gồm scheduler/notification delay, giới hạn sync depth, CORS, token lifetime và tùy chọn dev-user header. Production tắt dev-user header và lấy thông tin database/secret từ environment.
