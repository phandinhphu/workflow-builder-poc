# **Yêu cầu chi tiết chức năng tạo Workflow** 

Tài liệu mô tả các chức năng chính, hành động người dùng có thể thực hiện, quyền hạn và tiêu chí nghiệm thu cho Workflow Builder. 

## **1. Mục tiêu** 

Cho phép người dùng tự tạo, cấu hình và quản lý các quy trình workflow nhằm tự động hóa việc xử lý nghiệp vụ giữa nhiều người dùng, phòng ban hoặc hệ thống. 

## **2. Phạm vi chức năng** 

Tạo mới Workflow Chỉnh sửa Workflow Khởi tạo workflow từ đầu hoặc theo mẫu. Cập nhật thông tin, bước xử lý, điều kiện và người xử lý. Xóa Workflow Kích hoạt Workflow Cho phép xóa khi workflow chưa được sử Publish workflow sau khi validate thành dụng hoặc không có instance đang chạy. công. 

Tạm ngưng Workflow Ngừng sử dụng workflow đã publish khi cần. 

Theo dõi Workflow Xem trạng thái thực thi và lịch sử xử lý. 

## **3. Action User có thể thực hiện** 

### **3.1 Quản lý Workflow** 

#### **Create Workflow** 

- Nhập tên workflow. 

- Nhập mô tả workflow. 

- Chọn loại workflow. 

- Chọn module áp dụng. 

- Thiết lập người sở hữu workflow. 

- Thiết lập phiên bản workflow. 

#### **Edit Workflow** 

- Thay đổi tên workflow. 

- Thay đổi mô tả workflow. 

- Thêm bước mới. 

- Xóa bước. 

- Chỉnh sửa điều kiện. 

- Thay đổi người xử lý. 

#### **Delete Workflow** 

Workflow requirement specification 

Trang 1 

- Chỉ cho phép xóa khi workflow chưa được sử dụng hoặc không có instance đang chạy. 

- Sau khi xóa, workflow chuyển sang trạng thái Deleted hoặc Soft Delete. 

### **3.2 Thiết kế luồng Workflow** 

Người dùng có thể thêm các loại bước sau: 

Start Điểm bắt đầu workflow. 

Approval Step Bước phê duyệt gồm approver, deadline, escalation rule và reject action. 

Review Step 

Bước review nội dung hoặc hồ sơ trước khi chuyển tiếp. 

Assignment Step Giao việc cho user hoặc group. 

Notification Step Gửi thông báo qua email, in-app, Teams hoặc webhook. 

System Action Step Tự động update dữ liệu, gọi API, tạo record hoặc cập nhật trạng thái. 

End Kết thúc workflow. 

### **3.3 Quản lý kết nối giữa các bước** 

#### **Add Connection** 

- Kéo thả nối giữa các bước. 

- Định nghĩa điều kiện chuyển tiếp. 

IF Amount > 100M 

→ Director Approval 

ELSE 

→ Manager Approval 

#### **Delete Connection** 

- Xóa luồng kết nối giữa các bước. 

#### **Update Connection** 

- Chỉnh sửa điều kiện chuyển tiếp. 

### **3.4 Quản lý điều kiện** 

- Add Condition: Thêm điều kiện như Amount > 10000000, Department = IT, Request Type = Purchase. 

- Edit Condition: Thay đổi operator hoặc giá trị. 

- Delete Condition: Xóa điều kiện không còn sử dụng. 

### **3.5 Quản lý Approver** 

- Fixed User: Chỉ định một người dùng cụ thể. 

- Role Based: Chọn theo vai trò như Manager, Director, Finance Lead. 

- Dynamic User: Lấy theo dữ liệu động như Request Creator Manager, Department Head, Project Manager. 

Workflow requirement specification 

Trang 2 

### **3.6 Notification** 

User có thể cấu hình thông báo theo trigger: 

- Created 

- Approved 

- Rejected 

- Completed 

Kênh thông báo hỗ trợ: 

- Email Notification 

- In-app Notification 

- Teams Notification 

- Webhook Notification 

### **3.7 SLA Configuration** 

#### **Set Due Date** 

- 2 ngày làm việc. 

- 5 giờ. 

- 24 giờ. 

#### **Escalation Rule** 

- Nhắc approver khi quá hạn. 

- Chuyển cấp cao hơn khi quá hạn. 

- Tự động reject khi quá hạn. 

### **3.8 Publish Workflow** 

- Draft: Workflow đang chỉnh sửa. 

- Publish: Workflow sẵn sàng sử dụng. 

Điều kiện publish: 

- Có Start Step. 

- Có End Step. 

- Không có node lỗi. 

- Validate thành công. 

### **3.9 Theo dõi Workflow Runtime** 

#### **View Workflow Instance** 

- Request ID. 

- Current Step. 

- Assigned User. 

- Status. 

- Start Time. 

#### **Search Workflow Instance** 

- Workflow Name. 

- Request Code. 

- Người tạo. 

#### **Filter** 

Workflow requirement specification 

Trang 3 

- Pending. 

- Approved. 

- Rejected. 

- Completed. 

- Cancelled. 

### **3.10 Audit & History** 

#### **Version History** 

- Version 1.0. 

- Version 1.1. 

- Version 2.0. 

#### **Change Log** 

- Ai sửa. 

- Sửa lúc nào. 

- Nội dung thay đổi: thêm step, xóa step, đổi approver, đổi condition. 

## **4. Quyền hạn** 

|Quyền<br>Admin|Chức năng<br>Toàn quyền.|
|---|---|
|Workflow Owner|Tạo, sửa, xóa, publish workflow.|
|Editor|Chỉnh sửa workflow.|
|Viewer|Chỉ xem workflow.|
|Approver|Thực hiện phê duyệt.|



## **5. Trạng thái Workflow** 

Draft ↓ Published ↓ Running ↓ Completed Hoặc 

Running ↓ Rejected Hoặc Running ↓ Cancelled 

Workflow requirement specification 

Trang 4 

Hoặc Published ↓ Suspended 

## **6. User Story mẫu** 

### **US-001: Tạo Workflow** 

Là Workflow Owner, tôi muốn tạo một Workflow mới để cấu hình quy trình phê duyệt yêu cầu mua sắm. 

#### **Acceptance Criteria** 

- Có thể nhập tên workflow. 

- Có thể thêm step. 

- Có thể cấu hình approver. 

- Có thể định nghĩa condition. 

- Có thể publish workflow sau khi validate thành công. 

Ghi chú: Tài liệu này có thể dùng làm đầu vào cho BA/BRD hoặc chuyển tiếp thành backlog/user story cho đội phát triển. 

Workflow requirement specification 

Trang 5 

