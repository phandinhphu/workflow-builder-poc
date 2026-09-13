# Bảng map yêu cầu

## 1. Mục đích

Tài liệu này đối chiếu các yêu cầu trong:

- [`doc/workflow_requirement.md`](../workflow_requirement.md)
- [`doc/Workflow_Builder_Detailed_System_Specification.md`](../Workflow_Builder_Detailed_System_Specification.md)
- [`doc/Workflow_Builder_Detailed_System_Specification_v2_Expanded.md`](../Workflow_Builder_Detailed_System_Specification_v2_Expanded.md)
- [`doc/Workflow_Builder_UI_Implementation_Specification.md`](../Workflow_Builder_UI_Implementation_Specification.md)

với source hiện tại trong `backend/src` và `frontend/src`.

Kết luận chỉ phản ánh trạng thái source tại thời điểm lập bảng, không mặc định rằng nội dung trong đặc tả đã được triển khai nếu không tìm thấy implementation hoặc test tương ứng.

## 2. Quy ước trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| **Làm được** | Có implementation tương ứng ở backend/frontend và có bằng chứng kiểm thử hoặc API/runtime rõ ràng. |
| **Làm một phần** | Có một phần implementation, nhưng thiếu một hoặc nhiều chi tiết của yêu cầu, hoặc còn phụ thuộc cấu hình/provider. |
| **Chưa làm được** | Chưa có implementation thực thi yêu cầu, hoặc compiler/runtime chủ động từ chối tính năng đó. |

## 3. Ma trận tổng hợp

| ID | Nhóm | Yêu cầu | Trạng thái | Bằng chứng source / kiểm thử | Ghi chú hoặc phần còn thiếu |
|---|---|---|---|---|---|
| WF-01 | Workflow | Tạo workflow, nhập tên/mô tả/loại/module/owner/version | **Làm được** | [`WorkflowService.java`](../../backend/src/main/java/com/acme/workflow/workflow/WorkflowService.java), [`WorkflowController.java`](../../backend/src/main/java/com/acme/workflow/workflow/WorkflowController.java), [`WorkflowApiIT.java`](../../backend/src/test/java/com/acme/workflow/workflow/WorkflowApiIT.java) | Có API create và màn hình tạo workflow. |
| WF-02 | Workflow | Chỉnh sửa thông tin workflow và draft | **Làm được** | [`WorkflowService.java`](../../backend/src/main/java/com/acme/workflow/workflow/WorkflowService.java), [`WorkflowBuilder.tsx`](../../frontend/src/pages/WorkflowBuilder.tsx) | Có optimistic lock qua `lockVersion` để phát hiện xung đột cập nhật. |
| WF-03 | Workflow | Tạo workflow từ template | **Làm một phần** | [`WorkflowBuilder.tsx`](../../frontend/src/pages/WorkflowBuilder.tsx), `frontend/src/data/mockData.ts` | Frontend có template/mock flow; chưa thấy API/template repository riêng ở backend. |
| WF-04 | Workflow | Xóa workflow dạng soft delete | **Làm được** | [`WorkflowService.java`](../../backend/src/main/java/com/acme/workflow/workflow/WorkflowService.java), [`V1__core_schema.sql`](../../backend/src/main/resources/db/migration/V1__core_schema.sql) | Có trạng thái `DELETED`, `deleted_at`, và workflow đã xóa không xuất hiện trong list/get. |
| WF-05 | Workflow | Chỉ xóa khi không có instance đang chạy | **Làm được** | [`WorkflowService.java`](../../backend/src/main/java/com/acme/workflow/workflow/WorkflowService.java) | Backend chặn khi còn instance `RUNNING`; không chặn riêng các instance đã hoàn tất. |
| WF-06 | Workflow | Publish sau khi validate thành công | **Làm được** | [`WorkflowService.java`](../../backend/src/main/java/com/acme/workflow/workflow/WorkflowService.java), [`WorkflowCompiler.java`](../../backend/src/main/java/com/acme/workflow/workflow/WorkflowCompiler.java), [`WorkflowApiIT.java`](../../backend/src/test/java/com/acme/workflow/workflow/WorkflowApiIT.java) | Publish tạo version snapshot, checksum và validation report. |
| WF-07 | Workflow | Suspend workflow đã publish | **Làm được** | `WorkflowService.changeStatus`, `PATCH /api/v1/workflows/{id}/status` trong [`WorkflowController.java`](../../backend/src/main/java/com/acme/workflow/workflow/WorkflowController.java) | Runtime không cho start từ workflow đang `SUSPENDED`. |
| WF-08 | Workflow | Theo dõi instance, trạng thái và lịch sử xử lý | **Làm được** | [`RuntimeController.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeController.java), [`RuntimeQueryService.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeQueryService.java), `frontend/src/pages/InstanceDetail.tsx` | Có instance detail, timeline, node execution, task và event. |
| WF-09 | Workflow | Version history và snapshot bất biến | **Làm được** | [`WorkflowService.java`](../../backend/src/main/java/com/acme/workflow/workflow/WorkflowService.java), `frontend/src/components/VersionHistoryModal.tsx`, [`WorkflowApiIT.java`](../../backend/src/test/java/com/acme/workflow/workflow/WorkflowApiIT.java) | Instance lưu `workflow_version_id`, không đọc lại draft đang sửa. |
| WF-10 | Workflow | Ghi change log: ai sửa, lúc nào, thay đổi gì | **Làm được** | [`AuditService.java`](../../backend/src/main/java/com/acme/workflow/common/AuditService.java), [`AuditLogEntity.java`](../../backend/src/main/java/com/acme/workflow/audit/domain/AuditLogEntity.java), [`AuditController.java`](../../backend/src/main/java/com/acme/workflow/audit/AuditController.java) | Có audit cho create/update/publish/status/member; mức chi tiết phụ thuộc payload before/after của từng use case. |
| WF-11 | Designer | Start và End node bắt buộc | **Làm được** | [`WorkflowCompiler.java`](../../backend/src/main/java/com/acme/workflow/workflow/WorkflowCompiler.java), [`ValidationDrawer.tsx`](../../frontend/src/components/ValidationDrawer.tsx) | Có backend validation và frontend validation. |
| WF-12 | Designer | Approval step với approver, deadline, escalation, reject action | **Làm một phần** | `Approval` thuộc human task trong [`RuntimeEngineService.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeEngineService.java), [`SlaConfigPanel.tsx`](../../frontend/src/components/sla/SlaConfigPanel.tsx) | Approver, due date, SLA action và reject route có; không thấy một model “escalation rule” độc lập đầy đủ như tài liệu gốc. |
| WF-13 | Designer | Review step | **Làm được** | `REVIEW` trong [`RuntimeEngineService.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeEngineService.java), [`nodeTypeRegistry.ts`](../../frontend/src/constants/nodeTypeRegistry.ts) | Có task type, resolver, action và route. |
| WF-14 | Designer | Assignment step cho user/group/pool | **Làm được** | [`RuntimeEngineService.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeEngineService.java), [`DirectoryGroupService.java`](../../backend/src/main/java/com/acme/workflow/directory/DirectoryGroupService.java), [`NodeLibraryPanel.tsx`](../../frontend/src/components/NodeLibraryPanel.tsx) | Hỗ trợ direct user, direct all, claimable pool, group/candidate resolver. |
| WF-15 | Designer | Notification step | **Làm được** | [`NotificationNodeExecutor.java`](../../backend/src/main/java/com/acme/workflow/runtime/executor/NotificationNodeExecutor.java), [`NotificationDispatcher.java`](../../backend/src/main/java/com/acme/workflow/runtime/NotificationDispatcher.java) | Có outbox/delivery và dispatcher retry. |
| WF-16 | Designer | System action: update record, gọi API, tạo record, cập nhật trạng thái | **Làm một phần** | [`SystemNodeExecutor.java`](../../backend/src/main/java/com/acme/workflow/runtime/executor/SystemNodeExecutor.java), [`IntegrationService.java`](../../backend/src/main/java/com/acme/workflow/integration/IntegrationService.java), `frontend/src/pages/TicketHub.tsx`, `frontend/src/pages/CreateTicketPage.tsx` | Có connector/HTTP action tổng quát; chưa có adapter domain riêng cho mọi loại “create/update record”. |
| WF-17 | Designer | Xóa/sửa connection | **Làm được** | `frontend/src/components/EdgeConfigPanel.tsx`, `frontend/src/pages/WorkflowBuilder.tsx`, `ConnectionDefinition` trong `frontend/src/types/workflow.ts` | Connection lưu source port, target, condition, priority, default và label. |
| WF-18 | Designer | Condition IF/ELSE, sửa operator/value/biểu thức | **Làm được** | [`ConditionNodeExecutor.java`](../../backend/src/main/java/com/acme/workflow/runtime/executor/ConditionNodeExecutor.java), [`ConditionBuilderModal.tsx`](../../frontend/src/components/ConditionBuilderModal.tsx), [`ExpressionEngine.java`](../../backend/src/main/java/com/acme/workflow/runtime/ExpressionEngine.java) | Có condition node và conditional connection. |
| WF-19 | Designer | Approver cố định, theo role, manager, department head, dynamic | **Làm được** | [`RuntimeValueResolver.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeValueResolver.java), [`AssigneeResolver.tsx`](../../frontend/src/components/AssigneeResolver.tsx) | Có thêm group, initiator, creator, current participant và resolver theo participant. |
| WF-20 | Designer | Form builder và validate dữ liệu nhập | **Làm được** | [`FormBuilderModal.tsx`](../../frontend/src/components/FormBuilderModal.tsx), [`RuntimeEngineService.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeEngineService.java), [`RuntimeValidationIT.java`](../../backend/src/test/java/com/acme/workflow/runtime/RuntimeValidationIT.java) | Có schema, required, type, min/max và lưu submission. |
| WF-21 | Designer | Các node nâng cao: data transform, timer, wait event, parallel/join, subworkflow | **Làm được** | `backend/src/main/java/com/acme/workflow/runtime/executor/`, [`AdvancedRuntimeIT.java`](../../backend/src/test/java/com/acme/workflow/runtime/AdvancedRuntimeIT.java), [`NodeLibraryPanel.tsx`](../../frontend/src/components/NodeLibraryPanel.tsx) | Có executor và/hoặc runtime test cho các node này. |
| WF-22 | Designer | Node `CODE` chạy mã tùy ý | **Chưa làm được** | [`WorkflowCompiler.java`](../../backend/src/main/java/com/acme/workflow/workflow/WorkflowCompiler.java), [`implementation-traceability.md`](../implementation-traceability.md) | Model type có thể chứa `CODE`, nhưng node không có trong library và compiler từ chối vì không có runtime handler/sandbox. |
| WF-23 | Notification | Trigger Created/Approved/Rejected/Completed | **Làm một phần** | [`NotificationNodeExecutor.java`](../../backend/src/main/java/com/acme/workflow/runtime/executor/NotificationNodeExecutor.java), [`RuntimeEngineService.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeEngineService.java) | Có notification node theo cấu hình và event runtime; chưa thấy một registry/template trigger độc lập bao phủ đầy đủ bốn event như requirement gốc. |
| WF-24 | Notification | Email, in-app, Teams, webhook | **Làm một phần** | [`NotificationDispatcher.java`](../../backend/src/main/java/com/acme/workflow/runtime/NotificationDispatcher.java), [`NotificationController.java`](../../backend/src/main/java/com/acme/workflow/runtime/NotificationController.java) | In-app có; email cần JavaMail provider; Teams/webhook cần connector `TEAMS_NOTIFICATION`/`WEBHOOK_NOTIFICATION` và credential/config hợp lệ. UI registry còn hiển thị một số label cũ như Slack. |
| WF-25 | SLA | Due date theo giờ/ngày | **Làm được** | `dueAt` và `SLA_DUE` trong [`RuntimeEngineService.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeEngineService.java), [`duration.ts`](../../frontend/src/utils/duration.ts) | Hỗ trợ ISO duration và chuẩn hóa thời lượng; scheduler tạo durable job. |
| WF-26 | SLA | Reminder, escalation/reassign, auto-reject khi quá hạn | **Làm được** | Các nhánh `REMIND`, `ESCALATE`, `REASSIGN`, `REJECT` trong [`RuntimeEngineService.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeEngineService.java), [`SlaConfigPanel.tsx`](../../frontend/src/components/sla/SlaConfigPanel.tsx) | Hành động được thực thi qua runtime job; hiệu quả gửi thông báo/escalate còn phụ thuộc resolver và provider. |
| WF-27 | Runtime | Start/stop/cancel/complete instance | **Làm một phần** | [`RuntimeController.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeController.java), [`RuntimeEngineService.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeEngineService.java) | Có start và cancel; “stop/pause instance” như một trạng thái điều khiển độc lập chưa thấy API pause/resume. |
| WF-28 | Runtime | Instance status Pending/Approved/Rejected/Completed/Cancelled | **Làm một phần** | `InstanceStatus` trong `frontend/src/types/workflow.ts`, `WorkflowInstanceEntity.java` | Backend có `PENDING/RUNNING/COMPLETED/REJECTED/CANCELLED`; không có status `APPROVED` độc lập, approved là business outcome/port của task. |
| WF-29 | Runtime | Search instance theo workflow name, request code, người tạo | **Làm một phần** | [`RuntimeController.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeController.java), [`RuntimeQueryService.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeQueryService.java) | Có `workflowId`, `status`, `search`; cần kiểm tra/cải thiện để search đầy đủ workflow name, request code và creator theo đúng acceptance criteria. |
| WF-30 | Runtime | Filter Pending/Approved/Rejected/Completed/Cancelled | **Làm một phần** | `GET /api/v1/instances?status=...`, `InstancesList.tsx` | Có filter theo status thực tế; `Approved` không phải instance status backend. |
| WF-31 | Runtime | Task complete/reject/request change | **Làm được** | [`RuntimeController.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeController.java), [`RuntimeEngineService.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeEngineService.java), `frontend/src/pages/MyTasks.tsx` | Có kiểm tra actor, task state, form validation, submission, event và audit. |
| WF-32 | Security | Admin/Owner/Editor/Viewer/Approver theo requirement gốc | **Làm một phần** | [`WorkflowAccessService.java`](../../backend/src/main/java/com/acme/workflow/workflow/WorkflowAccessService.java), [`V2__seed_internal_hrm.sql`](../../backend/src/main/resources/db/migration/V2__seed_internal_hrm.sql) | Có workflow ACL Owner/Editor/Viewer/Approver; role hệ thống thực tế là `SYSTEM_ADMIN`, `HR_ADMIN`, `WORKFLOW_DESIGNER`, `EMPLOYEE`, không phải năm role RBAC cố định trong tài liệu gốc. |
| WF-33 | Security | JWT/token login, permission và organization scope | **Làm được** | [`AuthController.java`](../../backend/src/main/java/com/acme/workflow/auth/AuthController.java), [`PermissionService.java`](../../backend/src/main/java/com/acme/workflow/auth/PermissionService.java), [`AuthAndPermissionIT.java`](../../backend/src/test/java/com/acme/workflow/auth/AuthAndPermissionIT.java) | Có bearer token, role/permission assignment và kiểm tra scope theo cây tổ chức. |
| WF-34 | HRM | User, manager, organization hierarchy | **Làm được** | `backend/src/main/java/com/acme/workflow/identity/`, `backend/src/main/java/com/acme/workflow/directory/`, [`DirectoryJpaIT.java`](../../backend/src/test/java/com/acme/workflow/directory/DirectoryJpaIT.java) | Có CRUD/API, manager và materialized hierarchy path. |
| WF-35 | Audit | Audit log và lịch sử runtime | **Làm được** | `backend/src/main/java/com/acme/workflow/audit/`, [`RuntimeQueryService.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeQueryService.java) | Có audit persistence và runtime event timeline. |
| WF-36 | Production | Retry/idempotency cho trigger, job, notification và integration | **Làm được** | [`WorkflowTriggerService.java`](../../backend/src/main/java/com/acme/workflow/runtime/WorkflowTriggerService.java), [`RuntimeJobScheduler.java`](../../backend/src/main/java/com/acme/workflow/runtime/RuntimeJobScheduler.java), [`NotificationDispatcher.java`](../../backend/src/main/java/com/acme/workflow/runtime/NotificationDispatcher.java) | Có HMAC webhook, idempotency key, durable job, retry/backoff và dedup key. |
| WF-37 | Production | Monitoring/health/metrics | **Làm được** | [`application.yml`](../../backend/src/main/resources/application.yml), `pom.xml` | Có Actuator health/metrics/prometheus và Micrometer registry; chưa phải một hệ thống dashboard/alerting hoàn chỉnh. |
| WF-38 | Production | Production security: tắt dev header, secret qua environment | **Làm được** | [`application.yml`](../../backend/src/main/resources/application.yml), [`compose.prod.yaml`](../../compose.prod.yaml), `.env.production.example` | Mặc định `DEV_USER_HEADER_ENABLED=false`; webhook secret và DB credentials lấy từ environment. |

## 4. Các điểm cần lưu ý khi nghiệm thu

### 4.1. Không dùng “Approved” như instance status

Trong source, trạng thái kỹ thuật của instance là:

```text
PENDING, RUNNING, COMPLETED, REJECTED, CANCELLED
```

Kết quả nghiệp vụ được lưu riêng qua business outcome và outcome port như `APPROVED`, `REJECTED`, `REQUEST_CHANGE`. Vì vậy màn hình hoặc báo cáo cần phân biệt:

- **Instance status**: vòng đời kỹ thuật của lần chạy.
- **Business outcome**: kết quả nghiệp vụ của workflow/task.

### 4.2. “Làm được” không đồng nghĩa provider đã được cấu hình

Email, Teams, webhook và HTTP integration có code xử lý, nhưng production cần cấu hình:

- connector tương ứng;
- credential reference/secret environment;
- SMTP hoặc endpoint/provider;
- retry và network policy.

Nếu thiếu provider, job sẽ retry rồi chuyển `FAILED`; đây là hành vi lỗi rõ ràng, không phải delivery thành công giả.

### 4.3. Các giới hạn đã xác nhận

1. Không có sandbox để chạy mã tùy ý cho node `CODE`.
2. Chưa có API pause/resume instance độc lập.
3. Tìm kiếm instance cần được nghiệm thu riêng theo từng trường `workflow name`, `request code`, `creator`.
4. Notification trigger theo bốn event trong requirement gốc chưa được thể hiện thành một registry/template độc lập; hiện chủ yếu được cấu hình qua notification node và runtime event.
5. Template workflow hiện thiên về frontend/mock data, chưa có backend template catalog đầy đủ.

## 5. Kết luận

Phần lõi MVP đã đáp ứng được việc tạo, validate, publish, version, chạy workflow, human task, resolver, condition, SLA, trigger, notification, audit và runtime node nâng cao. Các yêu cầu cần đánh dấu **làm một phần** khi nghiệm thu là những phần phụ thuộc provider/cấu hình hoặc có semantics khác tài liệu gốc. Yêu cầu **chưa làm được** rõ ràng nhất hiện tại là chạy mã tùy ý qua node `CODE`; compiler chủ động chặn tính năng này để tránh rủi ro production.
