# Kế hoạch tách biệt `instance.status` và `instance.result`

## 1. Mục tiêu

Chuyển từ mô hình hiện tại (1 field `event.status()` gộp cả trạng thái kỹ thuật lẫn kết quả nghiệp vụ) sang mô hình **2 field tách biệt** trên Workflow Instance:

```
instance.status  → Trạng thái KỸ THUẬT của vòng đời thực thi
                    (RUNNING, COMPLETED, CANCELLED, SUSPENDED, FAILED)

instance.result  → Kết quả NGHIỆP VỤ sau khi engine xử lý xong
                    (PENDING, APPROVED, REJECTED, null nếu chưa có kết quả)
```

Mục đích: loại bỏ tận gốc rủi ro nhầm lẫn giữa "engine đã chạy xong" và "nghiệp vụ kết luận ra sao" — nguyên nhân gốc của bug `ticket = Completed` trong khi thực tế bị từ chối.

## 2. Định nghĩa giá trị cho từng field

### 2.1. `instance.status` — vòng đời kỹ thuật

| Giá trị | Ý nghĩa |
|---|---|
| `DRAFT` | Chưa dùng cho Instance thực tế (chỉ dùng cho Workflow Definition) — liệt kê để không nhầm 2 khái niệm |
| `RUNNING` | Engine đang thực thi, chưa tới node cuối |
| `COMPLETED` | Engine đã đi hết đường tới node End một cách bình thường |
| `CANCELLED` | Người dùng/Admin chủ động huỷ instance giữa chừng |
| `SUSPENDED` | Instance bị tạm dừng (ví dụ workflow bị suspend trong lúc đang chạy) |
| `FAILED` | Engine gặp lỗi kỹ thuật khi thực thi (exception, API lỗi, resolver không tìm được người xử lý...) |

> Lưu ý: `FAILED` thuộc về `status`, **không** thuộc về `result` — vì đây là lỗi kỹ thuật của hệ thống, không phải kết quả nghiệp vụ do người duyệt quyết định.

### 2.2. `instance.result` — kết quả nghiệp vụ

| Giá trị | Ý nghĩa | Chỉ có giá trị khi `status` = |
|---|---|---|
| `null` | Chưa có kết quả (đang chạy hoặc kết thúc không qua nhánh nghiệp vụ) | RUNNING, CANCELLED, SUSPENDED, FAILED |
| `PENDING` | Đang chờ quyết định (tuỳ chọn dùng khi cần hiển thị rõ ràng thay vì null) | RUNNING |
| `APPROVED` | Được phê duyệt / hoàn tất theo hướng tích cực | COMPLETED |
| `REJECTED` | Bị từ chối bởi 1 Approval node nào đó trên đường đi | COMPLETED |

**Nguyên tắc bất biến:** `result` chỉ được set khi `status = COMPLETED`. Nếu `status` là `CANCELLED`/`SUSPENDED`/`FAILED`, `result` luôn là `null` — tránh tình trạng vừa Failed vừa Approved gây mâu thuẫn logic.

## 3. Thay đổi ở tầng Runtime Engine (nơi phát sinh event)

### 3.1. Cập nhật `WorkflowRuntimeEvents.InstanceCompletedEvent`

**Hiện tại** (gộp chung):

```java
public record InstanceCompletedEvent(
    String instanceId,
    String status,       // đang mang cả 2 ý nghĩa
    Instant completedAt
) {}
```

**Đề xuất** (tách 2 field rõ ràng):

```java
public record InstanceCompletedEvent(
    String instanceId,
    InstanceStatus status,   // enum: RUNNING, COMPLETED, CANCELLED, SUSPENDED, FAILED
    InstanceResult result,   // enum: null, PENDING, APPROVED, REJECTED
    Instant completedAt,
    String failureReason     // optional, chỉ có giá trị khi status = FAILED, phục vụ debug/alert
) {}
```

Dùng `enum` thay vì `String` để tránh lỗi chính tả (typo case-sensitivity từng gặp) và để compiler bắt lỗi thiếu case khi switch.

### 3.2. Nơi engine set giá trị (ví dụ tại Approval Node handler)

```java
// Khi node Approval được xử lý → REJECT
if (approvalDecision == ApprovalDecision.REJECT) {
    instance.setStatus(InstanceStatus.COMPLETED);
    instance.setResult(InstanceResult.REJECTED);
}

// Khi node Approval được xử lý → APPROVE, và đây là bước cuối
if (approvalDecision == ApprovalDecision.APPROVE && isLastNode) {
    instance.setStatus(InstanceStatus.COMPLETED);
    instance.setResult(InstanceResult.APPROVED);
}

// Khi có lỗi kỹ thuật trong lúc thực thi node (ví dụ System Action gọi API lỗi)
catch (Exception ex) {
    instance.setStatus(InstanceStatus.FAILED);
    instance.setResult(null);
    instance.setFailureReason(ex.getMessage());
}
```

**Việc cần làm:** rà soát toàn bộ nơi trong Runtime Engine hiện đang set `instance.status` (hoặc field tương đương cũ), đảm bảo mọi điểm set đều tuân theo nguyên tắc ở mục 2.2 — đây là bước quan trọng nhất, vì bug cũ xuất phát từ việc thiếu nhất quán ở chính các điểm này.

## 4. Thay đổi ở `TicketWorkflowEventListener`

### 4.1. Bảng mapping tường minh (thay vì if/else rải rác)

```java
private static final Map<StatusResultKey, TicketStatusMapping> STATUS_RESULT_TO_TICKET = Map.of(
    new StatusResultKey(InstanceStatus.COMPLETED, InstanceResult.APPROVED),
        new TicketStatusMapping("APPROVED", "Hoàn tất"),
    new StatusResultKey(InstanceStatus.COMPLETED, InstanceResult.REJECTED),
        new TicketStatusMapping("REJECTED", "Từ chối"),
    new StatusResultKey(InstanceStatus.CANCELLED, null),
        new TicketStatusMapping("CANCELLED", "Đã hủy"),
    new StatusResultKey(InstanceStatus.FAILED, null),
        new TicketStatusMapping("ERROR", "Lỗi xử lý")
);

record StatusResultKey(InstanceStatus status, InstanceResult result) {}
record TicketStatusMapping(String ticketStatus, String stepLabel) {}
```

> Đưa mapping ra thành bảng dữ liệu (thay vì if/else) giúp: (1) dễ đọc, dễ audit toàn bộ luật quy đổi trong 1 chỗ duy nhất; (2) dễ viết unit test cho từng cặp (status, result); (3) tránh quên case khi mở rộng thêm giá trị mới sau này.

### 4.2. Listener sau khi tách

```java
@EventListener
@Transactional
public void onInstanceCompleted(WorkflowRuntimeEvents.InstanceCompletedEvent event) {
    try {
        resolveTicket(event.instanceId()).ifPresent(ticket -> {

            // 1. Idempotency guard — tránh xử lý lại nếu ticket đã ở trạng thái final
            if (isFinalStatus(ticket.status)) {
                log.debug("[TicketWorkflowEventListener] Ticket {} already finalized ({}), skip",
                        ticket.ticketCode, ticket.status);
                return;
            }

            StatusResultKey key = new StatusResultKey(event.status(), event.result());
            TicketStatusMapping mapping = STATUS_RESULT_TO_TICKET.get(key);

            if (mapping == null) {
                // 2. Bắt các case lạ/chưa map thay vì im lặng bỏ qua
                log.warn("[TicketWorkflowEventListener] Unmapped (status={}, result={}) for instance {}, ticket {} not updated",
                        event.status(), event.result(), event.instanceId(), ticket.ticketCode);
                ticket.status = "NEEDS_REVIEW";
                ticket.currentStepName = "Cần kiểm tra";
            } else {
                ticket.status = mapping.ticketStatus();
                ticket.currentStepName = mapping.stepLabel();
            }

            // 3. Nếu là lỗi kỹ thuật, cân nhắc bắn thêm alert cho Owner/Admin
            if (event.status() == InstanceStatus.FAILED) {
                notifyOwnerOfFailure(ticket, event.failureReason());
            }

            ticket.resolvedAt = event.completedAt() != null ? event.completedAt() : Instant.now();
            ticketRepository.save(ticket);

            log.info("[TicketWorkflowEventListener] Finalized ticket {} -> status: {}, step: {}",
                    ticket.ticketCode, ticket.status, ticket.currentStepName);
        });
    } catch (Exception e) {
        log.error("[TicketWorkflowEventListener] Error handling InstanceCompletedEvent for instance {}",
                event.instanceId(), e);
    }
}

private boolean isFinalStatus(String ticketStatus) {
    return Set.of("APPROVED", "REJECTED", "CANCELLED").contains(ticketStatus);
}
```

**Thay đổi so với bản cũ:**
- Bỏ if/else chuỗi, thay bằng lookup trong bảng mapping (mục 4.1) → dễ mở rộng, dễ test.
- Tách hẳn `FAILED` khỏi `REJECTED` — không còn gộp chung như trước.
- Thêm guard chống xử lý lại khi ticket đã final (idempotency).
- Thêm nhánh xử lý case không match trong bảng (`NEEDS_REVIEW`) thay vì im lặng bỏ qua.
- Thêm hook cảnh báo riêng cho trường hợp `FAILED` (lỗi kỹ thuật cần người quản trị biết, khác với `REJECTED` là quyết định nghiệp vụ bình thường).

## 5. Thay đổi ở tầng Database

### 5.1. Bảng `workflow_instance`

```sql
ALTER TABLE workflow_instance
    ADD COLUMN result VARCHAR(20) NULL,          -- APPROVED, REJECTED, PENDING, NULL
    ADD COLUMN failure_reason TEXT NULL;          -- chỉ có giá trị khi status = FAILED

-- status hiện tại giữ nguyên cột, chỉ chuẩn hoá lại giá trị cho phép:
-- RUNNING, COMPLETED, CANCELLED, SUSPENDED, FAILED
```

### 5.2. Migration dữ liệu cũ (backfill)

Với các Instance đã tồn tại trước khi tách field, cần chạy script backfill `result` dựa trên dữ liệu hiện có (nếu có thể suy ra được, ví dụ dựa vào Node Execution cuối cùng hoặc field cũ đang gộp status/result):

```sql
-- Ví dụ minh hoạ logic backfill, cần điều chỉnh theo cấu trúc dữ liệu thật
UPDATE workflow_instance
SET result = 'APPROVED'
WHERE status = 'COMPLETED' AND result IS NULL
  AND id IN (
      SELECT instance_id FROM node_execution
      WHERE node_type = 'END' AND outcome_port = 'approved'
  );

UPDATE workflow_instance
SET result = 'REJECTED'
WHERE status = 'COMPLETED' AND result IS NULL
  AND id IN (
      SELECT instance_id FROM node_execution
      WHERE node_type = 'APPROVAL' AND decision = 'REJECT'
  );
```

> Nếu không đủ dữ liệu lịch sử để suy luận chính xác cho 1 số Instance cũ, đánh dấu `result = 'UNKNOWN'` và liệt kê ra danh sách để rà soát thủ công, không nên đoán bừa gây sai lệch báo cáo.

### 5.3. Đồng bộ lại `ticket.status` cho dữ liệu cũ

Sau khi backfill `instance.result`, chạy lại toàn bộ Ticket đã bị set sai trước đây (do bug gộp status) qua đúng hàm mapping mới (mục 4.1), không sửa tay từng dòng.

## 6. Việc cần làm (checklist triển khai)

| Bước | Nội dung | Rủi ro nếu bỏ qua |
|---|---|---|
| 1 | Thêm cột `result`, `failure_reason` vào `workflow_instance` | — |
| 2 | Đổi `InstanceCompletedEvent` sang 2 field enum tách biệt | Nếu không đổi, listener vẫn phải tự suy luận lại → không giải quyết triệt để |
| 3 | Rà soát toàn bộ nơi Runtime Engine set status/result, sửa theo nguyên tắc mục 2.2 | Đây là bước dễ sót nhất — sót 1 chỗ là bug tái phát |
| 4 | Refactor `TicketWorkflowEventListener` theo bảng mapping mục 4.1–4.2 | Không tách bạch FAILED/REJECTED, không có guard idempotency |
| 5 | Viết unit test cho từng cặp (status, result) trong bảng mapping | Không phát hiện được case thiếu mapping khi thêm giá trị mới sau này |
| 6 | Chạy migration backfill dữ liệu cũ (mục 5.2, 5.3) | Dữ liệu lịch sử tiếp tục sai, báo cáo/audit không đáng tin |
| 7 | Thêm alert cho Admin/Owner khi `status = FAILED` | User không phân biệt được "bị từ chối" và "hệ thống lỗi" |

## 7. Test case bắt buộc cần có sau khi refactor

- Approval reject ở bước giữa quy trình → `status=COMPLETED`, `result=REJECTED` → `ticket.status=REJECTED`.
- Approval approve, đi hết toàn bộ node → `status=COMPLETED`, `result=APPROVED` → `ticket.status=APPROVED`.
- System Action node gọi API lỗi giữa chừng → `status=FAILED`, `result=null` → `ticket.status=ERROR`, có alert gửi Owner.
- Admin huỷ instance đang chạy → `status=CANCELLED` → `ticket.status=CANCELLED`.
- Event bắn lại lần 2 cho cùng 1 instance đã final (giả lập retry) → ticket không bị ghi đè `resolvedAt` lần 2 (idempotency guard hoạt động).
- Event có cặp (status, result) không nằm trong bảng mapping (giả lập giá trị enum mới chưa kịp thêm rule) → ticket chuyển `NEEDS_REVIEW`, có log warning, không im lặng bỏ qua.
