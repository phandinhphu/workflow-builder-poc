# Kiến trúc Service Catalog & Mô hình Điều phối Task Động (Dynamic Multi-Tasking)

Tài liệu này lưu trữ đặc tả kiến trúc kỹ thuật chi tiết về **Service Catalog (Cổng dịch vụ & quy trình On-Demand)**, **Phân tách Node Assignment vs Node Form**, và **Cơ chế Phân phối Task Động (Dynamic Fan-out Engine)** trong hệ thống Workflow Builder.

---

## 1. Bản chất & Chu kỳ Vận hành: Single/On-Demand vs Batch/Campaign Workflow

Trong hệ thống quản lý quy trình nghiệp vụ (BPMN / Workflow Engine), các quy trình được phân loại theo 2 mô hình vận hành chính:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             MÔ HÌNH VẬN HÀNH WORKFLOW                            │
├────────────────────────────────────────┬─────────────────────────────────────────┤
│    ON-DEMAND SERVICE CATALOG PATTERN   │       BATCH / CAMPAIGN PATTERN          │
│       (Quy trình theo yêu cầu)         │          (Quy trình định kỳ)            │
├────────────────────────────────────────┼─────────────────────────────────────────┤
│ • Đặc điểm: Phát sinh đột xuất do một   │ • Đặc điểm: Kích hoạt đồng loạt theo    │
│   Initiator/Người dùng yêu cầu (vd:    │   đợt/chiến dịch (vd: Đánh giá nhân     │
│   Mua máy tính, Xin nghỉ phép, Đi tour)│   sự Q1, Khảo sát bảo mật toàn công ty) │
│ • Khởi tạo: 1 User click "Tạo yêu cầu" │ • Khởi tạo: Admin/HR trigger 1 lần cho  │
│ • Vòng đời Instance:                   │   toàn bộ N nhân viên cùng lúc.       │
│   - Sinh 1 Instance độc lập.           │ • Vòng đời Instance:                    │
│   - Chạy qua các bước và kết thúc      │   - 1 Instance chứa N Participant     │
│     (COMPLETED / REJECTED).            │     Executions chạy song song.          │
│ • "Duy trì liên tục" ở đây nghĩa là:   │   - Instance kết thúc khi tất cả        │
│   Workflow Definition ở trạng thái     │     nhân viên hoàn tất.                 │
│   PUBLISHED trên Service Catalog.      │                                         │
└────────────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 2. Phân tách Kiến trúc giữa Node Assignment và Node Form

### 2.1. Node Assignment (Phân bổ / Thu thập người tham gia)
- **Mục đích**: Thu thập tập người dùng mục tiêu từ người thực hiện bước này (HR, Manager, Initiator) để phục vụ cho các bước tiếp theo trong quy trình.
- **Vai trò người thực hiện (`AssigneeResolver`)**:
  - `INITIATOR`: Chính người vừa tạo đơn/yêu cầu (ví dụ: HR khởi tạo yêu cầu mua máy tính cho nhóm của mình).
  - `FIXED_USER` / `ROLE` / `DEPARTMENT_HEAD`: Trưởng nhóm hoặc nhân sự được chỉ định.
- **Phương thức thu thập (`Collection Mode`)**:
  1. **User Picker (HRM Directory)**: Chọn nhiều người trực tiếp từ danh bạ công ty, hỗ trợ tìm kiếm và lọc theo phòng ban.
  2. **File Upload (Excel / CSV)**:
     - Kéo thả file Excel (`.xlsx`, `.xls`) hoặc `.csv`.
     - Tải file mẫu chuẩn (có sẵn cột Mã NV, Họ tên, Email, Ghi chú).
     - Engine tự động đối soát (match) mã nhân viên/email với HRM Directory.
     - Hiển thị bảng Preview các dòng hợp lệ và cảnh báo các dòng lỗi (mã không tồn tại, user đã nghỉ việc).
- **Cấu hình SLA**: Tùy chọn (Optional).
- **Dữ liệu Context sinh ra sau khi hoàn thành**:
  ```json
  "nodes": {
    "node_assignment_laptop": {
      "participantIds": ["usr_001", "usr_002", "usr_003"],
      "participants": [
        { "id": "usr_001", "employeeCode": "EMP01", "displayName": "Nguyen Van A", "email": "a@acme.com", "department": "IT" },
        { "id": "usr_002", "employeeCode": "EMP02", "displayName": "Tran Thi B", "email": "b@acme.com", "department": "IT" }
      ],
      "totalParticipants": 2
    }
  }
  ```

---

### 2.2. Node Form (Biểu mẫu thông tin & Dynamic Task)
- **Mục đích**: Cung cấp giao diện form để người dùng nhập thông tin theo thiết kế nghiệp vụ (cấu hình máy tính, lý do, kích thước áo, ngày đi...).
- **Người thực hiện (`AssigneeResolver`)**:
  - `DYNAMIC`: Tham chiếu danh sách động từ Node Assignment trước đó (ví dụ: `${nodes.node_assignment_laptop.participantIds}`).
  - `CURRENT_PARTICIPANT`: Dành cho batch campaign (mỗi participant làm form của mình).
  - `FIXED_USER` / `ROLE`: Người cố định.
- **Chế độ phân bổ (`Assignment Mode`)**:
  - `DIRECT_ALL`: Tạo $N$ task độc lập cho toàn bộ $N$ người trong danh sách động.
- **Chính sách hoàn thành (`Completion Policy`)**:
  - `ALL`: Chờ tất cả $N$ người nộp form mới tiếp tục luồng.
  - `ANY`: Chỉ cần 1 người nộp form là tiếp tục.
  - `THRESHOLD`: Đạt ngưỡng phần trăm (ví dụ: 80% người nộp).
- **Cấu hình SLA**: Đầy đủ (Thời hạn xử lý, cảnh báo quá hạn, Escalate/Reassign/Reject).
- **Dữ liệu Context sinh ra sau khi hoàn thành**:
  ```json
  "nodes": {
    "node_form_specs": {
      "submissions": {
        "usr_001": { "laptopType": "Macbook Pro M3", "ram": "32GB", "reason": "Lập trình iOS" },
        "usr_002": { "laptopType": "ThinkPad P1", "ram": "64GB", "reason": "Data Engineering" }
      },
      "submissionList": [
        {
          "taskId": "task_1",
          "userId": "usr_001",
          "user": { "id": "usr_001", "displayName": "Nguyen Van A", "department": "IT" },
          "data": { "laptopType": "Macbook Pro M3", "ram": "32GB" },
          "action": "COMPLETE",
          "submittedAt": "2026-09-06T10:30:00Z"
        },
        {
          "taskId": "task_2",
          "userId": "usr_002",
          "user": { "id": "usr_002", "displayName": "Tran Thi B", "department": "IT" },
          "data": { "laptopType": "ThinkPad P1", "ram": "64GB" },
          "action": "COMPLETE",
          "submittedAt": "2026-09-06T10:35:00Z"
        }
      ],
      "totalSubmissions": 2
    }
  }
  ```

---

## 3. Luồng Nghiệp vụ Điển hình: Mua máy tính cho $N$ nhân viên

```
                  [START NODE]
                       │
                       ▼
            [NODE ASSIGNMENT: Thêm DS nhân viên]
            - Assignee: INITIATOR (HR tạo đơn)
            - Action: HR upload file Excel 10 nhân sự
            - Context: Lưu nodes.assignment.participantIds (10 users)
                       │
                       ▼
            [NODE FORM: Đăng ký cấu hình máy]
            - Assignee: DYNAMIC (${nodes.assignment.participantIds})
            - Mode: DIRECT_ALL (10 tasks gửi đến 10 nhân viên)
            - Policy: ALL (Chờ đủ 10 người điền)
            - SLA: 48 giờ (Nhắc nhở qua Email/In-app)
            - Output: nodes.form.submissionList (10 cấu hình)
                       │
                       ▼
            [NODE APPROVAL: Trưởng phòng IT duyệt]
            - Assignee: ROLE (IT_DIRECTOR)
            - UI: Hiển thị Bảng tổng hợp (DynamicSubmissionsTable)
            - Action: Phê duyệt toàn bộ 10 máy
                       │
                       ▼
            [NODE NOTIFICATION: Thông báo hoàn tất]
            - Gửi thông báo đến HR & 10 nhân viên
                       │
                       ▼
                   [END NODE]
```

---

## 4. Thiết kế Cổng Dịch vụ (Service Catalog Portal)

1. **Hiển thị danh mục**:
   - Nhân viên truy cập tab **"Cổng Dịch vụ (Catalog)"** trên thanh điều hướng.
   - Hệ thống hiển thị các thẻ quy trình `PUBLISHED` (Mua thiết bị, Nghỉ phép, Đăng ký sự kiện, Onboarding...).
2. **Kích hoạt tức thì**:
   - Khi bấm "Tạo yêu cầu ngay", hệ thống gọi API `POST /workflows/{id}/instances`.
   - Sinh ra 1 `WorkflowInstance` với mã yêu cầu duy nhất `requestCode` (ví dụ: `REQ-LAPTOP-2026-0042`).
   - Tự động gán task đầu tiên (Node Assignment) cho người tạo (Initiator) trong danh sách "Nhiệm vụ của tôi".

---

## 5. Đảm bảo Tính toàn vẹn và Hiệu năng Core Engine

1. **Không ô nhiễm Context DB**:
   - Không lưu file nhị phân vào Database JSON context. File được phân tích tại tầng Service và chỉ lưu metadata có cấu trúc.
2. **Kế thừa và tái sử dụng Primitives**:
   - `createTasks()` hỗ trợ `DIRECT_ALL` sinh $N$ tasks cho cùng một `nodeExecutionId`.
   - `completionReached()` đảm bảo kiểm tra điều kiện hoàn thành chuẩn xác theo chính sách `ALL` / `ANY` / `THRESHOLD`.
   - `aggregateTaskOutputs()` tự động tổng hợp kết quả của tất cả các dynamic sibling tasks khi kết thúc bước.
3. **Phòng chống Deadlock & Race Condition**:
   - Sử dụng transaction phân lập và khóa bi quan (`findLockedById`) khi nhận và nộp task.
