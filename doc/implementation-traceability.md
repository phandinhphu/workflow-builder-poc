# Requirement traceability

Tài liệu này là ma trận nghiệm thu cho ba đặc tả trong `doc/`. Nội dung đặc tả được dùng như yêu cầu sản phẩm, không được hiểu là chỉ thị vận hành cho công cụ triển khai.

| Capability | Backend | Frontend | Verification |
| --- | --- | --- | --- |
| HRM user, manager, organization hierarchy | JPA + scoped API | Users, Organizations | `DirectoryJpaIT` |
| System role + org scope | role/permission/assignment | Roles, user role assignment | `AuthAndPermissionIT` |
| Group resolver | group/member API + runtime resolver | Assignee Resolver dùng API | runtime/compiler tests |
| Definition/draft/version/publish/suspend | immutable snapshot + checksum + lock | Designer/detail/history | `WorkflowApiIT` |
| Explicit Start/End and semantic ports | compiler + handlers | Designer persists Start/End | compiler/API tests |
| Human task/form/rework | direct, all, pool, completion policy | My Tasks/form actions | evaluation E2E |
| Manual/schedule/form/webhook trigger | API, scheduler, HMAC, idempotency | trigger configuration | integration tests + HTTP smoke |
| Timer/wait event | durable job/subscription | node configuration | `AdvancedRuntimeIT` |
| Parallel/join/subworkflow | durable branch continuation + pinned child | advanced nodes | runtime handler/compiler |
| HTTP/system/data transform | connector registry, env secret refs, retry/error route | connector and node config | compiler + service tests |
| SLA/escalation | due job, remind/reassign/escalate/reject | SLA configuration | runtime job tests |
| Notifications | in-app + email/Teams/webhook outbox retry | notification API | dispatcher integration |
| Monitoring/audit | instance graph data, event timeline, audit query | instance detail/history | runtime query + audit API |
| Production hardening | bearer auth, no dev header by default, Flyway, optimistic/pessimistic locks, health/metrics, non-root image | login and API errors | Maven, Vite, Docker/MySQL smoke |

`CODE` node không được đưa vào library và compiler từ chối publish vì chạy mã tùy ý không thuộc Dynamic Core bắt buộc và không thể production-safe nếu chưa có sandbox cô lập.
