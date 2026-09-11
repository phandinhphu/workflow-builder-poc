# Đề xuất kiến trúc: Cơ chế Form – Workflow – Ticket Category

## 1. Bối cảnh & yêu cầu nghiệp vụ

### 1.1. Vai trò

**Admin:**
- CRUD Form (hỗ trợ đầy đủ trường)
- CRUD Workflow (thiết kế node, connection, quản lý state)
- Tạo Ticket Category — nối 1 Form với 1 Workflow

**User (Nhân viên):**
- Chỉ tạo được ticket (không tạo Form/Workflow)
- Xem được ticket đang ở state gì, step nào
- Xem danh sách ticket của mình

### 1.2. Nguyên tắc cố định
> **1 Admin tạo 1 Workflow ứng với 1 Form, và chịu trách nhiệm nối Form với Workflow.**
> Việc nối này **bắt buộc thực hiện ở bước tạo Ticket Category**, không phải lúc tạo Workflow.

## 2. Yêu cầu màn hình

### 2.1. User

| Màn hình | Nội dung |
|---|---|
| List ticket | Danh sách ticket + nút **"Add New"** |
| Tạo ticket mới | Modal/màn hình gồm: các trường ticket cơ bản, dropdown **chọn Form** (đã publish sẵn) → khi chọn xong hiển thị field của Form để nhập → nút **Submit** |
| Chi tiết ticket | Hiển thị **state** hiện tại và **step** hiện tại của ticket |

Khi Submit → hệ thống khởi tạo 1 **Workflow Instance** ứng với Workflow đã được map với Form đó (thông qua cấu hình Ticket Category).

### 2.2. Admin

| Màn hình | Nội dung |
|---|---|
| CRUD Form | Đầy đủ trường |
| CRUD Workflow | Thiết kế kéo thả node/connection |
| Ticket Category | Nút **Add** → modal 2 cột: **Cột 1** chọn Form, **Cột 2** chọn Workflow, nút **Save**. Bên dưới là bảng 3 cột: Form / Workflow / Action (Sửa, Xóa) |

## 3. Vấn đề kỹ thuật cốt lõi

Khi thiết kế Condition Node (If/Else) trong Workflow Designer — ví dụ Workflow `LogTrip` cần check field `price` từ Form `Trip` để rẽ nhánh sang node Phê duyệt — **hệ thống chưa biết Workflow này sẽ map với Form nào tại thời điểm thiết kế**, vì việc bind chỉ xảy ra sau, ở bước tạo Ticket Category.

→ Cần cơ chế cho phép:
1. Vẫn thiết kế được Condition Node dù chưa có Form chính thức.
2. Đảm bảo tính đúng đắn (field tồn tại, đúng kiểu dữ liệu) tại thời điểm Form và Workflow thực sự được nối với nhau.
3. Workflow Instance đọc được dữ liệu form + id người tạo ticket để node điều kiện / resolver xử lý.

## 4. Giải pháp đề xuất

### 4.1. Tách "Design-time hint" và "Runtime binding"

**a) Design-time (lúc vẽ Workflow — chưa cần Form chính thức)**

- Trong Workflow Designer, khi thêm Condition Node, admin có tuỳ chọn **"Preview với Form"**: chọn tạm 1 Form bất kỳ để hệ thống hiển thị dropdown field + kiểu dữ liệu, hỗ trợ nhập điều kiện nhanh và đúng chính tả.
- Lựa chọn preview này **không được lưu vào Workflow Definition** — chỉ là state tạm trên UI.
- Nếu không chọn Form nào, admin vẫn nhập được field key bằng tay (free text); hệ thống chỉ validate tối thiểu về cú pháp (field key hợp lệ, operator phù hợp với kiểu dữ liệu tự chọn).
- Condition được lưu dưới dạng **structured JSON**, không phải raw expression string:

```json
{
  "type": "CONDITION",
  "logic": "AND",
  "rules": [
    {
      "field": "price",
      "fieldType": "number",
      "operator": "GREATER_THAN",
      "value": 5000000
    }
  ]
}
```

- Lợi ích: operator set được suy ra từ `fieldType` (number: `>`, `<`, `>=`, `between`; string: `equals`, `contains`; boolean; date...), UI dễ validate và hiển thị lại, và 1 Workflow có thể tái dùng cho nhiều Form khác nhau miễn tên field khớp.

**b) Runtime binding (chính thức — xảy ra ở bước tạo Ticket Category)**

Đây là nơi field reference trong Workflow **thực sự** được đối chiếu với Form:

- Trong modal "Add" của Ticket Category, trước khi cho phép bấm **Save**, hệ thống chạy bước **Compatibility Validation**:
  1. Duyệt toàn bộ Condition Node + Resolver Node trong Workflow (bản đã publish) → lấy danh sách field key được tham chiếu.
  2. Đối chiếu với schema của Form (bản đã publish) được chọn ở cột 1.
  3. Nếu có field không tồn tại / sai kiểu dữ liệu → chặn Save, báo lỗi cụ thể theo node, ví dụ:
     > *"Node 'Phê duyệt Trip' đang dùng field `price` nhưng Form 'Trip' không có field này."*
- Chỉ khi mọi field khớp mới cho Save → lúc này mới thực sự tạo cặp `formVersionId` + `workflowExecutableId` gắn cố định vào Ticket Category.

### 4.2. So sánh với phương án bind cứng lúc tạo Workflow

| Tiêu chí | Bind lúc tạo Workflow | Bind lúc tạo Ticket Category (chọn) |
|---|---|---|
| Tái sử dụng Workflow cho nhiều Form | Không được | Được, miễn field khớp |
| Khớp với UI đã chốt (modal Category 2 cột) | Sai lệch | Khớp hoàn toàn |
| Rủi ro sai field | Thấp hơn (validate sớm) | Cần thêm bước Compatibility Validation |
| UX thiết kế Workflow | Bị ép chọn Form trước | Linh hoạt, có Preview hỗ trợ |

## 5. Versioning: Form cũng cần bất biến như Workflow

Nếu Admin sửa Form (ví dụ xoá field `price`) sau khi Workflow đã publish và đang có Instance chạy, Condition Node sẽ tham chiếu field không tồn tại → lỗi runtime.

**Đề xuất:** Form dùng cơ chế snapshot bất biến giống Workflow:

- `Form Definition` (draft, sửa được) → publish → `Form Version` (immutable snapshot).
- Ticket Category lưu tham chiếu đến **cặp cố định**: `formVersionId` + `workflowExecutableId` tại thời điểm Save, không phải id "sống" của Form/Workflow.
- Khi tạo Workflow Instance, Instance ghi nhớ `formVersionId` đã dùng → dù sau này Form có version mới, các Instance cũ vẫn chạy đúng theo schema cũ.

**Cần xử lý thêm:** nếu Admin publish Form version mới trong khi có Ticket Category đang active dùng field liên quan, hệ thống nên:
- Không tự động cập nhật Category sang version mới (Category vẫn ghim version cũ).
- Hiển thị banner cảnh báo "Có Form version mới — kiểm tra tương thích trước khi cập nhật".

## 6. Cấu trúc dữ liệu Context khi khởi tạo Instance

Khi User submit ticket, payload gửi vào Runtime Engine nên chuẩn hoá:

```json
{
  "ticketId": "TICKET-1001",
  "categoryId": "CAT-01",
  "formVersionId": "FORM-TRIP-v3",
  "workflowExecutableId": "WF-LOGTRIP-v2",
  "initiator": {
    "userId": "U123",
    "departmentId": "D01"
  },
  "formData": {
    "price": 6000000,
    "destination": "Da Nang",
    "startDate": "2026-09-20"
  }
}
```

- `formData`: object phẳng theo field key của Form → Condition Node chỉ cần đọc `context.formData.price`.
- `initiator`: bắt buộc có `userId` để Resolver Node (ví dụ `ManagerOf`) tra ra người quản lý trực tiếp.
- Context này gắn cố định vào Instance ngay lúc tạo, đúng nguyên tắc "resolve một lần, không resolve lại sau đó" đã thiết kế cho hệ thống.

## 7. Resolver Node — thiết kế mở rộng được

Node phê duyệt cần: lấy `initiator.userId` → tra Identity module → lấy `managerId` → tạo Task cho `managerId`.

Thiết kế Resolver như 1 interface chung để dễ mở rộng loại resolver mới sau này mà không sửa Runtime Engine:

```
Resolver.resolve(type: "MANAGER_OF" | "FIXED_USER" | "ROLE", context) → List<userId>
```

## 8. Luồng end-to-end tổng hợp

```
Admin: Tạo Form (draft) → publish → Form Version

Admin: Tạo Workflow (độc lập, không ép chọn Form)
        → Thiết kế node/condition, tuỳ chọn Preview Form để hỗ trợ nhập field
        → publish → Workflow Version → Workflow Executable

Admin: Tạo Ticket Category
        → Modal: chọn Form (cột 1) + chọn Workflow (cột 2)
        → Hệ thống chạy Compatibility Validation (đối chiếu field)
        → Nếu hợp lệ → Save → lưu formVersionId + workflowExecutableId cố định

User: Chọn Category → chọn Form → nhập formData → Submit
        → Backend tạo Ticket + tạo Workflow Instance
          với context = { formData, initiator, formVersionId }
        → Runtime Engine chạy node, Condition đọc context.formData.<field>
        → Resolver Node (vd. ManagerOf) resolve người duyệt → tạo Task

User: Xem list ticket / chi tiết ticket
        → Hiển thị status + step hiện tại (đọc từ Instance + Node Execution hiện tại)
```

## 9. Các điểm cần xử lý thêm (Follow-up)

1. **Re-validate khi Form có version mới**: cảnh báo/chặn nếu Category đang active mà Form version mới làm mất field đang được Workflow dùng.
2. **1 Workflow dùng ở nhiều Category**: cho phép, nhưng nên hiển thị gợi ý trong bảng danh sách Category để Admin biết Workflow này đã được dùng ở đâu khác.
3. **Validate cú pháp khi chưa chọn Preview Form**: đảm bảo field key/operator hợp lệ về mặt cấu trúc dù chưa đối chiếu được với Form thật.
4. **API dùng chung**: nên có endpoint riêng, ví dụ `POST /ticket-categories/validate-mapping` (input: `formId`, `workflowId`; output: danh sách field không khớp) — dùng lại được cho cả luồng tạo mới và luồng edit Category.
