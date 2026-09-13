# Tài liệu REST API: Workflow Platform & Ticket Management

Tài liệu này đặc tả toàn diện danh mục các REST API của hệ thống Workflow Platform theo kiến trúc phân rã (**Decoupled Binding Architecture**) giữa **Form**, **Workflow Engine** và **Ticket Category**.

---

## 1. Tổng quan & Xác thực (Authentication)

- **Base URL:** `/api/v1`
- **Định dạng dữ liệu:** `application/json` (UTF-8)
- **Cơ chế xác thực:** Bearer Token qua header `Authorization: Bearer <token>`
- **Môi trường Dev:** Hỗ trợ header `X-User-Id: <userId>` khi kích hoạt cấu hình `VITE_ALLOW_DEV_USER_HEADER=true`.

---

## 2. Quản lý Biểu mẫu (Form Engine APIs)

### 2.1. Danh sách Form
- **Endpoint:** `GET /api/v1/forms`
- **Query Params:**
  - `status`: `DRAFT` | `PUBLISHED` | `ARCHIVED` (Tùy chọn)
  - `search`: Từ khóa tìm kiếm theo tên hoặc mã code
- **Mô tả:** Trả về danh sách tóm tắt các Form trong hệ thống.

### 2.2. Chi tiết Form
- **Endpoint:** `GET /api/v1/forms/{id}`
- **Response:**
  ```json
  {
    "id": "form-uuid",
    "name": "Đơn xin đi công tác",
    "code": "FORM_BUSINESS_TRIP",
    "description": "Biểu mẫu đăng ký lịch trình công tác",
    "status": "PUBLISHED",
    "draftSchema": {
      "fields": [
        { "id": "destination", "type": "TEXT", "label": "Địa điểm", "required": true },
        { "id": "cost", "type": "NUMBER", "label": "Chi phí dự kiến", "required": true }
      ]
    },
    "currentVersionNumber": 1,
    "createdAt": "2026-09-12T10:00:00Z",
    "updatedAt": "2026-09-12T10:05:00Z"
  }
  ```

### 2.3. Tạo mới Form (Draft)
- **Endpoint:** `POST /api/v1/forms`
- **Request Body:**
  ```json
  {
    "name": "Đơn xin đi công tác",
    "code": "FORM_BUSINESS_TRIP",
    "description": "Biểu mẫu đăng ký lịch trình công tác",
    "initialSchema": {
      "fields": [ ... ]
    }
  }
  ```

### 2.4. Cập nhật bản nháp Form (Draft Schema)
- **Endpoint:** `PUT /api/v1/forms/{id}/draft`
- **Request Body:**
  ```json
  {
    "name": "Đơn xin đi công tác (Cập nhật)",
    "description": "...",
    "schema": {
      "fields": [ ... ]
    }
  }
  ```

### 2.5. Xuất bản Form (Publish Form Version)
- **Endpoint:** `POST /api/v1/forms/{id}/publish`
- **Mô tả:** Đóng băng bản nháp `draftSchema` hiện tại thành một `FormVersion` bất biến (Immutable Snapshot) với số version tăng tự tiến ($v1 \rightarrow v2 \dots$).
- **Response:**
  ```json
  {
    "id": "form-version-uuid",
    "formDefinitionId": "form-uuid",
    "versionNumber": 2,
    "schemaSnapshot": { ... },
    "publishedBy": "admin",
    "publishedAt": "2026-09-12T10:10:00Z"
  }
  ```

### 2.6. Lịch sử các Version đã xuất bản của Form
- **Endpoint:** `GET /api/v1/forms/{id}/versions`
- **Response:** Danh sách các `FormVersion` kèm `schemaSnapshot` và số phiên bản.

---

## 3. Quản trị Danh mục Ticket (Ticket Category APIs)

Ticket Category đóng vai trò là cầu nối gắn kết (Binding Contract) giữa 1 `FormVersion` cụ thể và 1 `WorkflowExecutable` cụ thể.

### 3.1. Đối soát Tương thích (Compatibility Validation)
- **Endpoint:** `POST /api/v1/ticket-categories/validate-mapping`
- **Request Body:**
  ```json
  {
    "formVersionId": "fv-uuid-001",
    "workflowExecutableId": "wf-exec-uuid-001",
    "fieldMapping": {}
  }
  ```
- **Response:**
  ```json
  {
    "compatible": true,
    "missingFields": [],
    "typeMismatches": [],
    "warnings": []
  }
  ```

### 3.2. Tạo Danh mục Ticket
- **Endpoint:** `POST /api/v1/ticket-categories`
- **Quyền yêu cầu:** `CATEGORY_MANAGE` hoặc `ROLE_ADMIN`
- **Request Body:**
  ```json
  {
    "name": "Đăng ký Đi Công Tác",
    "code": "CAT_BUSINESS_TRIP",
    "description": "Dành cho nhân viên đăng ký công tác",
    "icon": "Briefcase",
    "color": "#4F46E5",
    "formVersionId": "fv-uuid-001",
    "workflowExecutableId": "wf-exec-uuid-001",
    "fieldMapping": {},
    "isActive": true
  }
  ```

### 3.3. Danh sách Danh mục Ticket
- **Endpoint:** `GET /api/v1/ticket-categories`
- **Query Params:**
  - `search`: Tìm theo tên hoặc mã code
  - `activeOnly`: `true` (mặc định cho Portal nhân viên) hoặc `false` (cho Admin)
- **Response:** Danh sách Category kèm thông tin phiên bản ghim, chỉ số `hasNewerFormVersion`, `latestFormVersionNumber`.

### 3.4. Cập nhật / Bật tắt Danh mục
- **Endpoint:** `PUT /api/v1/ticket-categories/{id}`
- **Endpoint:** `PATCH /api/v1/ticket-categories/{id}/active` (Body: `{"active": true|false}`)

---

## 4. Quản lý Phiếu Yêu Cầu (Ticket Management APIs)

### 4.1. Tạo mới Ticket (Submit Ticket)
- **Endpoint:** `POST /api/v1/tickets`
- **Quyền yêu cầu:** `TICKET_CREATE` (hoặc vai trò nhân viên bất kỳ)
- **Request Body:**
  ```json
  {
    "categoryId": "cat-uuid-001",
    "formData": {
      "destination": "Đà Nẵng",
      "cost": 5000000,
      "purpose": "Họp triển khai dự án"
    }
  }
  ```
- **Xử lý:** Backend validate dữ liệu nộp theo đúng `formSchemaSnapshot` của Category, tạo bản ghi `TicketEntity`, và kích hoạt `WorkflowInstance` tương ứng với context đầy đủ.
- **Response:** `TicketDetailResponse` (Trạng thái ban đầu: `SUBMITTED` hoặc `IN_REVIEW`).

### 4.2. Danh sách Phiếu của tôi (My Tickets)
- **Endpoint:** `GET /api/v1/tickets/my`
- **Query Params:**
  - `search`: Tìm theo mã ticket hoặc từ khóa
  - `status`: `ALL` | `SUBMITTED` | `IN_REVIEW` | `APPROVED` | `REJECTED` | `CANCELLED`
  - `categoryId`: Lọc theo danh mục

### 4.3. Danh sách Toàn bộ Phiếu (All Tickets)
- **Endpoint:** `GET /api/v1/tickets`
- **Quyền yêu cầu:** `TICKET_MANAGE` hoặc Quản trị viên
- **Query Params:** Hỗ trợ `search`, `status`, `categoryId`.

### 4.4. Chi tiết Phiếu Yêu Cầu
- **Endpoint:** `GET /api/v1/tickets/{id}`
- **Response:**
  ```json
  {
    "id": "tck-uuid-001",
    "ticketCode": "TCK-20260912-A1B2",
    "categoryId": "cat-uuid-001",
    "categoryName": "Đăng ký Đi Công Tác",
    "formVersionNumber": 1,
    "formSchemaSnapshot": { ... },
    "formData": { ... },
    "initiatorId": "U002",
    "initiatorName": "Trần Hoàng Bách",
    "initiatorDepartmentName": "Phòng Công nghệ",
    "status": "APPROVED",
    "currentStepName": "Kết thúc",
    "createdAt": "2026-09-12T10:00:00Z",
    "resolvedAt": "2026-09-12T10:15:00Z",
    "timeline": [
      {
        "executionOrder": 1,
        "nodeId": "start",
        "nodeName": "Bắt đầu",
        "nodeType": "START",
        "state": "COMPLETED",
        "startedAt": "2026-09-12T10:00:00Z",
        "completedAt": "2026-09-12T10:00:00Z"
      },
      {
        "executionOrder": 2,
        "nodeId": "approval_manager",
        "nodeName": "Quản lý duyệt chi phí",
        "nodeType": "APPROVAL",
        "state": "COMPLETED",
        "action": "APPROVED",
        "assigneeName": "Phạm Hồng Dũng",
        "comment": "Đồng ý phê duyệt công tác",
        "startedAt": "2026-09-12T10:00:01Z",
        "completedAt": "2026-09-12T10:14:50Z"
      },
      {
        "executionOrder": 3,
        "nodeId": "end_approved",
        "nodeName": "Kết thúc",
        "nodeType": "END",
        "state": "COMPLETED",
        "startedAt": "2026-09-12T10:15:00Z",
        "completedAt": "2026-09-12T10:15:00Z"
      }
    ]
  }
  ```

### 4.5. Hủy Phiếu Yêu Cầu (Cancel Ticket)
- **Endpoint:** `POST /api/v1/tickets/{id}/cancel`
- **Mô tả:** Người tạo có quyền hủy phiếu khi phiếu chưa được phê duyệt/từ chối. Hệ thống tự động hủy Workflow Instance liên kết.

---

## 5. Phê Duyệt & Xử Lý Nhiệm Vụ (Task Approval APIs)

### 5.1. Danh sách Task của Tôi (My Tasks)
- **Endpoint:** `GET /api/v1/tasks`
- **Mô tả:** Lấy danh sách task được gán trực tiếp cho người dùng hiện tại hoặc theo nhóm quyền (Role / Pool). Tự động kèm dữ liệu Ticket liên kết (`ticketId`, `ticketCode`, `categoryName`, `initiator`, `formSchemaSnapshot`, `formData`, `approvalHistory`).

### 5.2. Hoàn tất / Phê duyệt Task (Complete / Approve)
- **Endpoint:** `POST /api/v1/tasks/{id}/complete`
- **Request Body:**
  ```json
  {
    "comment": "Đồng ý phê duyệt chi phí công tác",
    "data": {}
  }
  ```
- **Xử lý:** Cập nhật task thành `COMPLETED`, ghi nhận audit trail, chuyển tiếp workflow qua cổng `APPROVED`.

### 5.3. Từ chối Task (Reject)
- **Endpoint:** `POST /api/v1/tasks/{id}/reject`
- **Request Body:**
  ```json
  {
    "comment": "Chi phí công tác vượt định mức cho phép"
  }
  ```
- **Xử lý:** Cập nhật task thành `REJECTED`, điều hướng qua cổng `REJECTED`, kích hoạt cơ chế `rejectParticipant` để kết thúc quy trình với trạng thái `REJECTED`.

---

## 6. Workflow Engine Core APIs

### 6.1. Quản trị Định nghĩa Workflow
- `GET /api/v1/workflows`: Danh sách workflow
- `POST /api/v1/workflows`: Tạo bản thiết kế workflow mới
- `PUT /api/v1/workflows/{id}`: Cập nhật bản thiết kế workflow
- `POST /api/v1/workflows/{id}/validate`: Kiểm tra tính hợp lệ của đồ thị DAG
- `POST /api/v1/workflows/{id}/publish`: Biên dịch DAG thành `WorkflowExecutable` và tạo `WorkflowVersion` bất biến

### 6.2. Theo dõi Instance Thực thi
- `GET /api/v1/instances`: Danh sách workflow instances
- `GET /api/v1/instances/{id}`: Chi tiết instance, danh sách participant, context data và audit timeline
- `POST /api/v1/instances/{id}/cancel`: Hủy instance đang chạy
