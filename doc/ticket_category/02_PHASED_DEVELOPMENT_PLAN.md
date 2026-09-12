# Kế hoạch Phân kỳ Phát triển (5-Phase Implementation Roadmap)

Tài liệu này chi tiết hóa lộ trình triển khai 5 giai đoạn để chuyển đổi kiến trúc hệ thống Workflow Platform sang mô hình **Form – Workflow – Ticket Category (Decoupled Binding Architecture)**.

---

## Giai đoạn 1: Form Engine Core & Snapshot Versioning (Phase 1)

### 1.1. Mục tiêu
Xây dựng phân hệ Quản lý Biểu mẫu (Form Management) độc lập hoàn toàn, hỗ trợ soạn thảo biểu mẫu trực quan, cấu hình thuộc tính trường linh hoạt và cơ chế đóng băng phiên bản bất biến (`FormVersion`).

### 1.2. Hạng mục Công việc Chi tiết

#### A. Database & Schema (Backend)
- [ ] Tạo bảng `form_definition`:
  - `id` (UUID, PK), `name` (VARCHAR), `code` (VARCHAR UNIQUE), `description` (TEXT), `status` (VARCHAR: `DRAFT`, `PUBLISHED`, `ARCHIVED`), `draft_schema` (JSONB), audit columns.
- [ ] Tạo bảng `form_version`:
  - `id` (UUID, PK), `form_definition_id` (UUID, FK), `version_number` (INT), `schema_snapshot` (JSONB), `published_by` (VARCHAR), `published_at` (TIMESTAMP).
- [ ] Index: `idx_form_version_def_ver` trên `(form_definition_id, version_number)`.

#### B. Backend Services & REST APIs
- [ ] Package: `com.acme.workflow.form`:
  - Entities: `FormDefinitionEntity`, `FormVersionEntity`.
  - Repositories: `FormDefinitionRepository`, `FormVersionRepository`.
  - Service: `FormService`:
    - `createForm(request)`: Khởi tạo draft form.
    - `updateDraftSchema(id, schema)`: Lưu cấu trúc draft.
    - `publishVersion(id)`: Tăng version number, snapshot `draft_schema` thành `FormVersionEntity` bất biến.
    - `getVersions(id)`: Lấy lịch sử các phiên bản đã xuất bản.
- [ ] Controller: `FormController`:
  - `POST /api/forms`: Tạo mới Form.
  - `GET /api/forms`: Danh sách Form (phân trang, tìm kiếm).
  - `GET /api/forms/{id}`: Chi tiết Form và bản draft.
  - `PUT /api/forms/{id}/draft`: Cập nhật draft schema.
  - `POST /api/forms/{id}/publish`: Publish sinh version mới.
  - `GET /api/forms/{id}/versions`: Danh sách version.

#### C. Frontend UI/UX
- [ ] Màn hình **Form Management** (`/admin/forms`):
  - Bảng danh sách Form: Tên form, mã code, trạng thái, phiên bản mới nhất, ngày tạo.
  - Nút *"Tạo biểu mẫu mới"*.
- [ ] Màn hình **Form Builder Studio** (`/admin/forms/:id/builder`):
  - Bảng thành phần trường (Field Palette): Text, Textarea, Number, Select, Multi-select, Date, Time, Checkbox, File.
  - Khu vực Canvas soạn thảo: Kéo thả sắp xếp thứ tự các trường, chỉnh sửa Label, Placeholder, Key, Required, Validation Rules (Min, Max, Regex).
  - Tab *"Xem trước (Preview)"*: Cho phép điền thử và kiểm tra validation thực tế của form.
  - Nút *"Lưu nháp"* và *"Xuất bản (Publish)"*.

### 1.3. Tiêu chí Nghiệm thu (Acceptance Criteria)
- [x] Tạo được form mới với đầy đủ 8 loại trường dữ liệu cơ bản.
- [x] Lưu nháp và tải lại không mất cấu trúc.
- [x] Publish sinh ra version tăng dần (v1, v2...) và bản snapshot trong DB không bị thay đổi khi tiếp tục sửa bản nháp.

---

## Giai đoạn 2: Workflow Designer Enhancement & Input Contract (Phase 2)

### 2.1. Mục tiêu
Chuẩn hóa Condition Node sang cấu trúc AST Rules JSON, loại bỏ script tự do, bổ sung cơ chế gợi ý trường (Preview Hint) khi thiết kế Workflow mà không gây phụ thuộc cứng vào Form.

### 2.2. Hạng mục Công việc Chi tiết

#### A. Backend & Core Engine
- [x] Cập nhật schema của `ConditionNodeConfig`:
  - Chuyển đổi từ raw expression sang dạng Structured Rules:
    ```json
    {
      "logic": "AND | OR",
      "rules": [
        { "field": "string", "fieldType": "string", "operator": "string", "value": "any" }
      ]
    }
    ```
- [x] Nâng cấp `ExpressionEngine.java`:
  - Xây dựng module `StructuredConditionEvaluator`:
    - Đánh giá giá trị trường từ `context.formData.<field>`.
    - Hỗ trợ đầy đủ bộ toán tử theo kiểu dữ liệu (`EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `LESS_THAN`, `BETWEEN`, `CONTAINS`, `IS_EMPTY`...).
    - Xử lý Type Casting an toàn (tránh lỗi ClassCastException giữa Integer, Double, String).

#### B. Frontend Workflow Designer
- [x] Nâng cấp **Condition Node Modal**:
  - Tính năng **"Preview với Form (Design Hint)"**:
    - Dropdown chọn tạm 1 Form đã có.
    - Khi chọn form: Hệ thống đọc schema của form đó và hiển thị danh sách field vào dropdown gợi ý khi thêm rule.
    - Tự động gán `fieldType` tương ứng khi chọn field.
    - Lựa chọn này **không lưu vào Workflow Definition JSON**, chỉ là state tạm trên UI.
  - Chế độ nhập tự do (Manual Input): Nếu không chọn Preview Form, cho phép gõ tên field và tự chọn kiểu dữ liệu từ dropdown.
  - Bộ chọn toán tử động (Operator Select): Lọc danh sách toán tử phù hợp với `fieldType` đã chọn.

### 2.3. Tiêu chí Nghiệm thu
- [x] Condition Node lưu thành công cấu trúc JSON chuẩn AST.
- [x] Khi chạy thử nghiệm evaluator với mock context `{ formData: { price: 6000000 } }`, condition `price > 5000000` trả về `true` chính xác.
- [x] Workflow Designer không bắt buộc phải có Form vẫn vẽ và publish bình thường.

---

## Giai đoạn 3: Ticket Category & Compatibility Validation (Phase 3)

### 3.1. Mục tiêu
Xây dựng thực thể trung gian `TicketCategory` kết nối 1 `FormVersion` và 1 `WorkflowExecutable`, cung cấp bộ kiểm tra đối soát tương thích (Compatibility Validation) và cấu hình Field Mapping.

### 3.2. Hạng mục Công việc Chi tiết

#### A. Database & Entities
- [x] Tạo bảng `ticket_category`:
  - `id` (UUID, PK), `name` (VARCHAR), `code` (VARCHAR UNIQUE), `description` (TEXT), `icon` (VARCHAR), `color` (VARCHAR).
  - `form_version_id` (UUID, FK -> `form_version.id`).
  - `workflow_executable_id` (UUID, FK -> `workflow_executable.id` / `workflow_versions.id`).
  - `field_mapping` (JSONB) - ví dụ: `{ "trip_cost": "price" }`.
  - `is_active` (BOOLEAN, DEFAULT true), audit columns.

#### B. Compatibility Validation Engine (Backend)
- [x] Xây dựng service `CompatibilityValidationService`:
  - Trích xuất toàn bộ field được sử dụng trong các nodes của `WorkflowExecutable` (Condition Nodes, Assignment/Task rules).
  - Đối chiếu với `FormVersion.schemaSnapshot`:
    - Kiểm tra sự tồn tại của field (hoặc field sau khi qua `field_mapping`).
    - Kiểm tra tính tương thích của `fieldType` (ví dụ: `number` không thể match với `boolean`).
  - Trả về danh sách chi tiết các lỗi: `MISSING_FIELD`, `TYPE_MISMATCH` kèm `nodeId`, `nodeName`.
- [x] API endpoints:
  - `POST /api/ticket-categories/validate-mapping`: Kiểm tra tính tương thích trước khi lưu.
  - `POST /api/ticket-categories`: Tạo mới Category (bắt buộc chạy qua validate, nếu có lỗi thì từ chối HTTP 422).
  - `GET /api/ticket-categories`: Danh sách Category.
  - `GET /api/ticket-categories/{id}`: Chi tiết Category kèm thông tin FormVersion và WorkflowExecutable.
  - `PUT /api/ticket-categories/{id}`: Cập nhật thông tin / cấu hình.

#### C. Frontend UI Quản lý Ticket Category
- [x] Màn hình **Ticket Categories** (`/categories`):
  - Bảng danh sách: Tên danh mục, Form áp dụng (kèm version), Workflow áp dụng (kèm version), Trạng thái active, Nút Sửa/Xóa.
  - Nút *"Thêm Danh mục Mới"*.
- [x] Modal **Tạo/Chỉnh sửa Ticket Category**:
  - Thông tin cơ bản: Tên danh mục, mã, mô tả, icon, màu nhận diện.
  - **Cột 1**: Chọn Form -> Chọn phiên bản Form (`FormVersion`).
  - **Cột 2**: Chọn Workflow -> Chọn phiên bản Workflow (`WorkflowExecutable`).
  - Khu vực **Field Mapping & Tương thích**:
    - Hiển thị bảng đối soát giữa trường Workflow yêu cầu và trường Form cung cấp.
    - Hiển thị cảnh báo trực quan nếu có trường không khớp (bôi đỏ).
    - Cho phép map thủ công trường Form sang biến Workflow.
  - Nút **Save** bị vô hiệu hóa (disabled) nếu việc kiểm tra tương thích thất bại.

### 3.3. Tiêu chí Nghiệm thu
- [x] Tạo cặp Form - Workflow khớp trường: Bấm Save thành công.
- [x] Tạo cặp Form thiếu trường hoặc sai kiểu: Nút Save bị chặn, thông báo đúng tên Node và tên field đang bị lỗi.
- [x] Sử dụng tính năng Field Mapping để giải quyết trường hợp lệch tên field thành công.

---

## Giai đoạn 4: Ticket Module & Dynamic Runtime Bridge (Phase 4)

### 4.1. Mục tiêu
Mở cổng giao diện cho Người dùng (User Portal): Chọn Category, điền biểu mẫu động theo schema, tạo Ticket và tự động khởi động Workflow Instance tương ứng.

### 4.2. Hạng mục Công việc Chi tiết

#### A. Database & Ticket Lifecycle
- [x] Tạo bảng `ticket`:
  - `id` (UUID, PK), `ticket_code` (VARCHAR UNIQUE), `category_id` (UUID, FK), `form_version_id` (UUID, FK), `workflow_instance_id` (UUID, FK).
  - `initiator_id` (VARCHAR), `initiator_name` (VARCHAR), `initiator_department_id` (VARCHAR).
  - `form_data` (LONGTEXT): Chứa dữ liệu nhập từ người dùng.
  - `status` (VARCHAR: `SUBMITTED`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `CANCELLED`).
  - `current_step_name` (VARCHAR).
  - `created_at`, `updated_at`, `resolved_at`.
- [x] Cơ chế sinh mã vé tự động: `TCK-YYYYMMDD-XXXX`.

#### B. Runtime Bridge & Context Injection (Backend)
- [x] Service `TicketService`:
  - `createTicket(categoryId, formData, initiator)`:
    1. Kiểm tra Category có active không.
    2. Nạp `FormVersion` từ Category -> Validate toàn bộ `formData` theo schema (bắt buộc, kiểu dữ liệu, min/max).
    3. Áp dụng `field_mapping` để chuẩn bị context cho Workflow.
    4. Lưu bản ghi `ticket` ở trạng thái `SUBMITTED`.
    5. Gọi `RuntimeEngineService.startWithExecutable()`:
       - Context: `{ ticketId, ticketCode, categoryId, initiator, formData }`.
    6. Liên kết `workflow_instance_id` ngược lại vào Ticket.
- [x] Đồng bộ trạng thái 2 chiều:
  - Bổ sung Event Listener tại `RuntimeEngineService` và `TicketWorkflowEventListener`:
    - Khi Node Execution bắt đầu -> Cập nhật `ticket.current_step_name` và `ticket.status` (`IN_REVIEW`).
    - Khi Workflow Instance hoàn tất (Node End) -> Cập nhật `ticket.status` (`APPROVED` hoặc `REJECTED`), set `resolved_at`.

#### C. Frontend User Portal (Tab Ticket - Thay thế hoàn toàn Service Catalog)
- [x] Gỡ bỏ hoàn toàn **Danh mục Yêu cầu (Service Catalog)** cũ và thay bằng **Tab Phiếu yêu cầu (Tickets)** (`/tickets`) trên Sidebar cho mọi người dùng.
- [x] Màn hình **Trung tâm Ticket (Ticket Hub)** (`/tickets`):
  - **Tab 1: "Tạo yêu cầu mới"**: Hiển thị danh sách các thẻ Ticket Category theo dạng lưới (Grid/Cards). Bấm chọn Category -> Mở màn hình tạo yêu cầu.
  - **Tab 2: "Vé của tôi"**: Bảng danh sách ticket người dùng đã tạo: Mã vé, Danh mục, Trạng thái (badge màu), Bước hiện tại, Ngày tạo.
  - **Tab 3: "Tất cả yêu cầu"**: Dành riêng cho Quản trị viên (`ROLE-ADMIN` / `TICKET_MANAGE`).
- [x] Component **DynamicFormRenderer**:
  - Hỗ trợ 2 chế độ `edit` và `readonly` cho đầy đủ 9 loại trường dữ liệu.
  - Client-side validation trực quan thời gian thực.
- [x] Màn hình **Tạo yêu cầu** (`/tickets/new/:categoryId`):
  - Điền form động theo schema của Category và gửi yêu cầu.
- [x] Màn hình **Chi tiết Ticket** (`/tickets/:id`):
  - Khung thông tin tổng quan (Trạng thái, Người tạo, Ngày nộp, Ngày giải quyết).
  - Khung dữ liệu biểu mẫu đã nộp (Render dạng Read-only qua DynamicFormRenderer).
  - Khung Tiến trình xử lý (Timeline Node Graph): Hiển thị luồng các bước thực thi và vị trí hiện tại.

### 4.3. Tiêu chí Nghiệm thu
- [x] Người dùng chọn Category -> Form render đúng các trường của FormVersion tương ứng.
- [x] Điền dữ liệu và Submit -> Sinh bản ghi Ticket và kích hoạt 1 WorkflowInstance mới.
- [x] Condition Node trong Workflow đọc đúng `formData` để rẽ nhánh chuẩn xác.
- [x] Xem chi tiết Ticket thấy đúng dữ liệu đã gửi và trạng thái tiến độ hiện tại.

---

## Giai đoạn 5: Approval Task UI, Resolver Node & Dọn dẹp Codebase (Phase 5)

### 5.1. Mục tiêu
Hoàn thiện quy trình phê duyệt cho người duyệt (Approver), tích hợp Resolver động (ManagerOf, Role) và loại bỏ hoàn toàn các logic/tàn dư của mô hình Single/Batch cũ không còn phù hợp.

### 5.2. Hạng mục Công việc Chi tiết

#### A. Resolver Node & Phân bổ Người duyệt (Backend)
- [ ] Hoàn thiện các loại Resolver trong `AssigneeResolver`:
  - `MANAGER_OF`: Đọc `initiator.userId` từ context -> Tra cứu qua `DirectoryService` để tìm Trưởng bộ phận trực tiếp -> Gán `TaskExecution`.
  - `FIXED_USER`: Gán cố định theo ID.
  - `ROLE`: Gán cho nhóm quyền (VD: `HR_MANAGER`, `FINANCE_DIRECTOR`).
  - `INITIATOR`: Gán ngược lại cho người tạo.
- [ ] Xử lý hoàn tất Task:
  - Khi người duyệt bấm Approve / Reject:
    - Cập nhật `TaskExecution` (status, comment, action).
    - Kích hoạt Engine chuyển sang Node tiếp theo hoặc chuyển sang Node Kết thúc (End Node).

#### B. Frontend Task Approval Center
- [ ] Màn hình **Nhiệm vụ của tôi (My Tasks)** (`/my-tasks`):
  - Cập nhật giao diện danh sách task chờ duyệt: Tiêu đề task, Mã ticket liên quan, Người gửi, Ngày gửi.
- [ ] Modal / Trang **Chi tiết Phê duyệt Task**:
  - Hiển thị thông tin người nộp.
  - Nhúng **DynamicFormRenderer** ở chế độ **Read-only**: Người duyệt nhìn thấy toàn bộ thông tin đơn yêu cầu.
  - Lịch sử phê duyệt trước đó (Audit Trail / Approval Timeline).
  - Khung nhập ý kiến/lý do phê duyệt (`comment`).
  - Nút **"Phê duyệt (Approve)"** (Xanh) và **"Từ chối (Reject)"** (Đỏ).

#### C. Quản trị Phiên bản & Cảnh báo Nâng cấp (Impact Alerts)
- [ ] Thêm logic phát hiện version mới:
  - API kiểm tra xem `form_definition` có version mới hơn version đang gắn vào Category hay không.
  - UI Category hiển thị nhãn cảnh báo: *"Có Form version mới"* kèm nút *"Cập nhật và kiểm tra tương thích"*.

#### D. Dọn dẹp & Tối ưu Codebase (Clean-up)
- [ ] Rà soát và gỡ bỏ các đoạn code liên quan đến mô hình Batch Campaign cũ (như flow import danh sách participant excel hàng loạt trong ServiceCatalog cũ nếu không còn dùng).
- [ ] Đảm bảo toàn bộ test case hiện có của core engine chạy xanh.
- [ ] Cập nhật tài liệu README và API Docs của dự án.

### 5.3. Tiêu chí Nghiệm thu
- [x] Sau khi User tạo ticket -> Task xuất hiện ngay tại My Tasks của Trưởng phòng (`MANAGER_OF`).
- [x] Trưởng phòng mở task xem được đúng dữ liệu form, bấm Approve -> Ticket chuyển sang bước tiếp theo hoặc kết thúc thành công (`APPROVED`).
- [x] Nếu Trưởng phòng bấm Reject -> Ticket lập tức kết thúc với trạng thái `REJECTED`.
- [x] Toàn bộ hệ thống chạy thông suốt end-to-end từ Admin tạo Form/Workflow/Category đến User tạo Ticket và Manager duyệt Task.

---

## Ma trận Phụ thuộc & Đánh giá Rủi ro (Risk & Dependency Matrix)

| Giai đoạn | Rủi ro tiềm ẩn | Biện pháp giảm thiểu |
|---|---|---|
| **Phase 1** | Schema Form quá phức tạp gây khó khăn cho việc render linh hoạt | Khởi đầu với bộ 8 field cơ bản; chuẩn hóa cấu trúc JSON Schema theo chuẩn đơn giản trước khi mở rộng layout nâng cao. |
| **Phase 2** | Type mismatch khi so sánh số hoặc ngày tháng trong Condition | Ép kiểu (Type coercion) chặt chẽ trong `StructuredConditionEvaluator`, kiểm tra null-safe trước khi so sánh. |
| **Phase 3** | Admin cấu hình sai tên field gây crash khi chạy Workflow | Compatibility Validation là bắt buộc ở Backend, chặn hoàn toàn không cho Save nếu còn lỗi tương thích. |
| **Phase 4** | Lệch trạng thái giữa Ticket và Workflow Instance khi có sự cố giao dịch (Transaction failure) | Đồng bộ trạng thái trong cùng một Database Transaction; sử dụng Spring Event Listener với `@TransactionalEventListener`. |
| **Phase 5** | Không tìm thấy Manager của Initiator (`MANAGER_OF` trả về rỗng) | Cung cấp cơ chế Fallback Assignee (chuyển tiếp cho Admin hoặc HR) nếu không tìm thấy quản lý trực tiếp trong danh bạ. |
