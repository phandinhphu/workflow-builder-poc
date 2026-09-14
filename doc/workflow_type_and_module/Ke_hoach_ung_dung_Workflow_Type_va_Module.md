# Kế hoạch phát triển: Ứng dụng thực tế cho "Loại Workflow" và "Module áp dụng"

## 1. Bối cảnh

Hai field **Loại workflow** (Workflow Type) và **Module áp dụng** (Applicable Module) hiện đã tồn tại trong dữ liệu Workflow nhưng chưa được hệ thống sử dụng để tác động vào logic nghiệp vụ — chỉ đang là metadata hiển thị.

Do Form hiện **chưa có thuộc tính Module**, phạm vi kế hoạch này **bỏ qua** hướng dùng Module làm tín hiệu gợi ý khi map Form–Workflow ở Ticket Category. Trọng tâm là làm cho 2 field này thực sự ảnh hưởng đến: **validation lúc publish**, **trải nghiệm thiết kế workflow**, và **phân quyền truy cập theo phòng ban**.

## 2. Mục tiêu

| Field | Vai trò mới sau khi triển khai |
|---|---|
| Loại workflow | Input cho Publish Validation Rule + giới hạn Node Palette trong Designer |
| Module áp dụng | Input cho phân quyền xem/sửa Workflow theo phòng ban (dùng kết hợp với ACL đã có) |

## 3. Phần A — Loại Workflow (Workflow Type)

### 3.1. Định nghĩa danh mục loại workflow

Chốt danh sách loại cố định (enum), ví dụ:

```
APPROVAL       - Workflow phê duyệt
NOTIFICATION   - Workflow chỉ gửi thông báo
AUTOMATION     - Workflow tự động hoá hệ thống
REVIEW         - Workflow review nội dung/hồ sơ
CUSTOM         - Workflow tự do, không ràng buộc theo khuôn mẫu
```

> Có thể mở rộng thêm loại sau này, nên lưu dưới dạng bảng `workflow_type` (không hard-code enum trong code) để dễ thêm loại mới mà không cần deploy lại.

### 3.1.1. Loại CUSTOM — lối thoát cho các case không khớp khuôn mẫu

Việc thêm sẵn 4 loại cố định (APPROVAL, NOTIFICATION, AUTOMATION, REVIEW) có rủi ro: nếu nghiệp vụ thực tế không khớp hoàn toàn với khuôn mẫu nào (ví dụ 1 workflow vừa cần Review vừa cần System Action theo cách không chuẩn), admin sẽ bị rule engine chặn vô lý dù thiết kế của họ hợp lý về nghiệp vụ.

`CUSTOM` được thêm vào để giải quyết đúng vấn đề này — đóng vai trò "escape hatch":

- **Publish Validation**: `CUSTOM` chỉ áp dụng rule chung tối thiểu (có Start, có End, không có node lỗi, đồ thị liên thông) — **không** áp thêm rule bắt buộc/rule cấm theo loại (mục 3.2). Nói cách khác, bảng `workflow_type_validation_rule` sẽ không có bản ghi rule riêng cho `CUSTOM`, hoặc có nhưng để rỗng — validation engine mặc định fallback về rule chung khi không tìm thấy rule riêng cho loại.
- **Node Palette**: `CUSTOM` không giới hạn Node Palette — hiển thị **toàn bộ 7 loại node** trong Designer, khác với các loại khác chỉ hiện tập con (mục 3.3). Bảng `workflow_type_allowed_node` với `type = CUSTOM` sẽ chứa đầy đủ tất cả node type sẵn có, hoặc xử lý ở code: nếu `workflowType == CUSTOM` thì bỏ qua bước filter, trả về toàn bộ danh sách node.

**Lưu ý khi triển khai:**
- `CUSTOM` không nên là loại mặc định khi tạo Workflow mới — vẫn nên để Admin chọn tường minh, vì đây là lựa chọn "tôi biết tôi đang làm gì và không muốn bị ràng buộc", không phải giá trị an toàn để chọn ngẫu nhiên.
- Về lâu dài, nếu thấy nhiều workflow chọn `CUSTOM` lặp lại cùng 1 kiểu cấu trúc, đó là tín hiệu nên tách thành 1 loại chính thức mới thay vì để mãi ở `CUSTOM` — tránh `CUSTOM` trở thành "thùng rác" chứa toàn bộ workflow không được phân loại rõ ràng.

### 3.2. Rule Engine cho Publish Validation theo loại

Xây dựng bảng cấu hình rule theo loại workflow, ví dụ:

| Loại | Rule bắt buộc | Rule cấm |
|---|---|---|
| APPROVAL | Có ít nhất 1 Approval Step | — |
| NOTIFICATION | Có ít nhất 1 Notification Step | Không được có Approval Step |
| AUTOMATION | Có ít nhất 1 System Action Step | — |
| REVIEW | Có ít nhất 1 Review Step | — |
| CUSTOM | Không có (chỉ áp rule chung: Start/End, liên thông, không lỗi) | Không có |

**Việc cần làm:**
- Thiết kế bảng `workflow_type_validation_rule` (type, rule_code, rule_config) để rule có thể cấu hình được thay vì hard-code if/else theo từng loại.
- Validation Engine hiện tại (check Start/End, tính liên thông, chu trình lặp) bổ sung thêm bước: load rule theo `workflowType` của workflow đang publish → chạy kiểm tra tương ứng.
- Khi publish thất bại do rule loại workflow, trả lỗi rõ ràng, ví dụ: *"Workflow loại NOTIFICATION không được chứa Approval Step (Node: 'Phê duyệt cấp 1')."*

### 3.3. Giới hạn Node Palette theo loại workflow trong Designer

**Việc cần làm:**
- Khi tạo Workflow mới, bắt buộc chọn Loại workflow trước khi vào màn Designer (hoặc chọn ngay ở bước tạo).
- Frontend: Node Palette filter theo mapping loại → node được phép:

```
APPROVAL     → Start, Approval Step, Assignment Step, Notification Step, End
NOTIFICATION → Start, Notification Step, End
AUTOMATION   → Start, System Action Step, Notification Step, End
REVIEW       → Start, Review Step, Assignment Step, Notification Step, End
CUSTOM       → Toàn bộ 7 loại node (không giới hạn)
```

- Mapping này nên lưu ở backend (bảng `workflow_type_allowed_node`) và trả về qua API khi Designer load, để frontend không hard-code — tránh phải sửa code khi thêm loại mới.
- Nếu Admin đổi Loại workflow sau khi đã có node không hợp lệ với loại mới → cảnh báo danh sách node vi phạm, không tự xoá node.

## 4. Phần B — Module áp dụng (Applicable Module)

### 4.1. Định nghĩa danh mục Module

Xác nhận Module tương ứng với đơn vị/phòng ban nghiệp vụ (IT, Purchase, HR, Finance...). Lưu dưới dạng bảng `module` riêng, liên kết với `department` nếu hệ thống Identity đã có khái niệm phòng ban; nếu chưa có, Module có thể tồn tại độc lập như 1 danh mục quản lý riêng.

**Câu hỏi cần chốt trước khi code (blocking):**
- Hệ thống hiện đã có bảng `department` gắn với `user` chưa, hay cần tạo mới?
- Module áp dụng có phải ánh xạ 1-1 với department không, hay là khái niệm rộng hơn (ví dụ 1 department có nhiều module)?

### 4.2. Phân quyền xem/sửa Workflow theo Module

**Việc cần làm:**
- Thêm bảng liên kết `user_module_access` (userId, moduleId, accessLevel) — hoặc tái dùng cơ chế ACL đã có sẵn cho từng workflow, mở rộng thêm 1 lớp lọc theo Module.
- Nguyên tắc 2 lớp phân quyền:

```
Module        → Lớp phân quyền THÔ (theo phòng ban): user chỉ thấy workflow thuộc module mình được gán
ACL Workflow  → Lớp phân quyền CHI TIẾT (theo từng workflow cụ thể): Owner/Editor/Viewer trên 1 workflow
```

- API danh sách Workflow (`GET /workflows`) bổ sung filter ngầm theo `moduleId` mà user đang có quyền truy cập, trước khi áp thêm điều kiện ACL hiện có.
- Admin (role ADMIN) vẫn thấy toàn bộ Module, không bị giới hạn.

### 4.3. UI cập nhật

**Việc cần làm:**
- Màn danh sách Workflow: thêm bộ lọc theo Module (dropdown).
- Màn tạo Workflow: dropdown chọn Module lấy từ danh mục `module`, không để free text như hiện tại (nếu đang là free text, cần migrate dữ liệu cũ sang danh mục chuẩn).
- Nếu dữ liệu Module hiện tại đang là free text, chạy script chuẩn hoá: gom nhóm giá trị trùng/gần giống (ví dụ "IT", "it", "Phòng IT" → 1 giá trị chuẩn) trước khi migrate sang bảng `module`.

## 5. Việc KHÔNG làm trong phạm vi này

- Không dùng Module của Workflow để gợi ý khi map Form–Workflow ở Ticket Category, do Form hiện chưa có thuộc tính Module (đã thống nhất loại khỏi phạm vi).
- Không tự động migrate/suy luận Module cho Form ở giai đoạn này.

## 6. Thứ tự triển khai đề xuất

| Bước | Nội dung | Ghi chú |
|---|---|---|
| 1 | Chốt danh mục Loại workflow + Module (thay free text bằng danh mục chuẩn nếu cần) | Cần trả lời câu hỏi 4.1 trước |
| 2 | Xây bảng `workflow_type_validation_rule` + tích hợp vào Publish Validation Engine | Không phụ thuộc bước khác |
| 3 | Xây bảng `workflow_type_allowed_node` + filter Node Palette ở Designer | Có thể làm song song bước 2 |
| 4 | Xây `user_module_access` (hoặc mở rộng ACL hiện có) + filter API danh sách Workflow theo Module | Phụ thuộc kết quả câu hỏi department ở 4.1 |
| 5 | Cập nhật UI: dropdown Module chuẩn hoá, bộ lọc Module ở danh sách Workflow | Phụ thuộc bước 1 và 4 |
| 6 | Filter Template theo Loại workflow | Chỉ làm khi tính năng Template được xác nhận trong roadmap |

## 7. Rủi ro cần lưu ý

- **Dữ liệu Workflow hiện có**: nếu các workflow đã tạo trước đó có Loại/Module không hợp lệ theo danh mục mới (hoặc để trống), cần có bước migrate/gán mặc định trước khi bật rule validation, tránh làm gãy workflow đang chạy.
- **Node Palette filter**: cần đảm bảo các Workflow đã publish trước đó (có thể chứa node không "hợp lệ" theo rule mới) không bị chặn khi Edit — chỉ áp rule mới cho các thao tác publish mới hoặc hiển thị cảnh báo, không hồi tố chặn cứng.