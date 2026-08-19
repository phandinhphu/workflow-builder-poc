_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

# **WORKFLOW BUILDER** 

### **TÀI LIỆU MÔ TẢ CHI TIẾT HỆ THỐNG** 

_Tập trung vào khả năng tạo Workflow linh hoạt, cấu hình được và ĐỘNG tại runtime_ 

|**Thông tin**|**Giá trị**|
|---|---|
|Loại tài liệu|System / Functional Specification|
|Phạm vi|Workflow Builder, Workflow Definition, Runtime Execution,<br>Monitoring, Audit, Organization Resolution|
|Trọng tâm|Tạo workflow đáp ứng requirement và bảo đảm tính ĐỘNG|
|Nguồn yêu cầu cơ sở|workflow_requirement(2).pdf – Workflow requirement specification|
|Phiên bản tài liệu|1.0|



**Phạm vi tài liệu:** Tài liệu mô tả nền tảng Workflow Builder ở mức hệ thống. Không mô tả các workflow nghiệp vụ demo cụ thể. Các phần mở rộng về runtime context, participant execution, dynamic resolver và version binding là thiết kế đề xuất nhằm hiện thực hóa yêu cầu “động” của hệ thống. 

Trang 1 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

## **Mục lục nội dung** 

- 1. Mục tiêu và định hướng hệ thống 

- 2. Phạm vi chức năng 

- 3. Nguyên tắc thiết kế – thế nào là một Workflow “ĐỘNG” 

- 4. Thuật ngữ và mô hình khái niệm 

- 5. Tác nhân và quyền hạn 

- 6. Các module chức năng chính 

- 7. Tạo và cấu hình Workflow – đặc tả chi tiết 

- 8. Mô hình thực thi Workflow Runtime 

- 9. Theo dõi Runtime, Audit và History 

- 10. Tích hợp dữ liệu tổ chức và Dynamic User Resolution 

- 11. Danh mục Use Case 

- 12. Đặc tả Use Case chi tiết 

- 13. Mô hình trạng thái 

- 14. Mô hình dữ liệu khái niệm 

- 15. Validation và Acceptance Criteria 

- 16. Traceability với requirement gốc 

- 17. Các nguyên tắc kỹ thuật để giữ hệ thống thực sự ĐỘNG 

- 18. Các quyết định thiết kế cần chốt khi triển khai 

Trang 2 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

## **1. Mục tiêu và định hướng hệ thống** 

Workflow Builder là nền tảng cho phép người dùng trong tổ chức tự tạo, cấu hình, publish, vận hành và theo dõi các quy trình xử lý mà không cần sửa mã nguồn cho từng nghiệp vụ. Hệ thống đóng vai trò như một engine điều phối: business định nghĩa “quy trình gồm những bước nào, ai xử lý, điều kiện chuyển tiếp là gì, dữ liệu được lấy từ đâu và kết quả được gửi đi đâu”; engine chịu trách nhiệm thực thi định nghĩa đó tại runtime. 

- Cho phép tạo workflow từ đầu hoặc từ template. 

- Cho phép chỉnh sửa bước xử lý, điều kiện, người xử lý và kết nối giữa các bước. 

- Cho phép publish sau khi validate thành công, tạm ngưng khi cần, và theo dõi lịch sử thực thi. 

- Cho phép nhiều người dùng, phòng ban và hệ thống bên ngoài cùng tham gia một quy trình. 

- Cho phép cấu hình thay đổi theo dữ liệu runtime: người xử lý động, nhánh xử lý động, dữ liệu input/output động và tập participant động. 

**Nguyên tắc nền:** Workflow Builder không phải một ứng dụng nghiệp vụ cố định. Business rule phải được biểu diễn bằng Workflow Definition và cấu hình node/connection; không tạo node riêng cho từng quy trình cụ thể nếu cùng capability có thể được biểu diễn bằng primitive generic. 

## **2. Phạm vi chức năng** 

|**Nhóm**|**Nội dung**|
|---|---|
|Quản lý Workflow|Tạo mới, tạo từ mẫu, xem danh sách, sửa metadata, xóa/soft-delete theo rule,<br>publish, suspend/reactivate.|
|Thiết kế Workflow|Kéo thả node, cấu hình node, tạo/xóa/sửa connection, cấu hình condition, form,<br>assignee, SLA, notification, system action.|
|Versioning|Lưu lịch sử version; published runtime phải gắn với version cụ thể; version mới không<br>làm thay đổi instance đang chạy.|
|Runtime|Nhận trigger, tạo Workflow Instance, resolve participant/assignee/input, thực thi<br>node, phát sinh task, xử lý event nội bộ, điều hướng theo connection.|
|Monitoring|Xem instance, current step, assigned user, status, start time, SLA; tìm kiếm và filter.|
|Audit|Ai sửa definition, sửa lúc nào, thay đổi gì; lịch sử runtime action và task.|
|Organization Resolution|Đồng bộ/đọc user và quan hệ manager; dùng làm nguồn resolve dynamic<br>assignee/participant.|
|Integration|System action/HTTP/webhook/notification kết nối hệ thống ngoài thông qua cấu hình.|



#### **2.1 Ngoài phạm vi cốt lõi** 

- Không triển khai lại toàn bộ HRM/ERP/Asset/Finance của tổ chức. 

- Không hard-code business rule của từng quy trình vào source code của Workflow Engine. 

- Không yêu cầu mỗi người tham gia phải tương ứng với một Workflow Instance riêng; execution model phải hỗ trợ một instance có nhiều participant/task. 

Trang 3 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

## **3. Nguyên tắc thiết kế – thế nào là một Workflow “ĐỘNG”** 

Từ “ĐỘNG” trong tài liệu này không chỉ có nghĩa là người dùng kéo thả được node. Một hệ thống chỉ thực sự dynamic khi Workflow Definition mô tả được cả cấu trúc lẫn các quy tắc resolve tại runtime, để cùng một definition có thể chạy với dữ liệu, người tham gia và đường đi khác nhau mà không sửa code. 

|**Chiều động**|**Ý nghĩa**|**Ví dụ biểu diễn**|
|---|---|---|
|Dynamic Trigger|Nguồn khởi chạy có thể cấu hình.|Manual, Schedule, Event/Webhook, API<br>trigger.|
|Dynamic Data|Input node được bind từ context hoặc output node<br>trước.|${trigger.requesterId}, ${nodeA.output.total}.|
|Dynamic Participant|Tập người tham gia được resolve theo tiêu chí<br>runtime.|All Active Users, Department X, danh sách từ<br>API.|
|Dynamic Assignee|Người xử lý được resolve khi task được tạo.|Fixed User, Role, Group, Current Participant,<br>Manager of Participant.|
|Dynamic Routing|Connection được chọn theo expression/condition.|amount > threshold, status == APPROVED.|
|Dynamic Form|Form schema/field có thể cấu hình cho human task.|Text, number, select, attachment;<br>required/validation.|
|Dynamic System<br>Action|Endpoint, request mapping và output mapping cấu<br>hình được.|HTTP method, URL, body template, response<br>mapping.|
|Dynamic SLA|Due date/escalation phụ thuộc cấu hình node.|2 working days, remind, escalate, auto<br>reject.|
|Dynamic Notification|Recipient/content/channel có thể bind từ context.|Email/in-app/Teams/webhook với template<br>variables.|



Trang 4 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

#### **3.1 Definition-time và Runtime-time** 

```
DESIGN TIME
Workflow Definition
  - Trigger definition
  - Participant rule
```

```
  - Nodes
```

```
  - Connections / conditions
```

```
  - Forms
  - Assignee resolver
  - SLA / escalation
  - Data bindings
        |
        | Publish version
        v
RUNTIME
Trigger event + Runtime data
        |
        v
Workflow Instance
        |
        +--> Resolve participants
        +--> Resolve node input
        +--> Resolve assignee
        +--> Execute node / create tasks
        +--> Persist output to context
        +--> Evaluate outgoing connections
        +--> Advance instance
```

#### **3.2 Quy tắc chống hard-code nghiệp vụ** 

- Tên phòng ban, role, user cụ thể có thể được chọn trong cấu hình nhưng không được nhúng vào logic engine. 

- Điều kiện business phải nằm trong expression/connection configuration, không nằm trong if/else của một service dành riêng cho quy trình. 

- System Action phải gọi connector/action generic; Workflow Definition chỉ cung cấp configuration/input mapping. 

- Node type biểu diễn capability kỹ thuật/nghiệp vụ tổng quát (Approval, Assignment, Review, Notification, System Action, Condition), không biểu diễn tên quy trình cụ thể. 

## **4. Thuật ngữ và mô hình khái niệm** 

|**Thuật ngữ**|**Định nghĩa**|
|---|---|
|Workflow Definition|Định nghĩa logic của một workflow: metadata, trigger, participant, node, connection,<br>condition, form, resolver, SLA...|
|Workflow Version|Một snapshot bất biến của Workflow Definition tại thời điểm publish. Runtime<br>instance tham chiếu chính xác version này.|
|Workflow Instance|Một lần thực thi của một Workflow Version, được tạo bởi trigger event.|
|Trigger Event|Sự kiện khởi tạo instance. Không đồng nhất với các internal event phát sinh khi<br>instance đang chạy.|



Trang 5 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**Thuật ngữ**|**Định nghĩa**|
|---|---|
|Internal Runtime Event|Sự kiện làm instance hiện tại tiến tiếp, ví dụ task<br>submitted/approved/rejected/timeout.|
|Node Definition|Cấu hình một bước trong Workflow Definition.|
|Node Execution|Một lần node được thực thi trong Workflow Instance.|
|Human Task|Task runtime yêu cầu người dùng tương tác: điền form, review, approve, thực hiện<br>việc được giao.|
|Participant|Đối tượng/người thuộc phạm vi tham gia của instance. Một instance có thể có nhiều<br>participant.|
|Participant Execution|Ngữ cảnh xử lý gắn với một participant khi một node được chạy “for each<br>participant”. Đây là abstraction runtime, không bắt buộc tên entity DB phải giống hệt.|
|Workflow Context|Kho dữ liệu runtime dùng để truyền dữ liệu giữa trigger, node, condition, task và<br>system action.|
|Resolver|Cơ chế chuyển một cấu hình động thành giá trị runtime, ví dụ assignee resolver hoặc<br>participant resolver.|
|Connection|Cạnh nối giữa hai node, có thể chứa condition/route metadata.|



```
WorkflowDefinition
```

```
      |
```

```
      +-- WorkflowVersion 1
```

```
      +-- WorkflowVersion 2 (Published)
```

```
                    |
```

```
                    | Trigger
                    v
```

```
             WorkflowInstance
                    |
```

```
        +-----------+-----------+
        |                       |
ParticipantExecution A   ParticipantExecution B
        |                       |
   Task/NodeExecution       Task/NodeExecution
```

## **5. Tác nhân và quyền hạn** 

|**Tác nhân**|**Vai trò**|
|---|---|
|Admin|Toàn quyền quản trị hệ thống, workflow, quyền, tích hợp và runtime theo policy.|
|Workflow Owner|Tạo, sửa, xóa theo rule, validate, publish/suspend workflow do mình sở hữu.|
|Editor|Chỉnh sửa Workflow Definition theo quyền được cấp.|
|Viewer|Chỉ xem definition/runtime được cấp quyền.|
|Approver|Thực hiện approval task tại runtime khi được resolve/assign.|
|Reviewer / Assignee|Thực hiện review/assignment task tại runtime.|



Trang 6 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**Tác nhân**|**Vai trò**|
|---|---|
|System / External<br>Application|Phát trigger event, nhận webhook, cung cấp dữ liệu hoặc thực hiện system action.|



#### **5.1 Phân quyền theo scope** 

Khuyến nghị phân biệt quyền global và quyền trên từng workflow. Admin là quyền hệ thống; Owner/Editor/Viewer nên có thể được gán theo Workflow Definition. Approver/Reviewer/Assignee chủ yếu là trách nhiệm runtime được resolve từ node, không nhất thiết là global role. 

## **6. Các module chức năng chính** 

|**Module**|**Trách nhiệm chính**|
|---|---|
|Workflow Management|Danh sách workflow, create/edit/delete, metadata, ownership, module/type,<br>trạng thái.|
|Workflow Designer|Canvas, node palette, property panel, connections, validation markers.|
|Form Builder|Tạo schema form cho human task, validation field, default/binding.|
|Definition & Version Service|Lưu graph definition, versioning, publish snapshot, lifecycle.|
|Trigger Service|Manual/API/Schedule/Event trigger; normalize trigger payload.|
|Runtime Engine|Tạo instance, token/execution state, node execution, routing, waiting/resume.|
|Task Service|Tạo/assign task, form submission, approval/review/assignment actions.|
|Resolver Service|Resolve participant, assignee, role/group/manager, variable expression.|
|Integration Service|HTTP/system action, webhook, external connector, retries/idempotency.|
|Notification Service|Email/in-app/Teams/webhook template và dispatch.|
|SLA/Escalation Service|Due date, reminder, escalate, timeout action.|
|Monitoring & Audit|Instance list/detail, search/filter, history, change log.|
|Organization Directory|User/org snapshot, manager relationship, role/group information cần cho<br>resolution.|



## **7. Tạo và cấu hình Workflow – đặc tả chi tiết** 

Đây là phần trọng tâm. Một Workflow được coi là “tạo thành công” không chỉ khi có tên và vài node trên canvas, mà khi Definition đủ thông tin để engine có thể validate, publish và thực thi mà không cần logic riêng viết thêm cho workflow đó. 

#### **7.1 Quy trình tạo Workflow tổng quát** 

1. Khởi tạo Workflow: từ blank hoặc template. 

2. Nhập metadata: name, description, type, module, owner, version/draft identity. 

3. Chọn và cấu hình Trigger. 

Trang 7 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

4. Xác định participant scope (nếu workflow có khái niệm participant). 

5. Thêm node từ node palette. 

6. Cấu hình từng node: input binding, form, assignee/resolver, SLA, action parameters. 

7. Nối các node bằng Connection; cấu hình output path và condition. 

8. Cấu hình notification/escalation/system integration khi cần. 

9. Validate toàn bộ Definition. 

10. Publish để tạo Workflow Version bất biến và cho phép runtime trigger. 

#### **7.2 Metadata của Workflow** 

|**Trường**|**Bắt buộc**|**Ý nghĩa / Rule**|
|---|---|---|
|Name|Có|Tên business-readable, duy nhất theo policy hệ thống hoặc module.|
|Description|Khuyến nghị|Mô tả mục tiêu và phạm vi workflow.|
|Workflow Type|Theo cấu<br>hình|Phân nhóm loại workflow; không dùng để hard-code execution<br>behavior trừ khi type thực sự có semantic hệ thống.|
|Module|Theo cấu<br>hình|Module nghiệp vụ áp dụng/nhóm hiển thị.|
|Owner|Có|Người chịu trách nhiệm definition và lifecycle.|
|Version|System-<br>managed|Không nên để user tự ý đổi published version; version được sinh khi<br>publish.|
|Status|System-<br>managed|Draft / Published / Suspended / Deleted.|
|Tags / Category|Tuỳ chọn|Hỗ trợ tìm kiếm và template organization.|



#### **7.3 Trigger Definition** 

Trigger là điều kiện bên ngoài tạo Workflow Instance mới. Đây là ranh giới bắt buộc: chỉ trigger event mới tạo instance; event nội bộ của task/node chỉ resume hoặc advance instance hiện tại. 

|**Trigger type**|**Cấu hình tối thiểu**|**Output vào context**|
|---|---|---|
|Manual|Ai được quyền start; form/input ban đầu.|trigger.user, trigger.formData,<br>trigger.timestamp.|
|API|Endpoint/key/policy; request schema;<br>idempotency key.|request payload đã normalize.|
|Schedule|Cron/period/timezone; start/end policy.|scheduledTime, period metadata.|
|Event/Webhook|Event type/source/correlation schema;<br>validation/security.|event payload và source metadata.|



#### **7.4 Participant Definition – tập người tham gia ĐỘNG** 

Participant là một abstraction cần thiết khi một workflow instance đại diện cho một kỳ/đợt/quy trình có nhiều người cùng tham gia. Definition có thể không cần participant; nhưng khi có, engine phải resolve được tập participant tại runtime. 

Trang 8 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**Participant selector**|**Ví dụ cấu hình**|**Đặc tính**|
|---|---|---|
|Fixed users|Danh sách user được chọn.|Tĩnh theo definition.|
|Group / Role|Nhóm/role trong organization directory.|Resolve membership khi instance start.|
|Organization condition|Department, status, management level...|Resolve theo metadata tổ chức.|
|Expression / Context|IDs lấy từ trigger hoặc node output.|Phụ thuộc runtime data.|
|External Query|Danh sách trả về bởi connector/API.|Động theo hệ thống ngoài.|



**Khuyến nghị consistency:** Mặc định resolve và snapshot participant tại lúc Workflow Instance bắt đầu. Nhờ đó một instance không thay đổi tập người tham gia chỉ vì dữ liệu tổ chức thay đổi giữa chừng. Nếu business cần “live membership”, nên coi đó là một option riêng, không phải default. 

#### **7.5 Workflow Context và Variable Binding** 

Workflow Context là nền tảng của tính động. Mỗi node không nên nhận dữ liệu bằng code hard-wire; input của node được bind từ trigger, instance variables, participant context hoặc output node trước. Sau khi node chạy, output được ghi trở lại context với namespace rõ ràng. 

```
context = {
  trigger: {...},
  instance: {...},
  participant: {...},
  variables: {...},
  nodes: {
    "nodeA": { output: {...} },
    "nodeB": { output: {...} }
  }
}
Ví dụ binding:
${trigger.requesterId}
${participant.id}
${participant.managerId}
${nodes.lookup.output.totalAmount}
${variables.period}
```

|**Quy tắc**|**Yêu cầu**|
|---|---|
|Namespace rõ ràng|Không dùng biến global mơ hồ; phân tách trigger/instance/participant/node output.|
|Type-aware|Field nên có type để condition/form validation kiểm tra trước publish.|
|Null handling|Binding phải có policy khi path không tồn tại/null.|
|Secret handling|Credential/token không lưu trực tiếp trong workflow context/log.|
|Immutable event input|Trigger payload gốc nên được bảo toàn để audit; node output ghi vào namespace<br>riêng.|



Trang 9 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

#### **7.6 Node Catalog và Node Definition** 

Node Catalog là tập primitive do platform cung cấp. Người dùng chỉ cấu hình node; không viết implementation engine cho từng workflow. Requirement cơ sở yêu cầu Start, Approval, Review, Assignment, Notification, System Action và End. Condition có thể biểu diễn dưới dạng node hoặc condition trên connection; hệ thống cần chọn một semantic nhất quán. 

|**Node type**|**Vai trò**|**Cấu hình chính**|
|---|---|---|
|Start|Điểm vào logic sau trigger.|Input mapping / initial route.|
|Approval|Yêu cầu approve/reject.|Approver resolver, form/content, SLA, reject action,<br>outputs.|
|Review|Yêu cầu review nội dung/hồ sơ.|Reviewer resolver, form, completion action, SLA.|
|Assignment|Giao việc cho<br>user/group/role/dynamic user.|Assignee resolver, execution mode, form/task content,<br>SLA.|
|Notification|Gửi thông báo.|Recipient resolver, channel, template, event/path.|
|System Action|Tự động gọi API/update/create<br>record/state.|Action type/connector, input mapping, retries, output<br>mapping.|
|Condition|Đánh giá expression và chọn nhánh.|Expression, operators, outputs true/false hoặc multi-<br>case.|
|End|Kết thúc một path/instance.|Result/status mapping nếu cần.|



#### **7.7 Human Task Configuration** 

Approval, Review và Assignment đều là human task nhưng khác semantic. Engine có thể dùng chung Task infrastructure, còn Node Definition quyết định action nào user được phép thực hiện. 

|**Thuộc tính**|**Approval**|**Review**|**Assignment**|
|---|---|---|---|
|Assignee resolver|Approver|Reviewer|Assignee|
|Hành động|Approve / Reject / optional<br>request-change|Complete / comment /<br>request-change|Complete / submit form|
|Form|Có thể có|Có thể có|Có thể có|
|SLA|Có|Có|Có|
|Output|decision, comment,<br>formData|review result, comment,<br>formData|result, formData|



#### **7.8 Form Definition** 

Form không nên được hard-code theo nghiệp vụ. Human task tham chiếu một Form Definition hoặc inline form schema. Mỗi field có id ổn định để data binding không phụ thuộc label hiển thị. 

|**Thuộc tính field**|**Mô tả**|
|---|---|
|fieldId|Định danh kỹ thuật ổn định.|



Trang 10 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**Thuộc tính field**|**Mô tả**|
|---|---|
|label|Nhãn hiển thị.|
|type|Text, textarea, number, date, select, multi-select, boolean, attachment...|
|required|Bắt buộc hay không.|
|defaultValue|Giá trị cố định hoặc expression.|
|options|Danh sách tĩnh hoặc dynamic data source.|
|validation|Range, regex, length, custom expression.|
|readOnly/visibleWhen|Điều kiện hiển thị/chỉnh sửa theo context.|
|outputMapping|Map dữ liệu submit vào context path.|



#### **7.9 Assignee / Approver Resolver – điểm ĐỘNG quan trọng nhất** 

Requirement cơ sở nêu ba loại approver: Fixed User, Role Based và Dynamic User. Thiết kế tổng quát nên dùng resolver thống nhất cho Approval/Review/Assignment và có thể mở rộng Group/Participant. 

|**Resolver type**|**Ví dụ**|**Behavior runtime**|
|---|---|---|
|Fixed User|userId = U123|Task luôn giao U123.|
|Role Based|FINANCE_LEAD|Resolve user(s) có role phù hợp theo scope/policy.|
|Group Based|IT_SUPPORT|Resolve member của group; policy chọn một hoặc<br>nhiều assignee.|
|Current Participant|participant.id|Mỗi participant nhận task tương ứng.|
|Manager of Participant|participant.managerId|Mỗi participant có thể tạo task cho manager khác<br>nhau.|
|Manager of Request Creator|trigger.creator.managerId|Resolve theo quan hệ tổ chức runtime.|
|Department Head|resolver(department.head)|Resolve theo org metadata.|
|Expression|${nodes.lookup.output.ownerId}|Assignee lấy từ output node trước.|



#### **7.10 Execution Mode của Human Task** 

|**Mode**|**Ý nghĩa**|
|---|---|
|Single|Node tạo một task theo một assignee resolver.|
|All Resolved Assignees|Node tạo task cho tất cả user được resolver trả về; completion policy có thể<br>ALL/ANY.|
|For Each Participant|Node được expand theo từng participant; mỗi participant có execution<br>context riêng.|
|For Each Participant → Related<br>User|Node chạy theo từng participant nhưng assignee là quan hệ động của<br>participant, ví dụ manager.|



Trang 11 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

**Phân biệt quan trọng:** Một node chạy cho nhiều participant tạo nhiều Task/Node Execution bên trong cùng Workflow Instance. Không mặc định tạo một Workflow Instance cho mỗi participant. 

#### **7.11 Connection và Dynamic Routing** 

Connection mô tả đường chuyển tiếp. Requirement yêu cầu add/delete/update connection và định nghĩa condition. Connection phải có source port, target node, optional condition, priority/order và default/fallback behavior. 

|**Thuộc tính**|**Mô tả**|
|---|---|
|sourceNode / sourcePort|Node/nhánh đầu ra.|
|targetNode|Node kế tiếp.|
|condition|Expression boolean hoặc case value.|
|priority|Thứ tự đánh giá nếu nhiều condition cùng xuất phát.|
|isDefault|Nhánh fallback khi không condition nào match.|
|label|Nhãn business-readable: Approved/Rejected/Yes/No...|



#### **7.12 Condition Engine** 

|**Khả năng**|**Yêu cầu**|
|---|---|
|Field selector|Chọn dữ liệu từ context.|
|Operator|==, !=, >, >=, <, <=, contains, in, isNull... theo type.|
|Value|Literal hoặc dynamic binding.|
|AND/OR|Nhóm nhiều điều kiện.|
|Nested group|Cho phép biểu thức phức hợp có kiểm soát.|
|Preview/Test|Cho phép nhập sample context để xem route kết quả.|
|Validation|Không cho publish khi reference path/operator/type không hợp lệ.|



**An toàn biểu thức:** Expression engine nên giới hạn capability; không cho phép thực thi mã tùy ý chỉ để biểu diễn condition. Business expression cần deterministic, sandboxed và audit được. 

#### **7.13 Notification Configuration** 

Requirement hỗ trợ trigger Created/Approved/Rejected/Completed và các kênh Email, In-app, Teams, Webhook. Trong graph-based workflow, notification có thể là node riêng hoặc event hook của node. Hệ thống cần thống nhất cách biểu diễn nhưng vẫn đảm bảo đủ bốn loại trigger và bốn channel. 

**Cấu hình Mô tả** 

Trang 12 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**Cấu hình**|**Mô tả**|
|---|---|
|When|Created / Approved / Rejected / Completed hoặc khi flow đi qua Notification node.|
|Recipient|Fixed, role/group, dynamic resolver, participant, previous actor...|
|Channel|Email / In-app / Teams / Webhook.|
|Template|Subject/body/payload template có variable binding.|
|Failure policy|Retry, ignore-and-log, fail node tùy mức critical.|



#### **7.14 SLA và Escalation** 

|**Cấu hình**|**Ví dụ behavior**|
|---|---|
|Due duration|5 giờ, 24 giờ, 2 ngày làm việc.|
|Calendar|Working-day calendar/timezone nếu dùng ngày làm việc.|
|Reminder|Gửi reminder trước hoặc sau due time.|
|Escalate|Resolve cấp cao hơn/role khác và reassign hoặc add watcher.|
|Timeout action|Auto-reject / auto-complete / fail / route sang nhánh timeout.|
|Pause policy|Có/không tính SLA khi instance suspended tùy business rule.|



#### **7.15 System Action / Integration Node** 

System Action đáp ứng requirement tự động update dữ liệu, gọi API, tạo record hoặc cập nhật trạng thái. Tính dynamic nằm ở việc action implementation generic, còn endpoint/action/input/output được cấu hình trong definition. 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Connector / Action|Chọn connector/action đã được platform đăng ký.|
|Method / Operation|Ví dụ GET/POST/UPDATE hoặc action name.|
|Input mapping|Map context → request/action input.|
|Credential reference|Tham chiếu secret/connection; không lưu credential thô trong definition.|
|Success condition|HTTP status/result expression.|
|Output mapping|Map response → workflow context.|
|Retry policy|Số lần, backoff, retryable error.|
|Idempotency|Dùng instance/node execution id hoặc configured key tránh side effect lặp khi retry.|
|Error route|Fail instance, retry, hoặc route sang error connection.|



Trang 13 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

#### **7.16 Validation trước Publish** 

Requirement yêu cầu có Start, có End, không có node lỗi và validate thành công. Để một definition thực sự executable, validation nên bao phủ cả cấu trúc, cấu hình và reference động. 

|**Nhóm validation**|**Kiểm tra tối thiểu**|
|---|---|
|Graph|Có Start/End; không dangling connection; target/source hợp lệ; reachable node theo<br>policy.|
|Node config|Trường bắt buộc của từng node đã cấu hình.|
|Assignee|Resolver type hợp lệ; fixed user tồn tại tại design-time nếu có thể; dynamic path/schema<br>hợp lệ.|
|Form|Field id unique; validation hợp lệ; output mapping không xung đột.|
|Condition|Reference tồn tại trong known schema; operator phù hợp type; default route khi cần.|
|Integration|Connector/action tồn tại; required input mapped; credential reference được chọn.|
|SLA|Duration hợp lệ; escalation action có destination/resolver.|
|Version/Lifecycle|Chỉ Draft hợp lệ được publish; Published version là immutable snapshot.|



#### **7.17 Publish và Versioning** 

```
Draft Definition
   | edit freely
   | validate success
   v
Publish
   |
   +--> Create immutable WorkflowVersion N
   +--> Mark as active published version
   +--> New triggers use Version N
Nếu chỉnh sửa sau publish:
Published Version N  (immutable, instances vẫn chạy)
          |
          +--> Create new Draft based on N
                    |
                    v
                Publish N+1
```

**Binding runtime:** Workflow Instance phải lưu workflowVersionId, không chỉ workflowDefinitionId. Điều này ngăn instance đang chạy bị thay đổi logic khi owner publish version mới. 

#### **7.18 Xóa và Tạm ngưng Workflow** 

- Delete chỉ được phép khi workflow chưa được sử dụng hoặc không có instance đang chạy theo rule requirement; ưu tiên soft delete để giữ audit/history. 

Trang 14 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

- Suspend nghĩa là ngừng nhận trigger/execution mới theo policy; không nên mặc định hủy instance đang chạy. 

- Hủy một Workflow Instance là runtime action riêng, không đồng nghĩa với suspend definition. 

## **8. Mô hình thực thi Workflow Runtime** 

#### **8.1 Tạo Workflow Instance** 

```
Published WorkflowVersion
      +
Accepted Trigger Event
      |
      v
Create WorkflowInstance
  - bind workflowVersionId
  - persist trigger payload
```

```
  - initialize context
```

- `resolve participant snapshot (nếu có)` 

- `create initial node execution` 

#### **8.2 Trigger Event và Internal Event** 

|**Loại event**|**Tác động**|
|---|---|
|Trigger event|Có quyền tạo Workflow Instance mới.|
|TaskSubmitted / Approved /<br>Rejected|Resume/advance node execution của instance hiện tại.|
|Timer/SLA timeout|Tạo internal runtime transition/escalation cho instance/task hiện tại.|
|SystemActionCompleted/Failed|Cập nhật node execution và route tiếp.|



#### **8.3 Node Execution Lifecycle** 

|**State**|**Ý nghĩa**|
|---|---|
|PENDING|Đã tạo execution nhưng chưa sẵn sàng.|
|READY|Đủ dependency, có thể chạy.|
|RUNNING|Engine đang thực thi.|
|WAITING|Đang chờ human task/event/timer/external result.|
|COMPLETED|Node hoàn thành thành công.|
|FAILED|Node lỗi không được xử lý/retry hết.|
|CANCELLED|Bị hủy do instance/path cancellation.|



Trang 15 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

#### **8.4 Human Task và nhiều participant** 

Khi node execution mode là For Each Participant, engine tạo execution/task theo từng participant. Các task có thể tiến độc lập. Node-level completion policy quyết định khi nào node được coi là hoàn thành để flow tiến tiếp. 

|**Completion policy**|**Ý nghĩa**|
|---|---|
|ALL|Tất cả task con hoàn thành.|
|ANY|Chỉ cần một task hoàn thành thỏa điều kiện.|
|THRESHOLD|Đủ N hoặc đủ % task.|
|PER-PARTICIPANT<br>CONTINUATION|Mỗi participant tiếp tục sang node kế tiếp độc lập, không cần barrier toàn cục.|



**Điểm cần thiết cho tính ĐỘNG:** Engine phải có correlation giữa participant execution và các node/task tiếp theo. Nếu participant A hoàn thành trước B, flow của A có thể tiến tiếp mà không làm mất context của B, nếu definition cho phép per-participant continuation. 

#### **8.5 Routing và Token/Path** 

Sau khi node hoàn thành, engine đánh giá outgoing connection trên đúng runtime context. Kết quả có thể tạo một hoặc nhiều path tiếp theo tùy semantics của node. Mỗi path cần được correlation với instance và participant context nếu đang chạy theo participant. 

#### **8.6 Error, Retry và Idempotency** 

- Human task submit phải idempotent theo task version/action token để tránh double-submit. 

- System Action retry không được tạo side effect lặp; action cần idempotency key hoặc connector policy. 

- Engine phải phân biệt business rejection với technical failure. 

- Technical failure cần được ghi audit, retry hoặc route sang error handling theo configuration. 

## **9. Theo dõi Runtime, Audit và History** 

#### **9.1 Instance List** 

|**Trường**|**Mô tả**|
|---|---|
|Request / Instance ID|Định danh runtime.|
|Workflow Name / Version|Definition/version đã chạy.|
|Current Step|Bước hoặc summary nhiều bước đang chờ.|
|Assigned User|Một user hoặc summary nhiều assignee/task.|
|Status|Pending/Running/Approved/Rejected/Completed/Cancelled theo model<br>được chốt.|



Trang 16 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**Trường**|**Mô tả**|
|---|---|
|Start Time|Thời điểm trigger được chấp nhận.|
|Creator / Trigger source|Người tạo hoặc hệ thống phát trigger.|
|SLA|Due/overdue summary.|



#### **9.2 Instance Detail** 

- Hiển thị graph version đã thực thi, highlight node trạng thái runtime. 

- Hiển thị participant và task con nếu instance có nhiều participant. 

- Hiển thị context có chọn lọc, che secret/sensitive field. 

- Hiển thị timeline: trigger → node started → task assigned → submitted/approved → route → completed. 

- Cho phép actor có quyền cancel instance theo policy. 

#### **9.3 Search / Filter** 

- Workflow Name, Request/Instance Code, người tạo. 

- Status: Pending, Approved, Rejected, Completed, Cancelled; có thể bổ sung Running theo runtime model. 

- Date range, assignee, owner/module nếu cần vận hành. 

#### **9.4 Definition Audit** 

- Version history: 1.0, 1.1, 2.0 hoặc semantic/version sequence tương đương. 

- Change log: ai sửa, sửa lúc nào, thêm/xóa step, đổi approver, đổi condition, đổi connection/form/SLA. 

- Published version không được silently mutate. 

## **10. Tích hợp dữ liệu tổ chức và Dynamic User Resolution** 

Để Dynamic User hoạt động, Workflow Builder cần một Organization Directory tối thiểu. Hệ thống không cần thay thế HRM; chỉ cần một nguồn dữ liệu tổ chức đủ để xác định user và quan hệ cần thiết cho workflow. 

|**Dữ liệu tối thiểu**|**Mục đích**|
|---|---|
|User externalSubject / externalId|Định danh ổn định ánh xạ với nguồn ngoài.|
|Display name / email|Hiển thị và notification.|
|Active status|Participant filtering.|
|managerId|Single source of truth cho quan hệ quản lý trực tiếp và dynamic manager<br>resolver.|
|Department / Organization Unit|Filtering participant và department-based resolver.|
|Role / Group nếu có|Role/group-based assignment.|
|Job title – display only nếu không<br>đáng tin cậy|Hiển thị; không dùng làm source of truth nếu nguồn ngoài không bảo đảm.|



Trang 17 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

#### **10.1 Đồng bộ dữ liệu** 

- Một external source được cấu hình làm nguồn đồng bộ chính trong phiên bản đầu để giảm ambiguity. 

- Sync có thể full + incremental tùy khả năng nguồn; mỗi record cần external id ổn định. 

- Không xóa cứng user chỉ vì nguồn ngoài tạm thời không trả về; ưu tiên active/inactive và audit. 

- managerId phải được validate tránh self-loop/cycle bất thường nếu dùng cho escalation. 

## **11. Danh mục Use Case** 

|**ID**|**Use Case**|**Actor**|**Nhóm**|
|---|---|---|---|
|UC-01|Tạo Workflow mới|Workflow Owner|Core|
|UC-02|Tạo Workflow từ Template|Workflow Owner|Core|
|UC-03|Chỉnh sửa Workflow Draft|Owner/Editor|Core|
|UC-04|Cấu hình Trigger|Owner/Editor|Core/Dynamic|
|UC-05|Cấu hình Participant Scope|Owner/Editor|Dynamic|
|UC-06|Thêm/Xóa Node|Owner/Editor|Core|
|UC-07|Cấu hình Human Task và Form|Owner/Editor|Core/Dynamic|
|UC-08|Cấu hình Dynamic Assignee|Owner/Editor|Dynamic|
|UC-09|Tạo/Sửa/Xóa Connection|Owner/Editor|Core|
|UC-10|Cấu hình Condition / Routing|Owner/Editor|Core/Dynamic|
|UC-11|Cấu hình Notification|Owner/Editor|Core|
|UC-12|Cấu hình SLA / Escalation|Owner/Editor|Core/Dynamic|
|UC-13|Cấu hình System Action / Integration|Owner/Editor|Core/Dynamic|
|UC-14|Validate Workflow|Owner/Editor|Core|
|UC-15|Publish Workflow|Workflow Owner|Core|
|UC-16|Tạo version mới từ Published Workflow|Owner/Editor|Versioning|
|UC-17|Suspend / Reactivate Workflow|Owner/Admin|Lifecycle|
|UC-18|Delete / Soft Delete Workflow|Owner/Admin|Lifecycle|
|UC-19|Khởi chạy Workflow bằng Trigger|User/System|Runtime|
|UC-20|Resolve participant và tạo task động|System|Runtime/Dynamic|
|UC-21|Thực hiện Assignment/Review Task|Assignee/Reviewer|Runtime|
|UC-22|Approve / Reject|Approver|Runtime|
|UC-23|Xử lý SLA / Escalation|System|Runtime|
|UC-24|Theo dõi Workflow Instance|Viewer/Owner/Admin|Monitoring|
|UC-25|Tìm kiếm / Filter Instance|Viewer/Owner/Admin|Monitoring|
|UC-26|Xem Runtime Timeline / History|Viewer/Owner/Admin|Audit|
|UC-27|Xem Version History / Change Log|Viewer/Owner/Admin|Audit|



Trang 18 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**ID**|**Use Case**|**Actor**|**Nhóm**|
|---|---|---|---|
|UC-28|Phân quyền Workflow|Admin/Owner|Security|
|UC-29|Đồng bộ Organization Directory|Admin/System|Supporting|
|UC-30|Resolve Dynamic User từ Organization Directory|System|Dynamic|



## **12. Đặc tả Use Case chi tiết** 

##### **UC-01 – Tạo Workflow mới** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Workflow Owner|
|Tiền điều kiện|User có quyền tạo workflow.|
|Kích hoạt|User chọn “Tạo Workflow”.|



###### **Luồng chính** 

1. Chọn tạo từ đầu (blank). 

2. Nhập name, description, workflow type, module, owner. 

3. Hệ thống tạo Workflow Definition ở trạng thái Draft. 

4. Mở Workflow Designer với Start/End theo template mặc định hoặc canvas rỗng theo policy. 

5. Owner tiếp tục cấu hình trigger, node, connections và các thuộc tính dynamic. 

###### **Luồng thay thế / ngoại lệ** 

- Tên không hợp lệ/trùng theo policy → hiển thị lỗi và không tạo. 

- Owner không tồn tại/không có quyền → từ chối thao tác. 

###### **Hậu điều kiện** 

- Một Draft Definition tồn tại và có thể chỉnh sửa. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Không sinh code nghiệp vụ riêng cho workflow. 

- Metadata không quyết định hard-code execution behavior ngoài các semantic platform đã định nghĩa. 

###### **Tiêu chí nghiệm thu chính** 

- Nhập được tên workflow. 

- Có thể tiếp tục thêm step và cấu hình workflow. 

Trang 19 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

##### **UC-02 – Tạo Workflow từ Template** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Workflow Owner|
|Tiền điều kiện|Có template user được quyền sử dụng.|
|Kích hoạt|User chọn template.|



###### **Luồng chính** 

1. Hệ thống clone template definition thành Draft mới. 

2. User nhập/đổi metadata. 

3. Các node/connection/form/config được copy nhưng ID runtime mới được tạo phù hợp. 

4. Credential/secret reference phải được revalidate theo tenant/scope. 

5. User chỉnh sửa và validate như workflow bình thường. 

###### **Luồng thay thế / ngoại lệ** 

- Template deprecated → cảnh báo hoặc chặn theo policy. 

###### **Hậu điều kiện** 

- Draft độc lập với template nguồn. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Clone cấu hình, không clone runtime instance/history. 

##### **UC-03 – Chỉnh sửa Workflow Draft** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Workflow đang Draft và user có quyền edit.|
|Kích hoạt|User mở Designer.|



###### **Luồng chính** 

1. Chỉnh metadata hoặc graph. 

2. Thêm/xóa/sửa node. 

3. Sửa connection/condition/assignee/form/SLA. 

4. Hệ thống lưu draft revision/autosave theo policy. 

5. Validation marker được cập nhật. 

Trang 20 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

###### **Luồng thay thế / ngoại lệ** 

- Workflow đã Published → tạo draft version mới thay vì mutate published snapshot. 

###### **Hậu điều kiện** 

- Draft mới nhất được lưu. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Mọi thay đổi là configuration data; engine implementation không đổi. 

##### **UC-04 – Cấu hình Trigger** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Workflow Draft.|
|Kích hoạt|User chọn Trigger.|



###### **Luồng chính** 

1. Chọn type Manual/API/Schedule/Event. 

2. Nhập cấu hình theo trigger type. 

3. Khai báo/preview trigger payload schema. 

4. Map payload vào Workflow Context. 

5. Lưu trigger definition. 

###### **Luồng thay thế / ngoại lệ** 

- Schedule expression không hợp lệ → validation error. 

- Event/API thiếu schema/security config → warning/error theo policy. 

###### **Hậu điều kiện** 

- Definition có trigger executable. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Trigger payload trở thành runtime input; definition không phụ thuộc một request cụ thể. 

##### **UC-05 – Cấu hình Participant Scope** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Workflow Draft; organization/data source khả dụng nếu selector cần.|



Trang 21 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Kích hoạt|User bật participant scope.|



###### **Luồng chính** 

1. Chọn selector type: fixed/group/role/org condition/expression/external query. 

2. Cấu hình tiêu chí và preview sample result. 

3. Chọn snapshot policy mặc định tại instance start. 

4. Lưu participant definition. 

###### **Luồng thay thế / ngoại lệ** 

- Selector trả về rỗng ở preview → warning, không nhất thiết error nếu runtime có thể khác. 

###### **Hậu điều kiện** 

- Workflow có rule resolve participant. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Participant được resolve lúc runtime, không hard-code từng user vào execution logic. 

##### **UC-06 – Thêm / Xóa Node** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Workflow Draft.|
|Kích hoạt|User thao tác trên canvas.|



###### **Luồng chính** 

1. Kéo node từ palette vào canvas. 

2. Hệ thống tạo Node Definition với nodeType và config mặc định. 

3. User cấu hình property panel. 

4. Khi xóa node, hệ thống kiểm tra và xử lý connection liên quan theo confirmation policy. 

###### **Luồng thay thế / ngoại lệ** 

- Không cho xóa Start/End nếu policy bắt buộc một node duy nhất hoặc phải tạo lại hợp lệ. 

###### **Hậu điều kiện** 

- Graph draft thay đổi. 

Trang 22 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

###### **Điểm ĐỘNG cần bảo đảm** 

- Node palette là generic capability; không tạo node theo tên quy trình business. 

##### **UC-07 – Cấu hình Human Task và Form** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Có Approval/Review/Assignment node.|
|Kích hoạt|User mở cấu hình node.|



###### **Luồng chính** 

1. Nhập title/instruction cho task. 

2. Chọn assignee resolver. 

3. Chọn execution mode. 

4. Tạo/chọn form; định nghĩa field và validation. 

5. Cấu hình output mapping từ form vào context. 

6. Cấu hình action hợp lệ (complete/approve/reject...). 

7. Lưu node. 

###### **Luồng thay thế / ngoại lệ** 

- Form field id trùng hoặc mapping sai type → validation error. 

###### **Hậu điều kiện** 

- Human task node có thể tạo task runtime. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Form schema và assignee được cấu hình, không hard-code. 

##### **UC-08 – Cấu hình Dynamic Assignee** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Node hỗ trợ assignee.|
|Kích hoạt|User chọn Assignee Type.|



###### **Luồng chính** 

1. Chọn Fixed User, Role, Group hoặc Dynamic User. 

Trang 23 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

2. Nếu Dynamic User, chọn resolver: current participant, manager, department head, expression path... 

3. Hệ thống hiển thị dữ liệu/context path được resolver sử dụng. 

4. User preview resolver bằng sample context nếu có. 

###### 5. Lưu resolver config. 

###### **Luồng thay thế / ngoại lệ** 

- Dynamic path không có trong known schema → validation error/warning. 

- Resolver runtime trả về null → áp dụng missing-assignee policy: fail/escalate/fallback. 

###### **Hậu điều kiện** 

- Node có assignee resolver. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Cùng Node Definition có thể resolve ra user khác nhau giữa các instance/participant. 

##### **UC-09 – Tạo / Sửa / Xóa Connection** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Có ít nhất hai node.|
|Kích hoạt|User kéo nối node.|



###### **Luồng chính** 

1. Tạo connection source→target. 

2. Đặt label/output port. 

3. Nếu cần, cấu hình condition và priority. 

4. Có thể sửa target/condition hoặc xóa connection. 

###### **Luồng thay thế / ngoại lệ** 

- Tạo cycle không được phép nếu engine chưa hỗ trợ loop → validation error. 

###### **Hậu điều kiện** 

- Graph route được cập nhật. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Connection có thể quyết định route bằng dữ liệu runtime. 

Trang 24 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

##### **UC-10 – Cấu hình Condition / Routing** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Connection hoặc Condition node tồn tại.|
|Kích hoạt|User mở condition builder.|



###### **Luồng chính** 

1. Chọn context field. 

2. Chọn operator phù hợp type. 

3. Nhập literal hoặc dynamic value. 

4. Kết hợp nhiều rule bằng AND/OR và group. 

5. Preview với sample context. 

6. Lưu condition. 

###### **Luồng thay thế / ngoại lệ** 

- Reference không tồn tại/type mismatch → validation error. 

###### **Hậu điều kiện** 

- Route expression được lưu trong definition. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Thay business rule bằng sửa config và republish, không cần sửa source code. 

##### **UC-11 – Cấu hình Notification** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Workflow Draft.|
|Kích hoạt|User thêm Notification hoặc event hook.|



###### **Luồng chính** 

1. Chọn thời điểm/event. 

2. Chọn channel Email/In-app/Teams/Webhook. 

3. Chọn recipient resolver. 

4. Soạn template có variable binding. 

Trang 25 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

###### 5. Chọn failure policy. 

###### 6. Lưu config. 

###### **Hậu điều kiện** 

- Notification sẵn sàng runtime. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Recipient và nội dung có thể phụ thuộc context. 

##### **UC-12 – Cấu hình SLA / Escalation** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Node human task.|
|Kích hoạt|User mở SLA.|



###### **Luồng chính** 

1. Đặt due duration và calendar/timezone. 

2. Cấu hình reminder. 

3. Cấu hình escalation resolver/action. 

4. Cấu hình timeout action. 

5. Lưu SLA. 

###### **Luồng thay thế / ngoại lệ** 

- Duration/calendar không hợp lệ → validation error. 

###### **Hậu điều kiện** 

- Runtime sẽ tạo timer theo task execution. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Escalation target có thể resolve động theo participant/organization. 

##### **UC-13 – Cấu hình System Action / Integration** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Connector/action đã được platform đăng ký.|
|Kích hoạt|User thêm System Action.|



Trang 26 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

###### **Luồng chính** 

1. Chọn connector/action. 

2. Map context vào action input. 

3. Chọn credential reference. 

4. Cấu hình success/output mapping. 

5. Cấu hình retry/idempotency/error route. 

###### 6. Lưu node. 

###### **Luồng thay thế / ngoại lệ** 

- Connector bị disable → chặn publish hoặc warning theo policy. 

###### **Hậu điều kiện** 

- System Action executable. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Endpoint/input/output dùng configuration; không viết integration riêng trong workflow engine. 

##### **UC-14 – Validate Workflow** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Workflow Draft.|
|Kích hoạt|User chọn Validate hoặc hệ thống auto-validate.|



###### **Luồng chính** 

1. Kiểm tra Start/End. 

2. Kiểm tra graph/connection. 

3. Kiểm tra required node config. 

4. Kiểm tra resolver, form, condition, integration, SLA. 

5. Hiển thị lỗi theo node/field và tổng hợp kết quả. 

###### **Luồng thay thế / ngoại lệ** 

- Có lỗi blocking → validate failed. 

- Chỉ có warning → cho phép publish hay không tùy policy. 

###### **Hậu điều kiện** 

Trang 27 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

- Definition có validation result. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Validation phải bắt được reference động sai trước runtime ở mức schema có thể biết. 

###### **Tiêu chí nghiệm thu chính** 

- Có Start Step. 

- Có End Step. 

- Không có node lỗi. 

- Validate thành công. 

##### **UC-15 – Publish Workflow** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Workflow Owner|
|Tiền điều kiện|Draft validate thành công; user có quyền publish.|
|Kích hoạt|User chọn Publish.|



###### **Luồng chính** 

1. Hệ thống chạy validation lần cuối. 

2. Tạo immutable Workflow Version mới. 

3. Đánh dấu version active/published. 

4. Kích hoạt trigger registration tương ứng. 

5. Ghi audit event publish. 

###### **Luồng thay thế / ngoại lệ** 

- Validation fail → không publish. 

- Trigger registration fail → rollback/mark publish failed theo transaction policy. 

###### **Hậu điều kiện** 

- Workflow sẵn sàng nhận trigger. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Mọi instance mới bind vào version published cụ thể. 

###### **Tiêu chí nghiệm thu chính** 

- Chỉ publish sau validate thành công. 

Trang 28 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

##### **UC-16 – Tạo Version mới từ Published Workflow** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Có published version.|
|Kích hoạt|User chọn Edit.|



###### **Luồng chính** 

1. Hệ thống tạo Draft mới dựa trên published snapshot. 

2. User thay đổi config. 

3. Published version cũ giữ nguyên. 

4. User validate và publish thành version mới. 

###### **Hậu điều kiện** 

- Version mới có thể trở thành active cho trigger mới. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Instance cũ tiếp tục dùng version cũ. 

##### **UC-17 – Suspend / Reactivate Workflow** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Admin|
|Tiền điều kiện|Workflow Published.|
|Kích hoạt|User chọn Suspend/Reactivate.|



###### **Luồng chính** 

1. Khi suspend, hệ thống ngừng chấp nhận trigger mới theo policy. 

2. Instance đang chạy không bị hủy mặc định. 

3. Khi reactivate, trigger registration hoạt động trở lại. 

4. Ghi audit. 

###### **Hậu điều kiện** 

- Workflow đổi trạng thái lifecycle. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Suspend definition khác cancel runtime instance. 

Trang 29 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

##### **UC-18 – Delete / Soft Delete Workflow** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Admin|
|Tiền điều kiện|Workflow thỏa điều kiện xóa.|
|Kích hoạt|User chọn Delete.|



###### **Luồng chính** 

1. Hệ thống kiểm tra usage/running instances. 

2. Nếu hợp lệ, chuyển Deleted/soft-delete. 

3. Ẩn khỏi danh sách active mặc định. 

4. Giữ history/audit/version theo retention policy. 

###### **Luồng thay thế / ngoại lệ** 

- Có instance đang chạy hoặc rule không cho xóa → từ chối. 

###### **Hậu điều kiện** 

- Workflow bị soft delete. 

###### **Tiêu chí nghiệm thu chính** 

- Chỉ cho phép xóa khi workflow chưa được sử dụng hoặc không có instance đang chạy. 

##### **UC-19 – Khởi chạy Workflow bằng Trigger** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|User/System|
|Tiền điều kiện|Workflow Published và trigger active.|
|Kích hoạt|Trigger event đến.|



###### **Luồng chính** 

###### 1. Xác thực/validate trigger. 

2. Kiểm tra idempotency/correlation. 

3. Tạo Workflow Instance và bind workflowVersionId. 

4. Khởi tạo context. 

5. Resolve participant snapshot nếu có. 

6. Tạo initial node execution. 

Trang 30 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

###### **Luồng thay thế / ngoại lệ** 

- Duplicate trigger với cùng idempotency key → trả instance cũ/ignore theo policy. 

###### **Hậu điều kiện** 

- Một instance mới bắt đầu chạy. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Chỉ trigger event tạo instance; internal event không tạo instance mới. 

##### **UC-20 – Resolve Participant và tạo Task động** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|System|
|Tiền điều kiện|Instance đang ở node multi-participant.|
|Kích hoạt|Node trở thành READY.|



###### **Luồng chính** 

1. Đọc participant snapshot/context. 

2. Expand node execution theo participant. 

3. Với mỗi participant, resolve assignee theo resolver của node. 

4. Tạo task runtime với participant correlation. 

5. Theo dõi completion policy/per-participant continuation. 

###### **Luồng thay thế / ngoại lệ** 

- Assignee không resolve được → apply fallback/escalation/fail policy. 

###### **Hậu điều kiện** 

- Một node definition có thể sinh nhiều runtime task. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Không clone Workflow Instance cho từng participant. 

- Cùng node có thể giao cho người khác nhau theo từng participant. 

##### **UC-21 – Thực hiện Assignment / Review Task** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Assignee/Reviewer|
|Tiền điều kiện|User đang có active task.|



Trang 31 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Kích hoạt|User mở task.|



###### **Luồng chính** 

1. Hiển thị task content/form đã bind dữ liệu. 

2. User nhập dữ liệu/action. 

3. Validate form và authorization. 

4. Lưu submission/audit. 

5. Cập nhật context output. 

6. Đánh dấu task completed và phát internal event để engine tiến tiếp. 

###### **Luồng thay thế / ngoại lệ** 

- Task đã completed/cancelled → không nhận submit lặp. 

###### **Hậu điều kiện** 

- Instance tiếp tục theo graph. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Internal event chỉ advance instance hiện tại. 

##### **UC-22 – Approve / Reject** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Approver|
|Tiền điều kiện|Có approval task active.|
|Kích hoạt|Approver mở task.|



###### **Luồng chính** 

1. Xem nội dung/form/context được phép. 

2. Chọn Approve hoặc Reject; nhập comment nếu cần. 

3. Hệ thống authorize và lưu decision. 

4. Cập nhật node output decision. 

5. Engine chọn outgoing route tương ứng. 

###### **Luồng thay thế / ngoại lệ** 

Trang 32 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

- Quá SLA và task đã auto-action → thao tác bị từ chối. 

###### **Hậu điều kiện** 

- Approval decision được audit và workflow tiến tiếp. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Approver có thể được resolve động. 

##### **UC-23 – Xử lý SLA / Escalation** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|System|
|Tiền điều kiện|Task active có SLA.|
|Kích hoạt|Timer đến hạn.|



###### **Luồng chính** 

1. Kiểm tra task vẫn active. 

2. Gửi reminder hoặc thực hiện escalation theo rule. 

3. Nếu timeout action cấu hình, thực hiện action/route tương ứng. 

4. Ghi runtime history. 

###### **Hậu điều kiện** 

- Task/instance được cập nhật theo SLA. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Escalation resolver có thể phụ thuộc manager/role/context runtime. 

##### **UC-24 – Theo dõi Workflow Instance** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Viewer/Owner/Admin|
|Tiền điều kiện|User có quyền xem runtime.|
|Kích hoạt|User mở tab Runtime.|



###### **Luồng chính** 

1. Hiển thị danh sách instance. 

2. Hiển thị ID, current step, assigned user/status/start time/SLA. 

3. User mở chi tiết để xem graph/timeline/participant/task. 

Trang 33 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

###### **Hậu điều kiện** 

- Không thay đổi runtime. 

##### **UC-25 – Tìm kiếm / Filter Instance** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Viewer/Owner/Admin|
|Tiền điều kiện|Có quyền runtime.|
|Kích hoạt|User nhập tiêu chí.|



###### **Luồng chính** 

1. Tìm theo workflow name/request code/người tạo. 

2. Filter theo status/date/assignee nếu được hỗ trợ. 

3. Trả kết quả phân trang. 

###### **Hậu điều kiện** 

- Danh sách runtime được thu hẹp. 

##### **UC-26 – Xem Runtime Timeline / History** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Viewer/Owner/Admin|
|Tiền điều kiện|Instance tồn tại.|
|Kích hoạt|User mở history.|



###### **Luồng chính** 

1. Hiển thị trigger event. 

2. Hiển thị node/task execution theo thời gian. 

3. Hiển thị actor, action, decision, SLA/escalation, error/retry. 

4. Cho phép drill-down output/context theo quyền. 

###### **Hậu điều kiện** 

- Runtime audit được quan sát. 

##### **UC-27 – Xem Version History / Change Log** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Viewer/Owner/Admin|



Trang 34 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tiền điều kiện|Workflow tồn tại.|
|Kích hoạt|User mở Version History.|



###### **Luồng chính** 

1. Hiển thị danh sách version. 

2. Chọn version để xem snapshot. 

3. Hiển thị ai sửa/publish, thời điểm và thay đổi chính. 

###### **Hậu điều kiện** 

- Definition audit được quan sát. 

##### **UC-28 – Phân quyền Workflow** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Admin/Owner|
|Tiền điều kiện|Workflow tồn tại; actor có quyền cấp quyền.|
|Kích hoạt|Actor mở permission.|



###### **Luồng chính** 

1. Gán Owner/Editor/Viewer theo workflow. 

2. Hệ thống validate actor và đối tượng nhận quyền. 

###### 3. Lưu ACL/audit. 

###### **Hậu điều kiện** 

- Access scope được cập nhật. 

##### **UC-29 – Đồng bộ Organization Directory** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Admin/System|
|Tiền điều kiện|External source đã cấu hình.|
|Kích hoạt|Sync chạy manual/schedule.|



###### **Luồng chính** 

1. Đọc user/org data từ source. 

Trang 35 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

2. Upsert theo external id ổn định. 

3. Cập nhật active status, managerId và metadata hỗ trợ resolver. 

4. Ghi sync summary/error. 

###### **Luồng thay thế / ngoại lệ** 

- Record thiếu manager → vẫn đồng bộ user; dynamic manager resolver có thể fail/fallback tại runtime. 

###### **Hậu điều kiện** 

- Directory nội bộ mới nhất theo sync. 

##### **UC-30 – Resolve Dynamic User từ Organization Directory** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|System|
|Tiền điều kiện|Node cần dynamic resolver; directory/context có dữ liệu.|
|Kích hoạt|Task sắp được tạo.|



###### **Luồng chính** 

1. Đọc resolver config. 

2. Đọc subject từ participant/requester/context. 

3. Tra quan hệ manager/role/group/department. 

4. Áp dụng policy chọn user. 

5. Trả assignee list hoặc missing-assignee result. 

###### **Luồng thay thế / ngoại lệ** 

- Không tìm thấy user phù hợp → fallback/escalation/fail theo node config. 

###### **Hậu điều kiện** 

- Task được assign hoặc node chuyển sang error policy. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Resolver là runtime service dùng chung, không logic riêng cho từng workflow. 

Trang 36 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

## **13. Mô hình trạng thái** 

#### **13.1 Workflow Definition Lifecycle** 

```
DRAFT --validate+publish--> PUBLISHED --suspend--> SUSPENDED
  ^                          |                     |
  |                          | edit -> new draft   | reactivate
  +--------------------------+                     v
                                             PUBLISHED
```

```
DRAFT/PUBLISHED/SUSPENDED --delete rule--> DELETED (soft delete)
```

#### **13.2 Workflow Instance Lifecycle** 

Requirement gốc liệt kê Running → Completed/Rejected/Cancelled và cũng dùng Approved trong filter. Để tránh nhập nhằng giữa “workflow definition status” và “business outcome”, runtime nên tách technical state và outcome nếu cần. 

|**Khái niệm**|**Giá trị đề xuất**|
|---|---|
|Execution State|PENDING / RUNNING / WAITING / COMPLETED / CANCELLED / FAILED|
|Business Outcome|APPROVED / REJECTED / COMPLETED / CANCELLED hoặc giá trị do flow map<br>vào End.|



## **14. Mô hình dữ liệu khái niệm** 

|**Entity / Aggregate**|**Thuộc tính chính (khái niệm)**|
|---|---|
|WorkflowDefinition|id, name, description, type, module, ownerId, status, activeVersionId, deletedAt.|
|WorkflowVersion|id, workflowDefinitionId, versionNo, graphDefinition, createdBy, createdAt,<br>publishedAt, checksum.|
|TriggerDefinition|type, config, inputSchema, security/idempotency config.|
|ParticipantDefinition|selectorType, selectorConfig, snapshotPolicy.|
|NodeDefinition|id, type, name, position, config, inputBindings, outputSchema.|
|ConnectionDefinition|id, sourceNode, sourcePort, targetNode, condition, priority, isDefault.|
|FormDefinition|id, fields/schema, validation, outputMapping.|
|WorkflowInstance|id, workflowVersionId, triggerRef, status, outcome, context, startedAt,<br>completedAt.|
|ParticipantExecution|id, instanceId, participantId, participantSnapshot, state.|
|NodeExecution|id, instanceId, nodeDefinitionId, participantExecutionId?, state, inputSnapshot,<br>output, startedAt, completedAt.|
|Task|id, nodeExecutionId, assigneeId, status, dueAt, formData, decision, completedAt.|
|RuntimeEvent|id, instanceId, eventType, correlationRef, payload, createdAt.|



Trang 37 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**Entity / Aggregate**|**Thuộc tính chính (khái niệm)**|
|---|---|
|AuditLog|actor, action, resourceType/resourceId, before/after summary, timestamp.|
|OrganizationUser|id, externalId, displayName, email, active, managerId, orgUnit metadata.|



#### **14.1 Ranh giới lưu trữ Definition vs Runtime** 

- Definition/Version lưu cấu hình có thể tái sử dụng. 

- Instance/Execution/Task lưu state runtime; không sửa ngược Definition. 

- Runtime nên snapshot input quan trọng để audit ngay cả khi dữ liệu nguồn thay đổi sau đó. 

- Context có thể tách storage lớn/attachment khỏi row chính; document chỉ quy định semantic, không bắt buộc schema vật lý. 

## **15. Validation và Acceptance Criteria** 

#### **15.1 Acceptance Criteria tối thiểu từ requirement cơ sở** 

- Có thể nhập tên workflow. 

- Có thể thêm step. 

- Có thể cấu hình approver. 

- Có thể định nghĩa condition. 

- Có thể publish workflow sau khi validate thành công. 

#### **15.2 Acceptance Criteria mở rộng để chứng minh tính ĐỘNG** 

- Cùng một Published Workflow Version có thể tạo nhiều Workflow Instance với trigger data khác nhau. 

- Cùng một node dùng Dynamic User có thể resolve ra assignee khác nhau giữa hai instance hoặc hai participant. 

- Một Workflow Instance có thể chứa nhiều participant và tạo nhiều task mà không clone instance theo từng participant. 

- Condition có thể route khác nhau khi context khác nhau mà không sửa code. 

- Input của System Action/Form/Notification có thể bind từ output node trước. 

- Thay đổi business rule được thực hiện bằng sửa Draft và publish version mới; instance đang chạy không bị đổi logic. 

- Validation phát hiện binding/condition/resolver configuration sai ở mức schema trước khi publish. 

- System Action retry không tạo side effect lặp nếu connector/action hỗ trợ idempotency policy. 

## **16. Traceability với requirement gốc** 

|**Requirement**|**Thiết kế liên quan**|**Mức đáp ứng**|
|---|---|---|
|§2 Create Workflow|UC-01, UC-02, §7.1–7.2|Đáp ứng|
|§2 Edit Workflow|UC-03, UC-06–13|Đáp ứng|



Trang 38 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**Requirement**|**Thiết kế liên quan**|**Mức đáp ứng**|
|---|---|---|
|§2 Delete Workflow|UC-18, §7.18|Đáp ứng + soft<br>delete|
|§2 Publish Workflow|UC-14–15, §7.16–7.17|Đáp ứng|
|§2 Suspend Workflow|UC-17, §7.18|Đáp ứng|
|§2 Theo dõi Workflow|UC-24–27, §9|Đáp ứng|
|§3.2<br>Start/Approval/Review/Assignment/Notification/System<br>Action/End|§7.6–7.15|Đáp ứng|
|§3.3 Connection|UC-09, §7.11|Đáp ứng|
|§3.4 Condition|UC-10, §7.12|Đáp ứng +<br>dynamic context|
|§3.5 Approver Fixed/Role/Dynamic|UC-08, §7.9|Đáp ứng + mở<br>rộng<br>Group/Participant<br>resolver|
|§3.6 Notification triggers/channels|UC-11, §7.13|Đáp ứng|
|§3.7 SLA/Escalation|UC-12/23, §7.14|Đáp ứng|
|§3.8 Publish validation|UC-14/15, §7.16–7.17|Đáp ứng|
|§3.9 Runtime view/search/filter|UC-24/25, §9|Đáp ứng|
|§3.10 Audit & History|UC-26/27, §9.4|Đáp ứng|
|§4 Permission|UC-28, §5|Đáp ứng|
|§5 Workflow status|§13|Đáp ứng, tách rõ<br>definition<br>state/runtime<br>state|
|§6 User Story acceptance|§15|Đáp ứng|



## **17. Các nguyên tắc kỹ thuật để giữ hệ thống thực sự ĐỘNG** 

|**Nguyên tắc**|**Mục đích**|
|---|---|
|Definition-driven execution|Engine đọc graph/config từ Workflow Version; không có switch-case theo<br>tên workflow.|
|Plugin/registry theo Node Type|Mỗi node type có handler generic. Thêm capability mới bằng đăng ký<br>node/connector, không sửa từng definition.|
|Schema-first bindings|Node khai báo input/output schema để Designer validate expression trước<br>publish.|
|Runtime Resolver Service|Assignee/participant/organization resolution là service dùng chung, nhận<br>resolver config + context.|
|Immutable published versions|Version đã publish không mutate; runtime bind version chính xác.|
|Explicit context scopes|trigger / instance / participant / node output tách namespace.|



Trang 39 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

|**Nguyên tắc**|**Mục đích**|
|---|---|
|Idempotent external effects|System Action/trigger có correlation và idempotency strategy.|
|Audit by design|Mọi change definition và action runtime quan trọng có event/history.|
|No secret in definition/context|Definition chỉ lưu secret reference; secret được lấy từ secure<br>store/connection config.|
|Deterministic routing|Condition engine có syntax/semantics giới hạn, type-aware, testable.|
|Human task as runtime object|Task không chỉ là trạng thái node; có assignee, due date, form, action,<br>history riêng.|
|Participant-aware execution|Một instance có thể có N participant; task/node execution giữ correlation rõ<br>ràng.|



#### **17.1 Anti-pattern cần tránh** 

- Mỗi workflow nghiệp vụ tạo một service/class riêng và if/else riêng trong engine. 

- Hard-code approver bằng userId trong source code thay vì resolver configuration. 

- Cho node đọc trực tiếp mọi bảng DB nội bộ không qua data/action contract. 

- Dùng Workflow Definition đang Published làm mutable object và để instance “nhìn thấy” thay đổi giữa chừng. 

- Đồng nhất “một người tham gia” với “một workflow instance”. 

- Dùng expression engine cho phép chạy code tùy ý của user mà không sandbox. 

- Lưu credential/API key trực tiếp trong JSON definition. 

- Không version form/condition/connector config cùng với Workflow Version. 

## **18. Các quyết định thiết kế cần chốt khi triển khai** 

|**Quyết định**|**Khuyến nghị hiện tại**|
|---|---|
|Participant membership thay đổi giữa<br>runtime?|Snapshot tại instance start mặc định; live refresh là option riêng.|
|Condition nằm trên node hay edge?|Có thể dùng Condition node để UX trực quan; edge vẫn cần label/route<br>metadata. Nếu hỗ trợ condition trực tiếp trên edge, semantic phải thống<br>nhất và validation cùng engine.|
|Loop/rework có được phép?|Nếu chưa có execution semantics an toàn, giới hạn DAG ở phiên bản đầu;<br>request-change có thể là route đặc biệt khi engine hỗ trợ loop.|
|Multiple assignee completion|Cấu hình ALL/ANY/THRESHOLD; default theo node type.|
|Missing dynamic assignee|Node config phải chọn Fail / Fallback resolver / Escalate / Skip; không<br>silently assign sai.|
|Suspend xử lý instance đang chạy|Không hủy mặc định; chỉ chặn trigger mới.|
|Version numbering|System generated; user không tự nhập version published.|
|Context retention|Xác định retention, masking và attachment storage theo<br>security/compliance.|
|External organization source|Một source of truth trong phase đầu; mapper normalize về internal<br>directory model.|



Trang 40 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION_ 

## **Kết luận** 

Thiết kế Workflow Builder đáp ứng requirement khi người dùng có thể tạo, chỉnh sửa, nối bước, cấu hình approver/condition/notification/SLA/system action, validate và publish; đồng thời vận hành được instance và audit lịch sử. Tuy nhiên, để hệ thống thực sự “ĐỘNG”, Definition phải được nâng từ một sơ đồ kéo-thả thành một mô hình thực thi có runtime context, resolver, participant scope, input/output binding, dynamic routing, version binding và task execution độc lập. Khi các cơ chế này là capability generic của platform, tổ chức có thể thay đổi quy trình chủ yếu bằng cấu hình thay vì thay đổi code. 

Trang 41 

