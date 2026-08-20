_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

# **WORKFLOW BUILDER** 

##### **TÀI LIỆU MÔ TẢ CHI TIẾT HỆ THỐNG – PHIÊN BẢN 2.0** 

Hai trụ cột của tính ĐỘNG: Workflow Definition biểu đạt được nghiệp vụ và Runtime Resolver giải quyết dữ liệu/người xử lý động 

|**Thông tin**|**Giá trị**|
|---|---|
|Loại tài liệu|System / Functional / Execution Specification|
|Phạm vi|Workflow Builder, Definition Meta-model, Node Catalog, Runtime Resolver, Human Task,<br>Participant, Runtime Engine, Monitoring, Audit, Organization Resolution|
|Trọng tâm|Mô tả chi tiết cách một workflow được biểu diễn hoàn toàn bằng cấu hình và cách mọi<br>tham chiếu động được resolve tại runtime|
|Nguồn kế thừa|Workflow_Builder_Detailed_System_Specification v1.0 và requirement cơ sở|
|Phiên bản tài liệu|2.0 – Expanded Dynamic Architecture|
|Ngoài phạm vi|Không mô tả các workflow nghiệp vụ demo cụ thể; không đặc tả schema vật lý cuối cùng<br>hoặc công nghệ triển khai bắt buộc.|



**Luận đề:** Tài liệu này coi “ĐỘNG” là một thuộc tính kiến trúc, không phải một tính năng UI. Workflow chỉ được coi là dynamic khi (1) Definition đủ khả năng biểu đạt cấu trúc nghiệp vụ bằng primitive generic và (2) runtime có resolver để biến các rule/reference trong Definition thành dữ liệu, participant, assignee, route, thời gian và nội dung cụ thể. 

Trang 1 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **Mục lục nội dung** 

- 1. Mục tiêu, phạm vi và tiêu chí “ĐỘNG” 

- 2. Mô hình hai trụ cột của Workflow Platform 

- 3. Thuật ngữ và ranh giới Definition-time / Runtime-time 

###### **PHẦN I – TRỤ CỘT 1: WORKFLOW DEFINITION BIỂU ĐẠT ĐƯỢC CẤU TRÚC** 

- 4. Workflow Definition Meta-model 

- 5. Graph, Node, Port và Connection Semantics 

- 6. Node Catalog – danh mục primitive được platform hỗ trợ 

- 7. Đặc tả chi tiết từng Node Type 

- 8. Participant Definition, Execution Scope và Completion Policy 

- 9. Form, Data Contract và Input/Output Binding 

- 10. Validation và “compile” Workflow Definition trước Publish 

###### **PHẦN II – TRỤ CỘT 2: RUNTIME RESOLVER** 

- 11. Workflow Context – mô hình dữ liệu runtime 

- 12. Resolver Meta-model và Resolver Contract 

- 13. Value Resolver và Expression Resolver 

- 14. Participant Resolver 

- 15. Assignee / Actor Resolver 

- 16. Role, Group, Queue và Task Claiming 

- 17. Notification Recipient và Template Resolver 

- 18. Route / Condition Resolver 

- 19. SLA, Deadline và Escalation Resolver 

- 20. Resolver Composition, Cardinality và Fallback 

- 21. Thời điểm resolve, snapshot, consistency, cache và audit 

###### **PHẦN III – EXECUTION MODEL** 

- 22. Tạo Workflow Instance từ Trigger 

- 23. Node Execution Lifecycle và dispatch theo node kind 

- 24. Human Task lifecycle 

- 25. Multi-participant execution và correlation 

- 26. Loop/Rework, Parallelism, Join và Wait semantics 

- 27. System Action, Retry, Idempotency và Error Route 

- 28. Versioning, Publish, Suspend và Runtime Binding 

###### **PHẦN IV – USE CASE, MODULE, DATA MODEL VÀ ACCEPTANCE** 

- 29. Danh mục Use Case 

- 30. Đặc tả các Use Case trọng yếu 

- 31. Kiến trúc module và contract giữa các service 

- 32. Mô hình dữ liệu khái niệm mở rộng 

Trang 2 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

- 33. Monitoring, My Tasks, Notification và Audit 

- 34. Acceptance Criteria chứng minh tính ĐỘNG 

- 35. Anti-pattern và quyết định thiết kế cần chốt 

- 36. Lộ trình capability theo phase 

Trang 3 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **1. Mục tiêu, phạm vi và tiêu chí “ĐỘNG”** 

Workflow Builder là một nền tảng định nghĩa và thực thi quy trình dùng chung trong tổ chức. Business user hoặc workflow owner mô tả quy trình bằng cấu hình; runtime engine đọc cấu hình đó để tạo instance, giao task, gọi hệ thống ngoài, chờ sự kiện và điều hướng. Mục tiêu quan trọng nhất là loại bỏ nhu cầu viết một service/class riêng cho mỗi quy trình nghiệp vụ. 

Tài liệu phiên bản 1.0 đã xác định đúng các chiều dynamic như trigger, participant, assignee, routing, form, system action, SLA và notification. Phiên bản này đi sâu thêm một tầng: không chỉ liệt kê capability, mà đặc tả meta-model, contract, lifecycle, input/output, validation, cardinality và lỗi của từng capability để đội phát triển có thể hiện thực engine nhất quán. 

|**Mục tiêu**|**Yêu cầu cụ thể**|
|---|---|
|Business-configurable|Một người có quyền thiết kế có thể thay đổi thứ tự bước, condition, người xử lý, form, SLA,<br>notification, action bằng Definition và publish version mới.|
|Generic engine|Engine dispatch theo node type/capability, không dispatch theo tên workflow hoặc module<br>nghiệp vụ.|
|Runtime variability|Cùng một Workflow Version có thể chạy với participant, assignee, dữ liệu và route khác nhau.|
|Predictable semantics|Node/connection/resolver phải có behavior xác định, có schema, có validation và audit;<br>“dynamic” không đồng nghĩa “tùy ý chạy code”.|
|Organization-ready|Hỗ trợ user, manager relationship, role/group/org unit, task assignment, notification, SLA, audit<br>và versioning.|
|Safe evolution|Published version immutable; instance đang chạy không nhìn thấy logic mới sau khi republish.|



**Điểm mấu chốt:** Một workflow kéo-thả được nhưng chỉ hỗ trợ “Approval → End” cố định vẫn chưa dynamic. Ngược lại, một engine có resolver mạnh nhưng Definition không có node/gateway/loop/task đủ để biểu diễn nghiệp vụ cũng không dynamic. Hai trụ cột phải cùng tồn tại. 

###### **1.1 Ngoài phạm vi** 

- Không xây lại HRM/ERP/Asset/Finance. Workflow Platform chỉ consume dữ liệu/contract cần thiết. 

- Không cho business user nhúng Java/JavaScript tùy ý vào engine như phương thức chính để biểu diễn nghiệp vụ. Script nếu có là capability có sandbox và governance riêng. 

- Không quyết định schema vật lý database trong tài liệu này; entity được mô tả theo semantic để backend có thể chọn relational/document/event storage phù hợp. 

- Không mô tả các workflow demo cụ thể; ví dụ trong tài liệu chỉ minh họa contract ở mức generic. 

Trang 4 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **2. Mô hình hai trụ cột của Workflow Platform** 

```
                         WORKFLOW DYNAMIC PLATFORM
```

```
          TRỤ CỘT 1                                  TRỤ CỘT 2
  DEFINITION EXPRESSIVENESS                    RUNTIME RESOLUTION
  -----------------------                     ------------------
  Graph / Nodes / Ports                       Context / Schema
  Human Task semantics                       Value Resolver
  Condition / Routing                        Participant Resolver
  Wait / Rework / Parallel                   Assignee Resolver
  Form / Input / Output                      Recipient Resolver
  System Action contract                     Route / SLA Resolver
  Completion policies                        Fallback / Cardinality
           |                                         |
           +------------------+----------------------+
                              |
                              v
                    DEFINITION-DRIVEN ENGINE
                              |
                 Trigger -> Instance -> Execution
```

Trụ cột 1 trả lời câu hỏi: “Người dùng có mô tả được cấu trúc nghiệp vụ của họ bằng những primitive mà platform cung cấp không?”. Trụ cột 2 trả lời: “Khi cấu trúc đó được thực thi, platform có thể lấy đúng giá trị, đúng người, đúng tập người và đúng route theo dữ liệu runtime mà không hard-code không?”. 

|**Nếu thiếu**|**Hậu quả**|
|---|---|
|Thiếu trụ cột 1|Resolver có thể tìm manager/participant rất tốt nhưng user không thể mô tả rework, wait,<br>approval, notification hay nhiều nhánh; workflow vẫn bị giới hạn bởi cấu trúc cứng.|
|Thiếu trụ cột 2|Canvas có nhiều node nhưng mỗi node phải chọn user/dữ liệu cố định; cùng definition không<br>thích ứng theo request/participant; mỗi thay đổi business phải sửa definition thủ công hoặc<br>sửa code.|
|Có cả hai nhưng không<br>schema/validation|Workflow “linh hoạt” nhưng lỗi chỉ xuất hiện khi chạy; khó vận hành và audit.|
|Có cả hai +<br>schema/version/audit|Workflow trở thành executable configuration: có thể preview, validate, publish, version và<br>chạy an toàn.|



###### **2.1 Nguyên tắc Definition-driven** 

- Engine chỉ biết Node Type, Resolver Type, Connection semantic và policy generic. 

- Workflow Version là dữ liệu cấu hình bất biến; không sinh class nghiệp vụ riêng. 

- Mỗi node type đăng ký handler/descriptor qua registry. Descriptor công bố config schema, input schema, output schema, port schema và validation rules. 

- Mọi dynamic reference được biểu diễn bằng Resolver Definition hoặc Binding Definition thay vì đọc trực tiếp biến toàn cục. 

- Mọi side effect bên ngoài đi qua Action/Connector contract có retry, idempotency và credential reference. 

Trang 5 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **2.2 Definition-time, Compile-time và Runtime-time** 

|**Giai đoạn**|**Việc xảy ra**|**Không được làm**|
|---|---|---|
|Definition-time|User tạo graph, chọn node, cấu hình<br>form/resolver/condition/SLA/action.|Không resolve user thực tế nếu rule<br>cần runtime context; preview chỉ là<br>sample.|
|Validation/Compile-<br>time|Hệ thống kiểm tra graph, schema, type, path, port, required<br>config; tạo compiled/published snapshot.|Không gọi side-effect thật chỉ để<br>validate.|
|Runtime-time|Trigger tạo instance; context được khởi tạo; resolver chạy;<br>node handler thực thi; event làm flow tiến tiếp.|Không đọc draft hiện tại; không<br>thay đổi published definition.|



Trang 6 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **3. Thuật ngữ và ranh giới Definition-time / Runtime-time** 

|**Thuật ngữ**|**Định nghĩa chi tiết**|
|---|---|
|Workflow Definition|Aggregate ở design-time chứa metadata và draft graph. Có thể chỉnh sửa khi Draft.|
|Workflow Version|Snapshot executable, immutable được sinh khi publish; chứa toàn bộ<br>graph/node/form/resolver/action config cần để chạy.|
|Trigger Definition|Rule nhận một sự kiện bên ngoài và chuẩn hóa thành trigger context để tạo instance.|
|Participant Definition|Rule chọn “đối tượng chính” thuộc phạm vi instance. Có thể không tồn tại ở workflow đơn giản.|
|Node Definition|Một bước logic generic. Chứa type, config, binding, execution scope, error/SLA policy và<br>position UI.|
|Port Definition|Điểm vào/ra logic của node. Output port có semantic như COMPLETED, APPROVED, REJECTED,<br>TRUE, FALSE, TIMEOUT, ERROR.|
|Connection Definition|Cạnh nối output port của source tới input của target; có thể có condition/priority/default route.|
|Workflow Instance|Một lần chạy của đúng Workflow Version, được tạo từ một trigger event hợp lệ.|
|Participant Execution|Runtime scope/correlation cho một participant khi graph chạy per-participant.|
|Node Execution|Một lần thực thi một Node Definition trong instance và có thể gắn participant execution.|
|Human Task|Runtime object cần người dùng hành động; có assignee/claimant, form, due date, actions,<br>history.|
|Resolver Definition|Cấu hình mô tả cách tìm một giá trị runtime, không phải kết quả runtime.|
|Resolution Result|Kết quả resolver: value(s), metadata, source, timestamp, warnings/error.|
|Workflow Context|Kho dữ liệu runtime có namespace/type rõ ràng dùng cho binding/resolver/condition/template.|



**Phân biệt bắt buộc:** Participant và Assignee là hai khái niệm khác nhau. Participant trả lời “quy trình này đang chạy cho/đối với ai?”. Assignee trả lời “ai phải thực hiện task này?”. Manager/HR/IT có thể là assignee mà không phải participant chính. 

Trang 7 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

# **PHẦN I** 

### **TRỤ CỘT 1 – WORKFLOW DEFINITION BIỂU ĐẠT ĐƯỢC CẤU TRÚC** 

Mục tiêu của phần này là xác định chính xác “ngôn ngữ cấu trúc” mà Workflow Builder cung cấp cho business user: node nào tồn tại, node có port nào, input/output gì, khi nào chờ, khi nào route, khi nào tạo task và khi nào được coi là hoàn thành. 

Trang 8 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **4. Workflow Definition Meta-model** 

Workflow Definition phải được coi là một executable model chứ không phải JSON UI tùy ý. Mỗi phần tử trong definition phải có semantic mà Runtime Engine hiểu thống nhất. Một published snapshot tối thiểu cần các thành phần sau: 

```
WorkflowVersion
  metadata
  triggerDefinition
  participantDefinition?
  workflowVariables[]
  nodes[]
    - id
    - nodeType
    - executionScope
    - config
    - inputBindings
```

```
    - outputSchema
    - policies
  connections[]
  forms[] / form references
  notificationHooks[]
  schemaManifest
  versionMetadata
```

|**Khối**|**Vai trò**|**Tính mutable**|
|---|---|---|
|Metadata|Tên, mô tả, owner, tags, module, category.|Draft mutable; version snapshot<br>immutable.|
|Trigger|Xác định điều gì có quyền tạo instance.|Versioned.|
|Participant|Rule xác định tập participant.|Versioned; kết quả runtime có thể<br>snapshot.|
|Variables|Biến instance có schema/default/resolver.|Definition versioned; value runtime<br>mutable theo policy.|
|Nodes|Cấu trúc và behavior từng bước.|Versioned.|
|Connections|Luồng điều hướng giữa port.|Versioned.|
|Forms|UI/data contract cho human task.|Phải version cùng workflow hoặc pin<br>version riêng.|
|Schemas|Known context schema phục vụ binding/validation.|Generated/compiled khi<br>validate/publish.|
|Policies|Error, timeout, missing resolver, completion, security.|Versioned.|



###### **4.1 Node Type Descriptor – hợp đồng giữa Designer và Engine** 

Để thêm node mà không viết logic cho từng workflow, platform cần registry của Node Type Descriptor. Descriptor không chứa config cụ thể của workflow; nó mô tả capability của một loại node. 

**Thuộc tính descriptor Ý nghĩa** 

Trang 9 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

|**Thuộc tính descriptor**|**Ý nghĩa**|
|---|---|
|typeKey|Định danh ổn định, ví dụ HUMAN_ASSIGNMENT, APPROVAL, CONDITION.|
|kind|CONTROL / HUMAN_TASK / AUTOMATION / WAIT / TERMINAL / COMPOSITION.|
|configSchema|Schema các trường user được phép cấu hình.|
|inputSchema|Kiểu dữ liệu node có thể nhận qua binding.|
|outputSchema|Kiểu dữ liệu node sinh ra cho context.|
|inputPorts / outputPorts|Danh sách port và semantic.|
|supportedScopes|INSTANCE / EACH_PARTICIPANT / optional collection scope.|
|supportsSla / supportsForm /<br>supportsAssignee|Capability flags để Designer hiển thị đúng UI.|
|validator|Rule validation đặc thù node.|
|handlerKey|Runtime handler generic dùng để dispatch.|



UI không được tự suy luận behavior từ label của node. Mọi behavior phải đến từ type descriptor và config schema; label business-readable chỉ là metadata. 

Trang 10 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **5. Graph, Node, Port và Connection Semantics** 

###### **5.1 Graph semantic** 

Workflow graph là directed execution graph. Mỗi connection nối một output port của source node tới target node. Engine không nên chỉ lưu cặp sourceNodeId/targetNodeId vì các node như Approval, Condition, Wait và System Action có nhiều outcome khác nhau. 

```
Node A --[COMPLETED]--> Node B
Approval --[APPROVED]--> Node C
Approval --[REJECTED]--> End Rejected
Condition --[TRUE]--> Path X
Condition --[FALSE]--> Path Y
System Action --[SUCCESS]--> Next
System Action --[ERROR]--> Error Handling
```

###### **5.2 Port model** 

|**Port type**|**Ví dụ**|**Quy tắc**|
|---|---|---|
|Success/Completion|COMPLETED, SUCCESS|Route bình thường sau khi node hoàn thành.|
|Business outcome|APPROVED, REJECTED,<br>REVIEW_COMPLETED|Outcome do actor/action tạo ra; không coi REJECTED là<br>technical error.|
|Decision|TRUE, FALSE, CASE:<value>, DEFAULT|Do condition/gateway quyết định.|
|Temporal|TIMEOUT, TIMER_FIRED|Do timer/SLA/wait event.|
|Technical|ERROR, RETRY_EXHAUSTED|Chỉ dùng khi policy cho phép route technical failure trong<br>graph.|



###### **5.3 Connection rules** 

- Mỗi connection phải tham chiếu source node, source port, target node và target input/default entry. 

- Nhiều connection từ cùng port chỉ hợp lệ khi semantic node cho phép multi-route hoặc có condition + priority rõ ràng. 

- Phải có default/fallback route khi condition set không bảo đảm exhaustive. 

- Không cho dangling connection khi publish. 

- Cycle chỉ được cho phép nếu engine hỗ trợ re-entry token/correlation và có guard chống infinite loop; nếu chưa hỗ trợ, validation chặn cycle. 

- Connection label phục vụ business readability nhưng không thay thế port key ổn định. 

###### **5.4 Input binding và output contract** 

Mỗi node nhận input qua binding và phát output theo output schema. Engine cần snapshot input thực tế vào NodeExecution để audit; output được ghi vào namespace của node execution hoặc participant execution tương ứng. 

Trang 11 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

```
NodeDefinition.inputBindings
  employeeId <- ${participant.id}
  requestId  <- ${instance.requestId}
  amount     <- ${nodes.lookup.output.amount}
NodeExecution.inputSnapshot = { ...resolved values... }
NodeExecution.output        = { ...handler result... }
```

Trang 12 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **6. Node Catalog – danh mục primitive được platform hỗ trợ** 

Node Catalog nên được thiết kế theo capability generic, không theo tên quy trình. Catalog dưới đây tách capability “Core V1” (đủ để biểu diễn đa số quy trình tổ chức tuần tự + rẽ nhánh + human task + integration) và “Advanced” (cần khi business có parallelism, event wait hoặc tái sử dụng flow). 

|**Nhóm**|**Node Type**|**Mức**|**Vai trò**|
|---|---|---|---|
|Boundary|Start|Core V1|Điểm vào graph sau khi Trigger tạo instance.|
|Boundary|End|Core V1|Kết thúc path/participant/instance và map outcome.|
|Human|Assignment|Core V1|Giao một task thực hiện công việc/nhập dữ liệu.|
|Human|Form Task|Core V1|Thu thập dữ liệu có cấu trúc từ actor/participant; có thể<br>coi là specialization của Assignment.|
|Human|Approval|Core V1|Yêu cầu quyết định approve/reject/request-change.|
|Human|Review|Core V1|Review hồ sơ/nội dung, có comment/return/complete<br>nhưng không bắt buộc semantics approve/reject.|
|Control|Condition / Gateway|Core V1|Đánh giá condition và chọn một/multiple route.|
|Automation|Notification|Core V1|Gửi email/in-app/Teams/webhook theo recipient resolver<br>và template.|
|Automation|System Action|Core V1|Thực hiện action qua connector registry; HTTP/record<br>update là action subtype.|
|Data|Data Transform / Set Variable|Core V1|Tính/chuẩn hóa/map dữ liệu thuần túy, không side effect.|
|Wait|Timer / Delay|Core V1|Chờ duration hoặc thời điểm trước khi tiếp tục.|
|Wait|Wait for Event|Advanced|Chờ external/internal correlated event rồi resume.|
|Control|Parallel Split|Advanced|Kích hoạt nhiều path song song.|
|Control|Join|Advanced|Đồng bộ nhiều path theo ALL/ANY/THRESHOLD.|
|Composition|Subworkflow|Advanced|Khởi chạy/đợi một workflow khác theo version/policy.|
|Automation|Restricted Script|Optional / Governed|Transform đặc biệt khi primitive không đủ; sandbox,<br>quota, không phải escape hatch mặc định.|



**Khuyến nghị kiến trúc:** HTTP Request, Database Action, Create Record, Update Record không nhất thiết là các node type độc lập. Có thể biểu diễn dưới System Action + Action Registry. Việc tách thành icon riêng ở UI là presentation; runtime semantic vẫn nên dùng cùng contract automation để tránh bùng nổ node type. 

Trang 13 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **7. Đặc tả chi tiết từng Node Type** 

Mỗi node dưới đây được đặc tả theo cùng một contract: mục đích, cấu hình, input, output/ports, runtime behavior, execution scope, resolver integration, validation và failure semantics. Đây là phần cốt lõi để agent/backend/frontend cùng hiểu một node “thực sự làm gì”. 

###### **7.1 Start Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|BOUNDARY|
|Mục đích|Điểm bắt đầu của graph sau khi Trigger Definition đã được chấp nhận và Workflow Instance đã được<br>tạo. Start không tự tạo instance; nó chỉ là entry point logic.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|name/label|Có|Tên hiển thị; type key vẫn START.|
|initialBindings|Tùy chọn|Map trigger/instance data vào workflow variables ban đầu.|
|participantPolicyReference|Tùy chọn|Tham chiếu participant definition nếu cần khởi tạo participant execution ngay<br>tại entry.|
|startNotification|Tùy chọn|Hook thông báo instance/participant khi bắt đầu.|



**Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|triggerContext|Trigger payload đã normalize.|
|Input|instanceContext|ID/version/creator/timestamps.|
|Output Port|STARTED|Route duy nhất khi initialize thành công.|
|Output|initialVariables|Workflow variables sau binding.|



###### **Runtime behavior** 

1. Runtime Engine tạo NodeExecution cho Start sau khi instance/context/participant snapshot sẵn sàng theo policy. 

2. Resolve initial bindings; không thực hiện side effect business ngoài các hook được cấu hình. 

3. Đánh dấu COMPLETED và emit STARTED để route node tiếp theo. 

###### **Execution scope và resolver** 

- Chạy một lần ở INSTANCE scope. Nếu participant paths bắt đầu độc lập, Start có thể fan-out logic sang participant-aware node tiếp theo nhưng bản thân Start không tạo task. 

Trang 14 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **Validation trước publish** 

- Chỉ có một Start active theo policy; mọi node cần reachable từ Start hoặc được đánh dấu event-entry hợp lệ trong future extension. 

- Binding path/type hợp lệ. 

- Không cho Start có inbound connection trong V1. 

###### **Failure / edge cases** 

- Participant resolver fail trước Start thì instance áp dụng participant-empty/error policy. 

- Initial binding null áp dụng null policy. 

Trang 15 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.2 End Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|TERMINAL|
|Mục đích|Kết thúc một execution path. End có thể map business outcome và chỉ hoàn thành toàn bộ instance<br>khi completion semantics ở cấp instance/participant đã thỏa.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|endType|Có|SUCCESS / REJECTED / CANCELLED / CUSTOM.|
|outcomeMapping|Tùy chọn|Map context vào business outcome/result summary.|
|completionScope|Có|PARTICIPANT_PATH hoặc INSTANCE_PATH; runtime aggregate quyết định<br>instance end.|
|endNotification|Tùy chọn|Thông báo participant/initiator/owner khi path hoặc instance kết thúc.|



###### **Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|currentContext|Context tại path hiện tại.|
|Output Port|Không có|Terminal node.|
|Output|result/outcome|Kết quả lưu vào participant/instance summary.|



###### **Runtime behavior** 

4. Nhận token/path đến End và đánh dấu path tương ứng đã kết thúc. 

5. Nếu đang ở participant execution, cập nhật participant state/outcome. 

6. Runtime Aggregator kiểm tra còn active path/task/participant nào không và completion policy. 

7. Chỉ khi điều kiện cấp instance thỏa mới set WorkflowInstance COMPLETED/REJECTED/CANCELLED tương ứng. 

###### **Execution scope và resolver** 

- INSTANCE và EACH_PARTICIPANT đều có thể đi tới End; vì vậy End không được đồng nhất “một người tới End = cả instance xong”. 

###### **Validation trước publish** 

- End reachable. 

- outcomeMapping type hợp lệ. 

- Không có outgoing connection. 

###### **Failure / edge cases** 

- Có active task/path khác thì End chỉ kết thúc scope hiện tại. 

- Nhiều End khác outcome cùng instance cần aggregation rule rõ ràng. 

Trang 16 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

Khuyến nghị tách Execution State và Business Outcome: technical COMPLETED không đồng nghĩa business APPROVED. 

Trang 17 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.3 Assignment Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|HUMAN_TASK|
|Mục đích|Giao một công việc cho user/role/group/dynamic actor. Có thể kèm form, instruction, attachment, due<br>date và task notification.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|taskTitle|Có|Text/template hỗ trợ variable binding.|
|assigneeResolver|Có|Resolver trả UserRef hoặc UserRef[].|
|assignmentMode|Có|DIRECT_ONE / DIRECT_ALL / CLAIMABLE_POOL.|
|executionScope|Có|INSTANCE hoặc EACH_PARTICIPANT.|
|formRef|Tùy chọn|Form schema cho dữ liệu người thực hiện phải nhập.|
|completionPolicy|Có khi nhiều<br>task|ALL / ANY / THRESHOLD / PER_PARTICIPANT.|
|slaPolicy|Tùy chọn|Due/reminder/escalation/timeout.|
|notificationPolicy|Tùy chọn|Thông báo khi task assigned/reminded/completed.|



###### **Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|taskContext|Các field được expose cho task/form.|
|Output|formData|Dữ liệu submit.|
|Output|completedBy|Actor thực tế hoàn thành/claim task.|
|Output Port|COMPLETED|Task thỏa completion policy.|
|Output Port|TIMEOUT|Nếu timeout route được cấu hình.|



###### **Runtime behavior** 

8. Khi node READY, engine resolve execution scope rồi resolve assignee theo đúng participant/context. 

9. Task Service tạo task hoặc task pool; snapshot title, instruction, form version, dueAt và assignee rule/result. 

10. Notification Service gửi notification theo policy sau khi task tạo thành công. 

11. Node chuyển WAITING cho đến khi task action hợp lệ đáp ứng completion policy. 

12. Khi hoàn thành, form/output được persist và internal event resume node; node phát COMPLETED. 

###### **Execution scope và resolver** 

- INSTANCE: một node execution cho instance. 

Trang 18 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

- EACH_PARTICIPANT: mỗi participant có node execution/task độc lập. 

- Assignee resolver có thể trả current participant, manager, role/group, context user hoặc composed resolver. 

###### **Validation trước publish** 

- Resolver expected cardinality phù hợp assignment mode. 

- Form/output mapping hợp lệ. 

- SLA và notification template reference hợp lệ. 

- Nếu DIRECT_ONE nhưng resolver có thể trả N>1, phải cấu hình selection policy hoặc validation warning. 

###### **Failure / edge cases** 

- Assignee rỗng: FAIL / FALLBACK / ESCALATE / SKIP theo node policy. 

- User bị inactive sau assignment: task reassign/escalation policy. 

- Double submit: Task action phải idempotent. 

Trang 19 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.4 Form Task Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|HUMAN_TASK|
|Mục đích|Thu thập dữ liệu có cấu trúc từ một actor hoặc participant. Semantic chính là “submit form”; không<br>ngụ ý approve/reject.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|formRef|Có|Form Definition/version.|
|actorResolver|Có|Ai phải điền form.|
|executionScope|Có|INSTANCE / EACH_PARTICIPANT.|
|prefillBindings|Tùy chọn|Map context vào default/read-only field.|
|outputMapping|Có|Map form submission vào context namespace.|
|draftPolicy|Tùy chọn|Cho phép save draft hay không.|



###### **Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|prefillData|Dữ liệu hiển thị ban đầu.|
|Output|formData|Submission có schema.|
|Output|submittedBy|Actor submit.|
|Output Port|SUBMITTED|Form hợp lệ và submit thành công.|



###### **Runtime behavior** 

13. Resolve actor và materialize form runtime từ form schema + prefill bindings. 

14. Tạo Human Task ở trạng thái OPEN; user có thể save draft nếu cho phép. 

15. Khi submit, Task Service validate schema/visibility/authorization lại ở server. 

16. Persist immutable submission revision, map output vào context và phát SUBMITTED. 

###### **Execution scope và resolver** 

- Có thể được triển khai nội bộ bằng Assignment handler với task subtype FORM nhưng vẫn giữ node type riêng ở Designer để business dễ hiểu. 

###### **Validation trước publish** 

- Field ID unique; required/validation hợp lệ. 

- Dynamic options data source có schema. 

- Output mapping không ghi đè namespace read-only. 

Trang 20 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **Failure / edge cases** 

- Option source fail: hiển thị error/retry hoặc fallback cache. 

- Actor mất quyền trước submit: authorization re-check. 

Trang 21 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.5 Approval Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|HUMAN_TASK_DECISION|
|Mục đích|Yêu cầu một hoặc nhiều approver đưa ra quyết định business có semantic APPROVE/REJECT và tùy<br>chọn REQUEST_CHANGE.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|approverResolver|Có|User/role/group/dynamic resolver.|
|approvalMode|Có|SINGLE / ALL / ANY / THRESHOLD / SEQUENTIAL nếu hỗ trợ.|
|formRef/content|Tùy chọn|Dữ liệu đọc/nhập khi quyết định.|
|allowedActions|Có|APPROVE, REJECT, optional REQUEST_CHANGE.|
|rejectBehavior|Có|Route REJECTED; không nên tự coi là technical failure.|
|requestChangeBehavior|Tùy chọn|Route REWORK khi loop được support.|
|slaPolicy|Tùy chọn|Due/escalation/auto-action.|



**Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|approvalData|Hồ sơ/content cần phê duyệt.|
|Output|decision|APPROVED / REJECTED / REQUEST_CHANGE.|
|Output|decisions[]|Nếu multi-approver, lưu từng decision.|
|Output|comment/formData|Dữ liệu bổ sung.|
|Port|APPROVED|Theo approval aggregation policy.|
|Port|REJECTED|Business rejection.|
|Port|REQUEST_CHANGE|Nếu bật.|
|Port|TIMEOUT|Nếu timeout route.|



###### **Runtime behavior** 

17. Resolve approver set và tạo approval task(s). 

18. Authorize từng action theo task ownership/claim và state. 

19. Aggregate decision theo approvalMode; ví dụ ALL cần tất cả approve nhưng một reject có thể short-circuit theo policy. 

20. Persist từng decision/audit; khi aggregation có kết quả cuối, complete node và emit port tương ứng. 

Trang 22 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **Execution scope và resolver** 

- Có thể chạy EACH_PARTICIPANT để mỗi participant có approver khác nhau. 

- Manager-of-participant là resolver điển hình nhưng engine chỉ thấy Resolver Definition. 

###### **Validation trước publish** 

- Phải có route cho allowed terminal decision hoặc explicit default. 

- Multi approver aggregation policy đầy đủ. 

- Không cho REQUEST_CHANGE nếu graph không support/không có route. 

###### **Failure / edge cases** 

- Approver set rỗng. 

- Approver self-approval conflict nếu policy cấm. 

- Một approver inactive giữa chừng. 

- Timeout auto-approve/reject phải audit như system decision, không giả user action. 

Trang 23 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.6 Review Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|HUMAN_TASK_REVIEW|
|Mục đích|Cho reviewer kiểm tra nội dung/hồ sơ và hoàn thành review; semantic nhẹ hơn Approval, phù hợp các<br>bước kiểm tra, xác minh, request-change.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|reviewerResolver|Có|Actor/role/group/dynamic.|
|reviewActions|Có|COMPLETE, optional RETURN/REQUEST_CHANGE, optional FLAG.|
|formRef|Tùy chọn|Checklist/comment/form kết quả review.|
|completionPolicy|Có khi nhiều<br>reviewer|ALL / ANY / THRESHOLD.|
|slaPolicy|Tùy chọn|Due/reminder/escalation.|



###### **Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|reviewData|Nội dung cần kiểm tra.|
|Output|reviewResult|Status/checklist/result.|
|Output|comment/formData|Thông tin review.|
|Port|COMPLETED|Review hoàn tất.|
|Port|RETURNED|Nếu request-change.|
|Port|TIMEOUT|Nếu cấu hình.|



###### **Runtime behavior** 

21. Tạo review task(s) cho reviewer set. 

22. User xem snapshot/context được phép và submit action. 

23. Aggregate kết quả theo completion policy. 

24. Phát COMPLETED/RETURNED; nếu RETURNED tạo rework route chứ không mutate node trước. 

###### **Execution scope và resolver** 

- Có thể INSTANCE hoặc EACH_PARTICIPANT. 

###### **Validation trước publish** 

- Action/port đồng bộ. 

- Reviewer resolver hợp lệ. 

- Form/checklist schema hợp lệ. 

Trang 24 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **Failure / edge cases** 

- Reviewer rỗng hoặc mất quyền. 

- Return loop vượt max iteration nếu loop guard được cấu hình. 

Trang 25 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.7 Condition / Gateway Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|CONTROL_DECISION|
|Mục đích|Đánh giá một hoặc nhiều biểu thức type-aware trên runtime context và chọn route. Không thực hiện<br>side effect.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|mode|Có|BOOLEAN / CASE / FIRST_MATCH / MULTI_MATCH tùy phiên bản.|
|rules|Có|Nhóm condition AND/OR hoặc case expression.|
|defaultPort|Khuyến nghị|Fallback khi không rule match.|
|nullPolicy|Có|NULL_AS_FALSE / ERROR / explicit IS_NULL rule.|



###### **Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|context references|Các giá trị được resolver/field selector sử dụng.|
|Port|TRUE/FALSE|Boolean mode.|
|Port|CASE:*|Case mode.|
|Port|DEFAULT|Fallback.|
|Output|evaluationTrace|Optional audit/debug trace không chứa secret.|



###### **Runtime behavior** 

25. Resolve operands bằng Value Resolver trên context đúng scope. 

26. Evaluate expression bằng deterministic expression engine. 

27. Chọn port theo mode/priority; ghi trace kết quả. 

28. Complete node ngay và tạo path tiếp theo. 

###### **Execution scope và resolver** 

- INSTANCE hoặc EACH_PARTICIPANT; cùng một Condition Definition có thể cho route khác nhau cho từng participant. 

###### **Validation trước publish** 

- Reference path tồn tại trong known schema. 

- Operator phù hợp type. 

- Rule conflict/overlap được cảnh báo. 

- Có default nếu set không exhaustive. 

Trang 26 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **Failure / edge cases** 

- Runtime null/unexpected type theo null/error policy. 

- Không cho gọi network/DB trong expression. 

Trang 27 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.8 Notification Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|AUTOMATION_NOTIFICATION|
|Mục đích|Gửi thông báo mà không yêu cầu người nhận hoàn thành task. Recipient, content và channel có thể<br>resolve động.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|recipientResolver|Có|User(s), participant, previous actor, role/group, expression.|
|channels|Có|IN_APP / EMAIL / TEAMS / WEBHOOK theo integration.|
|template|Có|Subject/body/payload với template bindings.|
|deliveryMode|Có|BEST_EFFORT / REQUIRED / ASYNC_REQUIRED tùy policy.|
|dedupKey|Tùy chọn|Tránh gửi lặp khi retry.|



**Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|templateContext|Context được phép render.|
|Output|deliveryResults[]|Channel, recipient, status, externalMessageId.|
|Port|SENT|Theo delivery success policy.|
|Port|ERROR|Nếu notification critical và route lỗi.|



###### **Runtime behavior** 

29. Resolve recipient set tại thời điểm dispatch, không mặc định reuse participant list trừ khi cấu hình. 

30. Render template sau masking/formatting. 

31. Dispatch từng channel qua Notification Provider; lưu delivery result. 

32. Complete theo deliveryMode; best-effort có thể log failure mà flow vẫn tiếp tục. 

###### **Execution scope và resolver** 

- INSTANCE hoặc EACH_PARTICIPANT. 

- Workflow-level notification hook và Notification Node dùng cùng recipient/template resolver nhưng lifecycle khác. 

###### **Validation trước publish** 

- Recipient cardinality/empty policy. 

- Template path/schema hợp lệ. 

- Channel credential/connection tồn tại. 

Trang 28 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **Failure / edge cases** 

- Invalid email/channel unavailable. 

- Một recipient nhận duplicate do retry nếu thiếu dedup key. 

Trang 29 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.9 System Action Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|AUTOMATION_SIDE_EFFECT|
|Mục đích|Thực hiện side effect qua Action Registry/Connector: gọi API, tạo/cập nhật record, gọi command bên<br>ngoài. Node không chứa implementation nghiệp vụ riêng.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|connectorRef/actionKey|Có|Action đã được platform đăng ký.|
|inputBindings|Có theo action<br>schema|Map workflow context vào action input.|
|credentialRef|Theo connector|Secret reference, không lưu secret raw.|
|outputMapping|Tùy chọn|Map response vào node output/context.|
|successPolicy|Có|Điều kiện action được coi thành công.|
|retryPolicy|Có|Attempt/backoff/retryable errors.|
|idempotencyKeyResolver|Khuyến nghị|Key ổn định theo instance/node/business key.|
|errorPolicy|Có|FAIL / ROUTE_ERROR / IGNORE / COMPENSATE future.|



**Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|actionInput|Typed input theo Action Descriptor.|
|Output|actionOutput|Typed response đã normalize.|
|Port|SUCCESS|Action thành công.|
|Port|ERROR|Nếu route lỗi được bật.|



###### **Runtime behavior** 

33. Runtime resolve input bindings và credential reference. 

34. Tạo action execution record với idempotency key trước side effect. 

35. Connector thực thi; retry theo policy nhưng phải giữ cùng idempotency identity. 

36. Normalize response, persist output, evaluate success policy và emit SUCCESS/ERROR. 

###### **Execution scope và resolver** 

- INSTANCE hoặc EACH_PARTICIPANT; action có thể chạy riêng cho từng participant nếu definition yêu cầu. 

Trang 30 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **Validation trước publish** 

- Action/connector tồn tại và enabled. 

- Required inputs mapped đúng type. 

- Credential reference hợp lệ. 

- Retry policy không vượt platform limit. 

###### **Failure / edge cases** 

- Network timeout, 4xx/5xx, duplicate side effect, credential expired. 

- Technical failure phải phân biệt business response “not approved/insufficient” nếu connector trả như data. 

Trang 31 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.10 Data Transform / Set Variable Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|DATA_PURE|
|Mục đích|Biến đổi dữ liệu thuần túy trong context: set variable, map object, tính toán có giới hạn. Không gọi<br>external system và không tạo task.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|assignments|Có|Danh sách target path <- Value Resolver/Expression.|
|mode|Có|SET / MERGE / APPEND (nếu collection).|
|schema|Khuyến nghị|Output schema explicit để downstream validate.|



###### **Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|context values|Nguồn tính toán.|
|Output|transformed data|Namespace node output hoặc variables.|
|Port|COMPLETED|Transform thành công.|
|Port|ERROR|Nếu strict runtime error và error route.|



###### **Runtime behavior** 

37. Resolve từng expression/value theo thứ tự policy. 

38. Validate value với target type. 

39. Persist output atomically vào node output; nếu mapping sang variables thì update theo allowed mutation policy. 

40. Complete ngay. 

###### **Execution scope và resolver** 

- INSTANCE / EACH_PARTICIPANT. 

###### **Validation trước publish** 

- Không ghi vào namespace immutable trigger. 

- Expression deterministic/sandboxed. 

- Target path/type hợp lệ. 

###### **Failure / edge cases** 

- Division by zero/null conversion/schema mismatch. 

Node này giúp tránh dùng Code Node cho các mapping đơn giản; càng nhiều transform có thể biểu diễn declaratively, hệ thống càng dễ validate và audit. 

Trang 32 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

Trang 33 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.11 Timer / Delay Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|WAIT_TIMER|
|Mục đích|Dừng path trong một khoảng thời gian hoặc đến một thời điểm đã resolve rồi tự resume.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|waitType|Có|DURATION / UNTIL_DATETIME / BUSINESS_TIME.|
|duration/dateResolver|Có|Literal hoặc resolver từ context.|
|timezone/calendar|Tùy chọn|Đặc biệt khi dùng business day.|
|maxWait|Tùy chọn|Guard tránh wait vô hạn do dữ liệu sai.|



###### **Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|time values|Duration/date/context.|
|Output|firedAt|Thời điểm thực tế timer fire.|
|Port|FIRED|Timer hết.|
|Port|ERROR|Invalid schedule nếu policy route.|



###### **Runtime behavior** 

41. Resolve target time khi node activation; snapshot due time vào NodeExecution. 

42. Đăng ký durable timer; node chuyển WAITING. 

43. Timer event correlated với node execution resume node. 

44. Complete và emit FIRED. 

###### **Execution scope và resolver** 

- INSTANCE hoặc EACH_PARTICIPANT; mỗi participant có timer riêng nếu scope như vậy. 

###### **Validation trước publish** 

- Target time hợp lệ và nằm trong platform limits. 

- Timezone/calendar tồn tại. 

###### **Failure / edge cases** 

- Timer event duplicate cần idempotent resume. 

- Instance cancelled/suspended policy quyết định timer còn hoạt động. 

Trang 34 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.12 Wait for Event Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|WAIT_EVENT|
|Mục đích|Chờ một event có correlation cụ thể từ hệ thống ngoài hoặc domain event bus rồi tiếp tục. Đây là<br>capability Advanced vì cần durable subscription/correlation.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|eventType|Có|Loại event chờ.|
|correlationKeyResolver|Có|Key để event match đúng instance/node/participant.|
|payloadSchema|Khuyến nghị|Schema event payload.|
|timeout|Tùy chọn|Thời gian tối đa chờ.|
|consumePolicy|Có|FIRST_MATCH / optional multiple.|



**Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|correlation source|Context dùng tạo correlation key.|
|Output|eventPayload|Payload event đã normalize.|
|Port|RECEIVED|Event matched.|
|Port|TIMEOUT|Không nhận event đúng hạn.|



###### **Runtime behavior** 

45. Resolve correlation key và persist event subscription. 

46. Node WAITING; Event Router nhận event và tìm subscription. 

47. Validate event schema/security/idempotency; attach payload vào node output. 

48. Resume đúng node execution và emit RECEIVED hoặc TIMEOUT. 

###### **Execution scope và resolver** 

- INSTANCE / EACH_PARTICIPANT nếu correlation key bao gồm participant. 

###### **Validation trước publish** 

- Correlation key deterministic. 

- Không cho ambiguous subscription nếu policy yêu cầu unique. 

###### **Failure / edge cases** 

- Late event sau timeout. 

- Duplicate event. 

Trang 35 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

- Event đến trước subscription: cần inbox/event retention strategy nếu business yêu cầu. 

Trang 36 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.13 Parallel Split Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|CONTROL_FORK|
|Mục đích|Kích hoạt nhiều outgoing path song song từ cùng runtime scope.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|branchMode|Có|ALL configured branches hoặc conditional multi-match.|
|branchIds|System|Các output port/branch stable id.|



###### **Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|current context|Snapshot/shared context theo consistency policy.|
|Port|BRANCH_*|Mỗi branch được activate.|
|Output|forkToken|Correlation metadata cho Join.|



###### **Runtime behavior** 

49. Complete fork node và tạo child path token cho từng branch. 

50. Mỗi branch tiến độc lập nhưng giữ parent fork correlation. 

51. Context mutation đồng thời phải tuân theo namespace/merge policy. 

###### **Execution scope và resolver** 

- INSTANCE / EACH_PARTICIPANT; fork token phải giữ participant correlation. 

###### **Validation trước publish** 

- Có ít nhất hai branch. 

- Các branch reachable. 

- Nếu có Join, join key/fork correlation hợp lệ. 

###### **Failure / edge cases** 

- Race khi hai branch ghi cùng variable; nên ưu tiên node output namespace và explicit merge. 

Trang 37 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.14 Join Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|CONTROL_JOIN|
|Mục đích|Đồng bộ các path song song trước khi tiếp tục; không đồng nhất với completion policy của nhiều<br>assignee nhưng có ý tưởng aggregation tương tự.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|joinPolicy|Có|ALL / ANY / THRESHOLD.|
|expectedBranches|Có/derived|Danh sách branch/fork correlation cần chờ.|
|cancelRemaining|Tùy chọn|Khi ANY/THRESHOLD đạt, có cancel branch còn lại hay không.|
|mergePolicy|Tùy chọn|Cách merge outputs nếu downstream cần.|



###### **Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|branch completion events|Các path correlated.|
|Output|joinedResults|Summary của branch results.|
|Port|JOINED|Join policy thỏa.|



###### **Runtime behavior** 

52. Mỗi branch tới Join ghi arrival record theo fork token. 

53. Join kiểm tra policy atomically để tránh double-release. 

54. Khi thỏa, tạo đúng một continuation token và complete node. 

55. Optionally cancel/ignore late branches theo policy. 

###### **Execution scope và resolver** 

- Correlation theo instance + participant + fork token. 

###### **Validation trước publish** 

- Không join branch từ fork không tương thích. 

- Threshold <= expected branch count. 

###### **Failure / edge cases** 

- Late/duplicate branch arrival. 

- Branch failed/cancelled cần định nghĩa có tính vào ALL hay route error. 

Trang 38 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.15 Subworkflow Node** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|COMPOSITION|
|Mục đích|Tái sử dụng một workflow published như một capability con, truyền input và nhận output; tránh<br>copy/paste graph lớn.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|workflowRef|Có|Definition + version policy (PINNED / ACTIVE_AT_START).|
|invocationMode|Có|SYNC_WAIT / ASYNC_FIRE_AND_FORGET.|
|inputMapping|Có|Parent context -> child trigger/input.|
|outputMapping|Nếu sync|Child result -> parent node output.|
|participantMapping|Tùy chọn|Reuse/map participant scope nếu child cần.|
|errorPropagation|Có|Propagate / route / ignore.|



###### **Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|childInput|Mapped payload.|
|Output|childInstanceId|Correlation.|
|Output|childResult|Nếu sync.|
|Port|COMPLETED|Child hoàn thành theo expected outcome.|
|Port|ERROR|Child failed/cancelled theo policy.|



###### **Runtime behavior** 

56. Resolve target workflow version theo policy và tạo child instance với parent correlation. 

57. Nếu sync, parent node WAITING cho child completion event. 

58. Map child result rồi resume parent. 

59. Ghi parent-child linkage trong runtime history. 

###### **Execution scope và resolver** 

- INSTANCE / EACH_PARTICIPANT tùy use; nếu per participant sẽ tạo N child instances, cần platform guard. 

###### **Validation trước publish** 

- Không tạo dependency cycle giữa workflow definitions nếu policy cấm. 

- Input/output schema compatible. 

- Target version published. 

Trang 39 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **Failure / edge cases** 

- Child suspended/deleted after parent version published: pinned version policy phải xác định. 

- Recursive invocation depth limit. 

Trang 40 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **7.16 Restricted Script Node (Optional)** 

|**Thuộc tính**|**Giá trị**|
|---|---|
|Kind|AUTOMATION_SANDBOX|
|Mục đích|Capability escape-hatch được quản trị chặt để tính toán dữ liệu khi expression/transform không đủ.<br>Không dùng để gọi secret/network trực tiếp trừ permission explicit.|



###### **Cấu hình Definition** 

|**Cấu hình**|**Bắt buộc**|**Ý nghĩa**|
|---|---|---|
|language/runtime|Có|Một runtime được platform cho phép.|
|script|Có|Source versioned trong Definition.|
|inputBindings|Có|Only whitelisted context input.|
|outputSchema|Có|Typed output bắt buộc.|
|limits|System|CPU/time/memory/library whitelist.|



**Input / Output contract** 

|**Loại**|**Field/Port**|**Semantic**|
|---|---|---|
|Input|sandboxInput|Serialized allowed data.|
|Output|sandboxOutput|Validated against outputSchema.|
|Port|COMPLETED|Script success.|
|Port|ERROR|Compile/runtime/timeout.|



###### **Runtime behavior** 

60. Compile/static-check khi validate nếu có thể. 

61. Runtime tạo sandbox với resource limits và không cấp credential mặc định. 

62. Validate output schema trước khi persist. 

###### **Execution scope và resolver** 

- INSTANCE / EACH_PARTICIPANT. 

###### **Validation trước publish** 

- Không import forbidden library/API. 

- Output schema required. 

- Script size/time limits. 

###### **Failure / edge cases** 

- Timeout, nondeterminism, security risk. 

Trang 41 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

Không nên đưa Code Node thành con đường mặc định để “làm dynamic”; nếu mọi nghiệp vụ phải viết code thì platform đã chuyển trách nhiệm từ backend developer sang workflow author chứ chưa thực sự cấu hình được. 

Trang 42 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **8. Participant Definition, Execution Scope và Completion Policy** 

Participant là abstraction cấp workflow/instance. Nó đặc biệt quan trọng với quy trình dạng “đợt/kỳ” nơi một instance bao gồm nhiều người. Participant Definition không phải một node; nó là rule tạo participant set, thường resolve lúc instance start và snapshot để đảm bảo consistency. 

|**Selector type**|**Definition lưu gì**|**Runtime result**|
|---|---|---|
|FIXED_USERS|Stable user refs.|Cùng danh sách trừ user validity policy.|
|ROLE_MEMBERS|Role key + optional org scope.|User đang thuộc role tại thời điểm resolve.|
|GROUP_MEMBERS|Group key.|Group membership runtime.|
|ORG_FILTER|Predicate trên normalized organization<br>directory.|Tập user match department/status/management<br>level...|
|CONTEXT_LIST|Path/resolver trả list user IDs từ<br>trigger/context.|Phụ thuộc trigger data.|
|EXTERNAL_QUERY|Connector action + input mapping + result<br>mapping.|Danh sách từ hệ thống ngoài.|



###### **8.1 Participant notification** 

Sau khi participant set được resolve, workflow có thể có workflow-level notification policy để thông báo người tham gia rằng họ thuộc instance/đợt này. Notification này khác task-assignment notification: participant có thể được thông báo về instance ngay cả khi chưa có task nào phải làm. 

|**Policy**|**Ví dụ semantic**|
|---|---|
|ON_INSTANCE_STARTED|Gửi cho tất cả participant sau khi snapshot được tạo.|
|ON_PARTICIPANT_ADDED|Chỉ dùng nếu live membership được hỗ trợ.|
|ON_PARTICIPANT_COMPLETED|Thông báo khi participant execution kết thúc.|
|ON_INSTANCE_COMPLETED|Thông báo kết quả tổng thể theo recipient policy.|



###### **8.2 Execution Scope** 

|**Scope**|**Semantic**|**Ví dụ node behavior**|
|---|---|---|
|INSTANCE|Node chạy một lần cho cả instance.|Một System Action tổng hợp hoặc<br>Notification tới owner.|
|EACH_PARTICIPANT|Node expand theo từng participant; mỗi execution có<br>participant context riêng.|Form/Assignment/Approval riêng cho<br>từng người.|
|EACH_RESOLVED_ASSIGNEE|Một execution tạo nhiều task cho resolved assignees;<br>khác với participant expansion.|Approval ALL của một committee.|
|EACH_ITEM (future)|Expand theo collection bất kỳ, không chỉ user<br>participant.|Xử lý từng record/item.|



Trang 43 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **8.3 Completion Policy** 

|**Policy**|**Áp dụng**|**Khi nào scope được coi complete**|
|---|---|---|
|ALL|Multiple<br>tasks/participants/branches|Tất cả child execution complete theo success<br>semantics.|
|ANY|Multiple tasks/branches|Một child đủ điều kiện; policy quyết định cancel<br>phần còn lại.|
|THRESHOLD|Voting/review|Đủ N hoặc % child execution.|
|PER_PARTICIPANT_CONTINUATION|Participant flow|Mỗi participant tiếp tục riêng; không tạo barrier<br>toàn cục ở node.|
|CUSTOM_EXPRESSION (advanced)|Special aggregation|Expression trên child summary; cần deterministic<br>DSL.|



Execution Scope xác định “node được nhân bản ở runtime theo scope nào”. Completion Policy xác định “khi có nhiều child execution/task, lúc nào parent/node được coi hoàn thành”. Hai khái niệm phải tách riêng. 

Trang 44 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **9. Form, Data Contract và Input/Output Binding** 

###### **9.1 Form Definition** 

|**Field property**|**Yêu cầu**|
|---|---|
|fieldId|Stable technical key; không phụ thuộc label.|
|label/helpText|Presentation; có thể localization.|
|type|TEXT/TEXTAREA/NUMBER/DATE/DATETIME/BOOLEAN/SELECT/MULTI_SELECT/USER/ATTACHMENT...|
|required|Boolean hoặc visible/required expression nếu hỗ trợ.|
|defaultValueResolver|Literal/context/expression.|
|optionSource|STATIC hoặc resolver/action trả options typed.|
|visibleWhen /<br>readOnlyWhen|Condition expression trên context/form state.|
|validation|Min/max/regex/length/cross-field expression.|
|outputPath|Map submission vào node output field; không cho ghi tùy ý vào secret/immutable namespace.|



###### **9.2 Binding Definition** 

Binding phải là object typed chứ không chỉ string template rải rác. Một binding có expectedType, resolver, null policy và optional converter. 

```
InputBinding {
  targetField: "amount",
  expectedType: DECIMAL,
  resolver: { type: CONTEXT_PATH, path: "nodes.lookup.output.total" },
  nullPolicy: ERROR
}
```

###### **9.3 Known schema và schema propagation** 

Designer cần biết trường nào tồn tại tại mỗi điểm trong graph. Có thể xây Schema Manifest từ trigger schema + workflow variables + outputSchema của các node reachable trước đó. Với branch, downstream schema phải phản ánh optionality: field chỉ được tạo ở một nhánh không thể mặc định non-null ở nhánh khác. 

- Trigger payload schema là gốc dữ liệu. 

- Participant schema đến từ Organization Directory hoặc participant provider contract. 

- Mỗi Node Type công bố output schema; node config có thể refine schema (ví dụ Form fields). 

- Condition/Binding UI chỉ cho chọn field hợp lệ theo context scope; vẫn cho advanced manual expression nhưng phải validate. 

- Attachment/secret/reference field có metadata masking và không được render tùy tiện vào notification template. 

Trang 45 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **10. Validation và “compile” Workflow Definition trước Publish** 

Publish không nên chỉ kiểm tra “có Start, có End”. Hệ thống cần một bước compilation/validation tạo executable snapshot, schema manifest và normalized config. Mục tiêu là chuyển lỗi từ runtime về designtime càng nhiều càng tốt. 

|**Nhóm**|**Blocking validation**|**Warning**|
|---|---|---|
|Graph|Start/End; port-target hợp lệ; reachable; no dangling; cycle policy.|Unreachable branch có intentional<br>flag.|
|Node Config|Required config; supported scope; valid enum/policy.|Deprecated config/action.|
|Binding|Path/type/null policy; target exists.|Path optional có fallback.|
|Resolver|Resolver type supported; required params; expected cardinality.|Preview hiện trả empty nhưng<br>runtime có thể khác.|
|Human Task|Assignee + actions + form + completion coherent.|Large resolved group estimate.|
|Condition|Operator/type; route/default; no forbidden function.|Overlapping conditions.|
|Form|Field ID unique; validation; option source schema.|Very large form.|
|System Action|Action exists; input mapped; credential reference configured.|Connector health degraded.|
|Wait/SLA|Duration/date/calendar valid.|Very long wait.|
|Parallel/Join|Fork/join correlation and threshold coherent.|Potential variable write conflicts.|
|Version|Draft only; dependencies pinned.|Subworkflow active version may<br>change if not pinned.|



###### **10.1 Compile output** 

```
CompiledWorkflowVersion
  normalizedGraph
  compiledExpressions / parsed AST
  schemaManifest
  dependencyManifest
```

- <mark>`form versions`</mark> 

- <mark>`connector/action versions`</mark> 

```
    - subworkflow references
  validationReport
  checksum
```

Trang 46 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

# **PHẦN II** 

## **TRỤ CỘT 2 – RUNTIME RESOLVER** 

Definition không lưu “kết quả cụ thể”; nó lưu rule/reference. Resolver Service là lớp biến rule/reference đó thành giá trị runtime có type, cardinality, source, fallback và audit rõ ràng. 

Trang 47 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **11. Workflow Context – mô hình dữ liệu runtime** 

Workflow Context là nguồn dữ liệu chuẩn để resolver đọc. Context không nên là một Map<String,Object> vô tổ chức. Cần namespace và schema rõ để tránh xung đột, leakage và binding mơ hồ. 

```
context = {
  trigger: { payload, actor, source, receivedAt },      // immutable
  instance: { id, versionId, startedAt, creator, ... },// system-managed
  participant: { id, userRef, snapshot, ... },          // current execution scope
  variables: { period, thresholds, ... },               // workflow-defined
  nodes: {
    "nodeA": { output: {...} },
    "nodeB": { output: {...} }
  },
  task: { id, assignee, claimant, dueAt, ... },          // current task context
  runtime: { attempt, iteration, pathId, ... }           // engine metadata
}
```

|**Namespace**|**Quyền ghi**|**Mục đích**|
|---|---|---|
|trigger|Immutable|Bảo toàn input gốc cho audit/correlation.|
|instance|System-managed|Metadata instance; workflow không ghi tùy ý.|
|participant|System-managed per scope|Subject đang xử lý và snapshot org/user.|
|variables|Controlled mutation|Biến workflow được khai báo trước.|
|nodes.<id>.output|Node-owned|Output immutable theo execution revision hoặc append history.|
|task|Task runtime|Dùng trong notification/action sau task.|
|runtime|Engine-only|Path/token/attempt/iteration; không expose toàn bộ cho<br>business expression.|



###### **11.1 Context View thay vì Context toàn bộ** 

Mỗi resolver/node không nên được truy cập mọi dữ liệu. Runtime tạo Context View phù hợp scope và permission: notification template có thể đọc displayName nhưng không đọc secret; Script sandbox chỉ nhận input whitelist; Form chỉ hiển thị field được expose. 

Trang 48 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **12. Resolver Meta-model và Resolver Contract** 

Resolver là một interpreter của configuration. Definition lưu ResolverDefinition; runtime truyền ResolutionContext và expected type/cardinality; ResolverService trả ResolutionResult. Contract chung giúp cùng một mechanism dùng cho participant, assignee, recipient, input binding, SLA và route mà vẫn có policy riêng. 

```
resolve(
    ResolverDefinition definition,
    ResolutionContext context,
    ExpectedType expectedType,
    Cardinality cardinality
) -> ResolutionResult<T>
ResolutionResult<T> {
    status: RESOLVED | EMPTY | ERROR,
    value: T | List<T>,
    source: CONTEXT | ORG_DIRECTORY | CONNECTOR | LITERAL | EXPRESSION,
    resolvedAt,
    traceSummary,
    warnings[]
}
```

|**Resolver property**|**Ý nghĩa**|
|---|---|
|type|LITERAL, CONTEXT_PATH, EXPRESSION, ORG_RELATION, ROLE_MEMBERS,<br>GROUP_MEMBERS, EXTERNAL_QUERY...|
|params|Cấu hình riêng type; phải có schema.|
|expectedType|STRING/NUMBER/BOOLEAN/USER_REF/USER_LIST/DATETIME/...|
|cardinality|EXACTLY_ONE / ZERO_OR_ONE / ONE_OR_MORE / ZERO_OR_MORE.|
|nullPolicy|ERROR / EMPTY / DEFAULT / SKIP.|
|fallbackResolver|Resolver thứ hai khi primary empty/error theo rule.|
|snapshotPolicy|RESOLVE_ONCE / RESOLVE_ON_ACTIVATION / LIVE tùy domain.|
|securityScope|Quyền dữ liệu/connector resolver được dùng.|



###### **12.1 Resolver phải composable** 

Một rule như “manager của participant hiện tại” không nên hard-code bằng path `${participant.managerId}` nếu organization model có thể thay đổi. Nên biểu diễn bằng resolver composition: CurrentParticipant → OrganizationRelation(MANAGER_OF). Điều này tách business rule khỏi shape dữ liệu directory. 

```
{
  "type": "ORG_RELATION",
  "relation": "MANAGER_OF",
  "subject": { "type": "CURRENT_PARTICIPANT" },
  "cardinality": "EXACTLY_ONE",
  "fallback": { "type": "ORG_UNIT_HEAD", "subject": { ... } }
}
```

Trang 49 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **13. Value Resolver và Expression Resolver** 

|**Type**|**Dùng khi**|**Ví dụ semantic**|
|---|---|---|
|LITERAL|Giá trị không đổi theo runtime.|5 ngày, "ACTIVE", 100000.|
|CONTEXT_PATH|Đọc field đã tồn tại.|trigger.payload.requestId;<br>nodes.lookup.output.amount.|
|VARIABLE|Đọc workflow variable typed.|variables.period.|
|EXPRESSION|Tính toán/so sánh thuần túy.|scoreA * 0.4 + scoreB * 0.6.|
|TEMPLATE|Render text/payload từ nhiều value<br>resolver.|"Task cho {{participant.displayName}}".|
|COALESCE|Chọn giá trị đầu tiên non-null.|managerEmail -> participantEmail -> fallback.|
|LOOKUP_MAP|Map code -> value từ static<br>config/versioned mapping.|level code -> threshold.|



###### **13.1 Expression DSL** 

- Type-aware, deterministic, side-effect free. 

- Operator theo type: numeric comparison, string contains/matches, collection contains/in, date compare, null checks. 

- Cho AND/OR/NOT và nested group; function whitelist nhỏ như lower, length, dateAdd nếu thật sự cần. 

- Không cho reflection, file/network access, arbitrary object traversal ngoài schema manifest. 

- AST được parse/validate khi publish; runtime chỉ evaluate với context values. 

###### **13.2 Conversion policy** 

|**Trường hợp**|**Policy đề xuất**|
|---|---|
|STRING -> NUMBER|Không implicit nếu có thể gây ambiguity; require explicit converter/parse.|
|DATE -> DATETIME|Require timezone/default zone.|
|USER_ID -> USER_REF|Qua User Resolver/Directory, không coi string là user hợp lệ.|
|NULL|Phải theo nullPolicy; không silently biến thành empty string/0.|
|Collection -> scalar|Require selector FIRST/SINGLE/aggregation explicit.|



Trang 50 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **14. Participant Resolver** 

Participant Resolver chạy ở cấp instance (thường tại instance start) để materialize ParticipantExecution set. Đây là một resolver collection với additional semantics: snapshot user/org data, participant notification và correlation về sau. 

|**Resolver**|**Config**|**Result**|
|---|---|---|
|FixedParticipants|User refs được chọn.|UserRef[] đã validate.|
|RoleMembers|roleKey + orgScopeResolver.|Members hiện tại.|
|GroupMembers|groupKey.|Members hiện tại.|
|OrgQuery|Filter DSL trên<br>active/status/orgUnit/managementLevel.|Directory users match.|
|ContextUsers|Path/list resolver từ trigger.|Danh sách UserRef sau normalize.|
|ExternalParticipants|Connector action + mapping.|ParticipantRef[] từ external source.|



###### **14.1 Empty participant policy** 

|**Policy**|**Behavior**|
|---|---|
|ALLOW_EMPTY|Instance vẫn chạy các node INSTANCE-scope; participant-scope node được<br>skip/complete theo policy.|
|FAIL_INSTANCE|Dùng khi participant là bắt buộc để workflow có ý nghĩa.|
|WAIT/RETRY|Chỉ dùng nếu source tạm thời chưa sẵn sàng; cần retry limit.|
|FALLBACK_SELECTOR|Dùng selector khác có cấu hình explicit.|



###### **14.2 Snapshot semantics** 

Default nên là SNAPSHOT_AT_INSTANCE_START. Mỗi ParticipantExecution lưu stable user ID + snapshot metadata cần audit (display name, org unit, manager ID nếu policy) nhưng resolution quan hệ ở task creation có thể chọn SNAPSHOT relation hoặc LIVE relation. Hai việc này phải tách rõ. 

Participant membership snapshot không bắt buộc mọi quan hệ tổ chức cũng snapshot. Ví dụ participant set giữ nguyên nhưng “manager hiện tại” có thể resolve live khi task được tạo nếu business muốn. Policy phải explicit. 

Trang 51 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **15. Assignee / Actor Resolver** 

Assignee Resolver trả actor(s) có quyền/trách nhiệm thực hiện Human Task. Đây là điểm dynamic rõ nhất vì một Node Definition có thể tạo task cho người khác nhau ở từng instance hoặc participant execution. 

|**Resolver type**|**Subject/source**|**Cardinality thường gặp**|**Ghi chú**|
|---|---|---|---|
|FIXED_USER|Configured userRef|1|Dễ dùng nhưng ít dynamic.|
|CURRENT_PARTICIPANT|participant.userRef|1|Self task.|
|TRIGGER_ACTOR|trigger.actor|0..1|Người khởi tạo nếu trigger có actor.|
|PREVIOUS_TASK_ACTOR|task/node history|0..1|Giao lại người vừa xử lý hoặc<br>requester-change.|
|ORG_RELATION: MANAGER_OF|subject resolver|0..1|Manager trực tiếp.|
|ORG_UNIT_HEAD|org unit resolver|0..1|Head của đơn vị.|
|ROLE_MEMBERS|role + optional scope|0..N|Cần assignment mode.|
|GROUP_MEMBERS|group|0..N|Cần claim/direct policy.|
|CONTEXT_USER|Value resolver -> user id/ref|0..N|Từ output node trước.|
|EXTERNAL_USER_QUERY|Connector result|0..N|Governance/caching cần rõ.|



###### **15.1 Missing assignee policy** 

|**Policy**|**Behavior**|**Khi dùng**|
|---|---|---|
|FAIL|Node FAILED và route/fail instance.|Assignee bắt buộc.|
|FALLBACK|Chạy fallback resolver.|Manager missing -> org head/role.|
|ESCALATE|Tạo incident/escalation tới workflow owner/admin.|Không muốn tự gán sai người.|
|SKIP|Node được skip theo business rule rõ ràng.|Task optional.|
|WAIT_FOR_RESOLUTION|Node WAITING và retry directory/source.|Nguồn tạm unavailable.|



###### **15.2 Conflict policies** 

- Self-approval: nếu resolved approver = participant/requester và policy cấm, resolver result phải được post-filter hoặc fallback, không silently allow. 

- Inactive user: filter hoặc fail theo node policy; log original resolved candidate. 

- Duplicate users từ nhiều resolver branch phải deduplicate theo stable user ID. 

- Authorization luôn re-check khi user thực hiện action; assignee snapshot không thay thế auth. 

Trang 52 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **16. Role, Group, Queue và Task Claiming** 

Role/Group resolver thường trả nhiều user. Vì vậy “resolve group” chưa đủ để biết task được giao thế nào. Node cần Assignment Mode tách khỏi Resolver. 

|**Assignment Mode**|**Task runtime**|**Completion**|
|---|---|---|
|DIRECT_ONE|Chọn đúng một user theo selection policy (explicit user,<br>first deterministic, round-robin/least-loaded future).|Một task.|
|DIRECT_ALL|Tạo task cho tất cả resolved users.|Theo ALL/ANY/THRESHOLD.|
|CLAIMABLE_POOL|Tạo một task pool visible cho group/role; user hợp lệ<br>claim, sau đó task có claimant.|Một claimant hoàn thành.|
|PRIMARY_WITH_WATCHERS|Một assignee chính; user khác chỉ xem/nhận thông báo.|Primary actor hoàn thành.|



###### **16.1 Claim lifecycle** 

```
OFFERED (pool)
   | claim(user)
   v
CLAIMED / ASSIGNED
   | complete / release / reassign
   v
COMPLETED
```

- Claim phải atomic để hai user không claim cùng task. 

- Pool eligibility được evaluate từ group/role snapshot hoặc live policy. 

- Notification có thể gửi “task available” tới group và “task assigned” tới claimant. 

- Release/reassign phải audit và không làm mất form draft nếu policy cho phép transfer. 

Trang 53 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **17. Notification Recipient và Template Resolver** 

|**Recipient resolver**|**Semantic**|
|---|---|
|TASK_ASSIGNEE / CLAIMANT|Người đang chịu trách nhiệm task.|
|CURRENT_PARTICIPANT|Participant của current execution.|
|ALL_PARTICIPANTS|Participant set của instance.|
|TRIGGER_ACTOR|Người khởi tạo.|
|PREVIOUS_ACTOR|Actor của node/task trước.|
|ROLE/GROUP|Members theo scope.|
|ORG_RELATION|Manager/head/... của subject.|
|CONTEXT_USERS|Danh sách user từ output/context.|



###### **17.1 Template Resolver** 

Template rendering là resolver dạng presentation. Template engine chỉ được đọc field whitelist; phải support formatting date/number và default value, nhưng không được chứa business branching phức tạp. Business branching nên ở Condition/Graph. 

```
Subject: "Bạn có nhiệm vụ: {{task.title}}"
Body:
  "Xin chào {{recipient.displayName}},
   hạn xử lý: {{formatDate(task.dueAt)}}.
   Đối tượng: {{participant.displayName}}"
```

###### **17.2 Notification workflow-level và task-level** 

|**Loại**|**Khi resolve recipient**|**Ví dụ semantic**|
|---|---|---|
|Workflow-level|Instance started/completed hoặc<br>participant lifecycle.|Thông báo participant thuộc đợt/quy trình.|
|Task-level|Sau khi task/claimant được materialize.|Bạn có task cần thực hiện.|
|Node Notification|Khi flow đi qua Notification node.|Thông báo business độc lập với task.|
|SLA Reminder|Timer event trước/sau due.|Nhắc assignee/manager.|



Trang 54 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **18. Route / Condition Resolver** 

Route Resolver biến node outcome + context thành connection(s) tiếp theo. Nó phải deterministic và correlation-aware. Business rejection, timeout và technical error là các category outcome khác nhau; route không nên chỉ dựa trên một boolean “success”. 

|**Bước**|**Mô tả**|
|---|---|
|1. Xác định source port|Node handler phát port semantic, ví dụ APPROVED hoặc COMPLETED.|
|2. Lấy candidate connections|Chỉ connection gắn đúng sourcePort.|
|3. Evaluate condition|Theo priority/mode trên current context view.|
|4. Chọn route|FIRST_MATCH / MULTI_MATCH theo node/connection semantic.|
|5. Fallback|isDefault hoặc fail routing nếu không có route hợp lệ.|
|6. Create path token|Giữ instance/participant/fork/iteration correlation.|



###### **18.1 Condition trace** 

Để debug/audit, runtime nên lưu trace tối thiểu: expression ID/version, resolved operands đã mask, kết quả từng condition và connection được chọn. Không cần lưu raw secret. 

Trang 55 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **19. SLA, Deadline và Escalation Resolver** 

SLA không chỉ là một số giờ cố định. Due time có thể được resolve từ literal duration, business calendar hoặc runtime data. Escalation target dùng chính Actor Resolver. 

|**Thành phần**|**Resolver/config**|
|---|---|
|dueAt|Duration literal; date expression; business-calendar add.|
|reminderAt|Offset trước/sau due hoặc schedule list.|
|escalationTarget|Assignee/Actor Resolver (manager, role, group, fixed).|
|timeoutAction|AUTO_REJECT / AUTO_COMPLETE / REASSIGN / ROUTE_TIMEOUT / FAIL.|
|calendar|CalendarRef + timezone.|
|pauseBehavior|COUNT_TIME / PAUSE_DURING_SUSPEND / custom.|



###### **19.1 Resolution timing** 

- DueAt nên resolve và snapshot khi task được tạo, để sau đó thay đổi calendar/config không silently đổi task đã giao. 

- Escalation target có thể resolve tại thời điểm escalation (live organization) hoặc snapshot tại task creation; policy cần explicit. 

- Reminder recipient thường resolve từ current assignee/claimant tại thời điểm gửi, vì task có thể đã reassign. 

Trang 56 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **20. Resolver Composition, Cardinality và Fallback** 

Resolver composition cho phép biểu diễn rule phức tạp bằng primitive nhỏ mà không tạo resolver riêng cho từng nghiệp vụ. 

```
Manager of Current Participant
  = ORG_RELATION(MANAGER_OF, CURRENT_PARTICIPANT)
Finance role in Participant Org Unit
  = ROLE_MEMBERS(
        role="FINANCE",
        scope=ORG_UNIT_OF(CURRENT_PARTICIPANT)
    )
Assignee from previous lookup, fallback to owner
  = COALESCE(
        CONTEXT_USER(nodes.lookup.output.ownerId),
        WORKFLOW_OWNER()
    )
```

|**Cardinality**|**Validation/runtime rule**|
|---|---|
|EXACTLY_ONE|0 -> missing policy; >1 -> ambiguity unless selector policy.|
|ZERO_OR_ONE|0 allowed; >1 error/selection policy.|
|ONE_OR_MORE|0 -> missing policy; N allowed.|
|ZERO_OR_MORE|N bất kỳ; node completion/assignment mode xử lý.|



###### **20.1 Fallback chain** 

Fallback phải là cấu hình explicit và audit được. Runtime trace cần ghi primary resolver trả EMPTY/ERROR, fallback nào được chạy và actor/value cuối cùng đến từ đâu. Không được silently thay “manager missing” bằng “workflow owner” nếu Definition không nói vậy. 

Trang 57 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **21. Thời điểm resolve, snapshot, consistency, cache và audit** 

|**Thành phần**|**Thời điểm mặc định**|**Lý do**|
|---|---|---|
|Participant set|Instance start|Ổn định membership của một đợt.|
|Trigger values|Instance creation|Immutable event input.|
|Node input|Node activation|Dùng output mới nhất đúng path/context.|
|Assignee|Task creation|Quan hệ tổ chức đúng lúc task cần giao.|
|Task dueAt|Task creation|Ổn định SLA của task.|
|Reminder recipient|Reminder dispatch|Theo assignee/claimant hiện tại.|
|Condition operands|Routing time|Dựa trên output vừa hoàn thành.|
|Notification recipient|Dispatch time|Có thể theo actor/current participant live.|
|System Action input|Action attempt 1 activation; retry reuse<br>input snapshot theo policy|Retry deterministic và idempotent.|



###### **21.1 Cache** 

- Cache Organization Directory có thể dùng cho resolver nhưng cache key phải theo stable ID và có TTL/version metadata. 

- Không cache blindly result của dynamic resolver across participant/instance; cache provider data, không cache business result sai scope. 

- Resolver result quan trọng cho audit phải persist vào Task/NodeExecution ngay cả khi provider cache sau đó thay đổi. 

###### **21.2 Resolver audit** 

|**Audit field**|**Ví dụ semantic**|
|---|---|
|resolverType|ORG_RELATION.|
|definitionRef|nodeId + field path/version.|
|subject|Participant/UserRef đã mask hợp lý.|
|provider|Organization Directory v/timestamp.|
|resultIds|Resolved stable user IDs hoặc value summary.|
|fallbackUsed|true/false + fallback type.|
|resolvedAt|Timestamp.|
|error/warning|Missing manager, inactive candidate...|



Trang 58 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

# **PHẦN III** 

### **EXECUTION MODEL – TỪ DEFINITION ĐẾN RUNTIME** 

Trang 59 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **22. Tạo Workflow Instance từ Trigger** 

###### <mark>`Published WorkflowVersion`</mark> 

```
          +
```

```
Accepted Trigger Event
```

```
          |
```

```
          v
```

<mark>`1. Validate trigger + idempotency`</mark> 

<mark>`2. Create WorkflowInstance(workflowVersionId)`</mark> 

<mark>`3. Persist immutable trigger payload`</mark> 

<mark>`4. Initialize context + variables`</mark> 

<mark>`5. Resolve participant set (if configured)`</mark> 

<mark>`6. Persist ParticipantExecution snapshots`</mark> 

<mark>`7. Dispatch workflow-level participant notification hooks`</mark> 

<mark>`8. Create Start NodeExecution`</mark> 

<mark>`9. Runtime loop begins`</mark> 

|**Bước**|**Atomicity / lưu ý**|
|---|---|
|Trigger acceptance|Idempotency key/correlation ngăn duplicate instance.|
|Version binding|Instance bắt buộc lưu workflowVersionId exact.|
|Context initialization|Không resolve node-specific assignee sớm.|
|Participant snapshot|Có thể failure policy riêng; không tạo task trước khi participant state nhất quán.|
|Start notification|Nên outbox/async để không làm transaction instance phụ thuộc email provider.|



Trang 60 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **23. Node Execution Lifecycle và dispatch theo node kind** 

|**State**|**Ý nghĩa**|**Transition chính**|
|---|---|---|
|PENDING|Execution record đã tạo nhưng dependency chưa<br>thỏa.|-> READY|
|READY|Có thể dispatch.|-> RUNNING|
|RUNNING|Handler đang xử lý sync/dispatch async.|-> WAITING/COMPLETED/FAILED|
|WAITING|Chờ task/event/timer/child action.|-> RUNNING/COMPLETED/FAILED/CANCELLED|
|COMPLETED|Node outcome đã xác định và route đã/đang tạo.|Terminal|
|FAILED|Technical failure hết retry hoặc config error<br>runtime.|Error route/fail instance|
|CANCELLED|Path/instance bị cancel.|Terminal|
|SKIPPED|Policy skip explicit.|Route completion/skip port theo semantic|



###### **23.1 Dispatch** 

```
NodeRuntimeDispatcher
  descriptor = NodeRegistry.get(node.type)
  handler    = HandlerRegistry.get(descriptor.handlerKey)
```

```
  input = BindingService.resolve(node.inputBindings, contextView)
  execution.inputSnapshot = input
  handler.execute(node.config, input, runtimeServices)
```

Runtime Dispatcher không có `if workflowName == ...`; switch/registry chỉ theo node type/capability. Handler không được tự đọc Draft Definition hoặc data source business ngoài contract đã khai báo. 

Trang 61 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **24. Human Task lifecycle** 

```
NODE READY
   |
resolve assignee(s)
   |
create Task / Task Pool
   |
notify assignee(s)
   v
OFFERED / ASSIGNED / CLAIMED
   |
user opens -> draft -> submit/action
   |
authorize + validate + persist submission/decision
   |
Task COMPLETED
   |
internal runtime event
   v
```

```
Node aggregation -> COMPLETED -> route
```

|**Task field**|**Semantic**|
|---|---|
|taskId|Stable runtime ID.|
|nodeExecutionId|Correlation tới node execution.|
|participantExecutionId?|Correlation nếu per participant.|
|taskType|ASSIGNMENT / FORM / APPROVAL / REVIEW.|
|assigneeCandidates|Resolved set/snapshot.|
|assigneeId/claimantId|Actor chịu trách nhiệm thực tế.|
|status|OFFERED/OPEN/CLAIMED/COMPLETED/CANCELLED/EXPIRED.|
|dueAt|Snapshot SLA deadline.|
|formVersion/schemaRef|Form executable snapshot.|
|actions|Allowed task actions.|
|submission/decision|Runtime output.|
|revision|Optimistic/idempotency version.|



###### **24.1 My Tasks** 

Task Service phải expose “My Tasks” theo assignee/claimant/pool eligibility. Đây là mặt người dùng của runtime assignment; nếu workflow có assignee nhưng không có task inbox/notification thì quy trình không vận hành được thực tế. 

Trang 62 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **25. Multi-participant execution và correlation** 

Khi node scope là EACH_PARTICIPANT, engine không clone Workflow Instance. Nó tạo ParticipantExecution và NodeExecution correlated theo participant. Mỗi participant có thể ở step khác nhau đồng thời. 

```
WorkflowInstance W
  ParticipantExecution P1
      NodeExecution A1 -> Task T1
      NodeExecution B1 -> Task T2
  ParticipantExecution P2
      NodeExecution A2 -> Task T3
      NodeExecution B2 ...
```

|**Correlation key**|**Mục đích**|
|---|---|
|instanceId|Ràng buộc mọi runtime object vào một instance.|
|participantExecutionId|Giữ context/path riêng của participant.|
|nodeDefinitionId|Biết runtime object thuộc bước design nào.|
|nodeExecutionId|Một lần cụ thể; quan trọng khi loop/rework chạy cùng node nhiều lần.|
|pathId/tokenId|Phân biệt branch song song.|
|iterationNo|Phân biệt re-entry/loop.|



###### **25.1 Per-participant continuation** 

Nếu completion policy là PER_PARTICIPANT_CONTINUATION, participant A hoàn thành node thì A route tiếp ngay, không chờ B. Điều này đòi hỏi resolver/condition downstream luôn nhận đúng participant context, không dùng một “current participant” global ở instance. 

Trang 63 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **26. Loop/Rework, Parallelism, Join và Wait semantics** 

###### **26.1 Loop/Rework** 

Rework là nhu cầu tổ chức phổ biến: review không hợp lệ -> trả người trước sửa -> review lại. Nếu engine hỗ trợ cycle, cần coi mỗi lần node được re-enter là NodeExecution mới với iterationNo, không reset/mutate execution cũ. 

|**Rule**|**Yêu cầu**|
|---|---|
|New execution per iteration|Giữ lịch sử và output revision.|
|Loop guard|Optional maxIterations / timeout / manual cancellation.|
|Context policy|Output mới không xóa history cũ; downstream đọc “latest successful” theo resolver<br>semantic.|
|Task history|Task cũ COMPLETED/RETURNED, task mới là object mới.|
|Validation|Cycle phải có explicit rework/loop-enabled connection nếu muốn governance.|



###### **26.2 Parallelism** 

Parallel Split tạo nhiều path token; Join đồng bộ bằng fork correlation. Parallelism không nên ngầm phát sinh chỉ vì node có nhiều outgoing connection, trừ khi node semantic là MULTI_MATCH/FORK rõ ràng. 

###### **26.3 Wait semantics** 

- Human Task, Timer, Wait Event và synchronous Subworkflow đều đưa node vào WAITING nhưng resume event khác nhau. 

- Resume event phải chứa correlationRef tới đúng execution; duplicate event không được advance hai lần. 

- Instance cancel phải cancel/disable subscriptions/timers/tasks theo policy. 

Trang 64 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **27. System Action, Retry, Idempotency và Error Route** 

|**Khái niệm**|**Rule**|
|---|---|
|Attempt|Mỗi technical retry là attempt của cùng NodeExecution, không phải một business iteration<br>mới.|
|Input snapshot|Mặc định reuse cùng resolved input/idempotency key trong retry để deterministic.|
|Idempotency key|Nên gồm connector/action + instance + nodeExecution hoặc business key configured.|
|Retryable error|Timeout/5xx/network theo connector policy; 4xx business/validation thường không retry.|
|Business result|Ví dụ external trả “not eligible” là output data để condition route, không nhất thiết FAILED.|
|Technical failure|Exhausted retry -> ERROR port hoặc FAILED instance theo node errorPolicy.|
|Compensation|Future capability; không giả rollback side effect bên ngoài bằng DB transaction local.|



Trang 65 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **28. Versioning, Publish, Suspend và Runtime Binding** 

```
Draft Definition
  edit freely
      |
  validate/compile
      v
Published Version N (immutable)
      |
      +--> Trigger -> Instance A [bind N]
      +--> Trigger -> Instance B [bind N]
```

```
Edit after publish -> New Draft based on N -> Publish Version N+1
Existing A/B continue using N.
```

|**Operation**|**Definition behavior**|**Runtime behavior**|
|---|---|---|
|Publish|Create immutable version + dependency<br>manifest.|New triggers bind active version.|
|Edit published|Create new draft.|Existing instance unchanged.|
|Suspend|Disable/deny new trigger acceptance.|Running instances continue by default.|
|Reactivate|Enable trigger registration/acceptance.|No retroactive instance.|
|Soft Delete|Hide definition, preserve audit/version.|Existing history preserved; running instance rule<br>must be checked.|



Trang 66 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

# **PHẦN IV** 

**USE CASE, MODULE, DATA MODEL VÀ ACCEPTANCE** 

Trang 67 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **29. Danh mục Use Case** 

|**ID**|**Use Case**|**Actor**|**Nhóm**|
|---|---|---|---|
|UC-D01|Tạo Workflow Definition mới|Workflow Owner|Definition|
|UC-D02|Tạo Draft từ Template|Workflow Owner|Definition|
|UC-D03|Chỉnh metadata và ownership|Owner/Editor|Definition|
|UC-D04|Cấu hình Trigger|Owner/Editor|Definition/Dynamic|
|UC-D05|Cấu hình Participant Resolver|Owner/Editor|Definition/Dynamic|
|UC-D06|Preview participant result bằng sample context|Owner/Editor|Dynamic|
|UC-D07|Thêm/Xóa/Di chuyển Node|Owner/Editor|Graph|
|UC-D08|Cấu hình Node Input Binding|Owner/Editor|Dynamic Data|
|UC-D09|Cấu hình Human Task Assignee Resolver|Owner/Editor|Dynamic Actor|
|UC-D10|Cấu hình Task Form|Owner/Editor|Human Task|
|UC-D11|Cấu hình Approval Actions/Mode|Owner/Editor|Human Task|
|UC-D12|Cấu hình Review/Rework|Owner/Editor|Human Task/Loop|
|UC-D13|Cấu hình Condition/Gateway|Owner/Editor|Routing|
|UC-D14|Tạo/Sửa/Xóa Connection theo Port|Owner/Editor|Graph|
|UC-D15|Cấu hình Notification Recipient/Template|Owner/Editor|Dynamic|
|UC-D16|Cấu hình System Action + Mapping|Owner/Editor|Integration|
|UC-D17|Cấu hình Data Transform|Owner/Editor|Data|
|UC-D18|Cấu hình Timer/Wait|Owner/Editor|Wait|
|UC-D19|Cấu hình Parallel Split/Join|Owner/Editor|Advanced Control|
|UC-D20|Cấu hình Subworkflow|Owner/Editor|Composition|
|UC-D21|Cấu hình SLA/Reminder/Escalation|Owner/Editor|Dynamic Time/Actor|
|UC-D22|Cấu hình missing resolver/fallback policy|Owner/Editor|Dynamic Safety|
|UC-D23|Validate/Compile Definition|Owner/Editor|Validation|
|UC-D24|Publish Version|Workflow Owner|Lifecycle|
|UC-D25|Tạo Draft version mới|Owner/Editor|Versioning|
|UC-R01|Accept Trigger và tạo Instance|System/User|Runtime|
|UC-R02|Resolve Participant Set|System|Resolver|
|UC-R03|Thông báo Participants khi Instance bắt đầu|System|Notification|
|UC-R04|Activate Node và resolve Input|System|Runtime|
|UC-R05|Resolve Dynamic Assignee|System|Resolver|



Trang 68 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

|**ID**|**Use Case**|**Actor**|**Nhóm**|
|---|---|---|---|
|UC-R06|Tạo/Offer/Assign Human Task|System|Task|
|UC-R07|Claim Task từ Role/Group Pool|Assignee|Task|
|UC-R08|Submit Form/Complete Assignment|Assignee|Task|
|UC-R09|Approve/Reject/Request Change|Approver|Task|
|UC-R10|Review/Return/Complete|Reviewer|Task|
|UC-R11|Evaluate Condition và Route|System|Routing|
|UC-R12|Execute System Action + Retry|System|Integration|
|UC-R13|Wait/Resume bằng Timer/Event|System|Wait|
|UC-R14|Process SLA Reminder/Escalation|System|SLA|
|UC-R15|Continue per Participant|System|Multi-participant|
|UC-R16|Execute Rework Loop|System/User|Loop|
|UC-R17|Fork/Join Parallel Paths|System|Advanced Control|
|UC-R18|Complete Participant Execution|System|Runtime|
|UC-R19|Complete Workflow Instance|System|Runtime|
|UC-O01|Xem My Tasks|User|Operation|
|UC-O02|Xem Notification Center|User|Operation|
|UC-O03|Theo dõi Instance/Participants/Tasks|Viewer/Owner/Admin|Monitoring|
|UC-O04|Xem Resolver/Condition Trace|Viewer/Admin|Debug/Audit|
|UC-O05|Xem Version History/Change Log|Viewer/Owner/Admin|Audit|
|UC-O06|Suspend/Reactivate Workflow|Owner/Admin|Lifecycle|
|UC-O07|Soft Delete Workflow|Owner/Admin|Lifecycle|
|UC-O08|Đồng bộ Organization Directory|Admin/System|Supporting|



Trang 69 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **30. Đặc tả các Use Case trọng yếu** 

###### **UC-D05 – Cấu hình Participant Resolver** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Workflow đang Draft; participant capability bật.|
|Kích hoạt|User mở Participant Scope.|



###### **Luồng chính** 

63. Chọn resolver type: fixed, role/group, org filter, context list hoặc external query. 

64. Cấu hình subject/filter/input mapping và expected cardinality. 

65. Chọn snapshot policy và empty-result policy. 

66. Cấu hình notification khi participant được materialize nếu cần. 

67. Preview resolver với sample trigger/org data; preview không trở thành runtime result. 

68. Lưu Resolver Definition vào Draft. 

###### **Luồng thay thế / ngoại lệ** 

- Provider/source không khả dụng ở design-time -> cho lưu với warning nếu schema/config hợp lệ. 

- Filter sai schema -> blocking validation. 

- Preview trả empty -> warning hoặc error tùy empty policy. 

###### **Hậu điều kiện** 

- Draft chứa participant rule executable và typed. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Definition lưu rule, không lưu danh sách runtime đã preview. 

- Cùng version có thể resolve participant set khác nhau giữa các instance. 

- Participant snapshot và notification policy được version hóa. 

Trang 70 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **UC-D09 – Cấu hình Human Task Assignee Resolver** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Có Assignment/Form/Approval/Review node.|
|Kích hoạt|User mở tab Assignment/Approver/Reviewer.|



###### **Luồng chính** 

69. Chọn resolver category: fixed user, current participant, organization relation, role/group, context user, composed resolver. 

70. Cấu hình subject resolver nếu resolver cần relation. 

71. Chọn cardinality và assignment mode nếu result có thể nhiều user. 

72. Cấu hình missing-assignee policy và fallback resolver. 

73. Cấu hình task notification tới assignee/claimant. 

74. Preview bằng sample participant/context và lưu. 

###### **Luồng thay thế / ngoại lệ** 

- Resolver preview >1 user nhưng mode DIRECT_ONE không có selection -> validation warning/error. 

- Manager missing -> preview EMPTY; UI hiển thị fallback chain. 

- Resolver reference path sai type -> blocking validation. 

###### **Hậu điều kiện** 

- Node có resolver definition và assignment semantics đầy đủ. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Không hard-code manager/role resolution trong handler của workflow cụ thể. 

- Resolver được chạy tại task creation với current participant/context. 

- Kết quả thực tế được audit riêng khỏi definition. 

Trang 71 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **UC-D23 – Validate/Compile Workflow Definition** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|Owner/Editor|
|Tiền điều kiện|Draft tồn tại.|
|Kích hoạt|User chọn Validate/Publish hoặc auto-validation chạy.|



###### **Luồng chính** 

75. Validate graph/ports/reachability/cycle policy. 

76. Validate từng Node Descriptor config và execution scope. 

77. Build schema manifest rồi validate bindings, form fields và expressions. 

78. Validate resolver type/cardinality/fallback, connector/action dependency, SLA/calendar. 

79. Compile expression AST và normalize graph. 

80. Tạo ValidationReport với blocking error/warning gắn node/field/connection. 

81. Nếu không có blocking error, definition đạt trạng thái READY_TO_PUBLISH. 

###### **Luồng thay thế / ngoại lệ** 

- Dependency external không thể health-check -> warning nếu descriptor tồn tại. 

- Unknown dynamic field -> blocking nếu schema bắt buộc, warning nếu declared late-bound theo policy. 

###### **Hậu điều kiện** 

- Có compiled snapshot tạm và validation report. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Lỗi dynamic reference được bắt trước runtime tối đa theo known schema. 

- Compile không resolve user/runtime data thật và không tạo side effect. 

Trang 72 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **UC-R02 – Resolve Participant Set** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|System|
|Tiền điều kiện|Instance vừa tạo; Participant Definition tồn tại.|
|Kích hoạt|Runtime initialization.|



###### **Luồng chính** 

82. Tạo ResolutionContext từ trigger + instance + organization provider. 

83. Chạy Participant Resolver theo definition và snapshot policy. 

84. Normalize/deduplicate stable participant IDs. 

85. Validate active/eligibility policy. 

86. Tạo ParticipantExecution cho từng participant với participant snapshot. 

87. Ghi Resolver Trace và participant count. 

88. Phát participant-start hooks/notification theo policy. 

###### **Luồng thay thế / ngoại lệ** 

- EMPTY -> ALLOW_EMPTY/FAIL/FALLBACK/RETRY theo definition. 

- Provider ERROR -> retry/fail policy; không silently tạo empty set. 

- Duplicate IDs -> deduplicate và audit warning. 

###### **Hậu điều kiện** 

- Instance có participant set ổn định và correlated. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Không clone WorkflowInstance cho mỗi participant. 

- Kết quả runtime không được ghi ngược vào Workflow Definition. 

Trang 73 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **UC-R05 – Resolve Dynamic Assignee và tạo Task** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|System|
|Tiền điều kiện|Human task node READY; context/participant hợp lệ.|
|Kích hoạt|Task activation.|



###### **Luồng chính** 

89. Resolve node input snapshot. 

90. Xây Actor ResolutionContext gồm current participant, trigger actor, org directory và prior task history. 

91. Chạy Assignee Resolver + fallback chain. 

92. Áp dụng active/self-approval/dedup/cardinality policies. 

93. Chuyển resolution result thành task assignment theo DIRECT_ONE/DIRECT_ALL/CLAIMABLE_POOL. 

94. Resolve dueAt/SLA và materialize form/task content. 

95. Persist Task(s), Resolution Trace và gửi task notification. 

###### **Luồng thay thế / ngoại lệ** 

- EMPTY -> fallback/escalate/fail/skip theo node policy. 

- Multiple result không phù hợp mode -> runtime guard fail, dù validation đáng lẽ đã bắt. 

- Notification fail -> theo delivery policy; task không bị mất. 

###### **Hậu điều kiện** 

- Human Task tồn tại với actor runtime cụ thể. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Cùng node definition có thể assign khác user giữa participant/instance. 

- Actor result được snapshot/audit tại task creation. 

Trang 74 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **UC-R11 – Evaluate Condition và Route** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|System|
|Tiền điều kiện|Node trước complete hoặc Condition node READY.|
|Kích hoạt|Runtime cần chọn outgoing path.|



###### **Luồng chính** 

96. Lấy current source port/outcome. 

97. Lấy candidate connections theo sourcePort. 

98. Resolve operands trong condition bằng Value Resolver trên đúng context scope. 

99. Evaluate expression theo priority/mode. 

100. Chọn route(s) và ghi evaluation trace. 

101. Tạo path token(s) tới target node với participant/fork/iteration correlation. 

###### **Luồng thay thế / ngoại lệ** 

- Không condition match -> dùng default; không có default -> routing error. 

- Runtime value null/type mismatch -> condition null/error policy. 

- MULTI_MATCH chỉ tạo nhiều route khi source/gateway semantic cho phép. 

###### **Hậu điều kiện** 

- Flow tiến sang node target phù hợp. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Business rule nằm trong definition/condition config, không trong service code. 

- Cùng definition route khác nhau theo runtime context. 

Trang 75 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **UC-R16 – Execute Rework Loop** 

|**Thuộc tính**|**Mô tả**|
|---|---|
|Tác nhân chính|System/User|
|Tiền điều kiện|Graph cho phép rework connection; task/review phát RETURN/REQUEST_CHANGE.|
|Kích hoạt|Outcome port dẫn về node đã chạy trước.|



###### **Luồng chính** 

102. Tạo path token mới với iterationNo tăng. 

103. Tạo NodeExecution mới cho target node; không reopen record cũ. 

104. Resolve input từ latest context + rework comment/output. 

105. Tạo task mới, có thể resolve previous actor hoặc assignee mới theo current resolver. 

106. Khi task hoàn tất, route lại qua graph bình thường. 107. History giữ đầy đủ các iteration. 

###### **Luồng thay thế / ngoại lệ** 

- Vượt maxIteration -> route error/manual intervention. 

- Previous actor không còn active -> resolver fallback. 

- Old task submit sau rework task tạo -> reject vì task state/version. 

###### **Hậu điều kiện** 

- Rework tạo revision runtime mới mà không mất audit. 

###### **Điểm ĐỘNG cần bảo đảm** 

- Loop là graph behavior generic; không code riêng cho “trả lại chỉnh sửa”. 

Trang 76 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **31. Kiến trúc module và contract giữa các service** 

|**Module**|**Trách nhiệm**|**Contract chính**|
|---|---|---|
|Workflow Management|CRUD metadata, ownership, lifecycle.|Definition repository/service.|
|Workflow Designer API|Graph draft, node config, validation markers.|Node Registry + Definition Service.|
|Node Registry|Descriptor cho node types.|getDescriptor(typeKey), listCapabilities().|
|Definition Compiler|Normalize/validate/compile/publish snapshot.|compile(draft) -> compiledVersion/report.|
|Trigger Service|Manual/API/Schedule/Event intake và idempotency.|acceptTrigger(versionRef,payload).|
|Runtime Engine|Instance/path/node execution orchestration.|dispatchNode/resumeEvent/route.|
|Binding Service|Resolve typed node inputs.|resolveBindings(bindings,context).|
|Resolver Service|Typed dynamic resolution.|resolve(def,context,expectedType,cardinality).|
|Organization Directory|User/org/manager/role/group normalized view.|getUser/getRelation/queryMembers.|
|Task Service|Task/pool/claim/action/form lifecycle.|create/claim/submit/decide/reassign.|
|Form Service|Form schema/version/materialization/validation.|materialize/validateSubmission.|
|Action Registry/Integration|Connector/action descriptors + execution.|execute(action,input,credential,idempotency).|
|Notification Service|Recipient/channel/template/delivery.|dispatch(notificationRequest).|
|Timer/SLA Service|Durable timers/reminder/escalation.|schedule/cancel/fire.|
|Event Router|Correlate internal/external events.|publish/subscribe/correlate.|
|Monitoring/Audit|Timeline, traces, history, search.|appendEvent/queryRuntime.|



###### **31.1 Node Handler interface – conceptual** 

```
NodeHandler.execute(
  NodeDefinition node,
  NodeExecution execution,
  ResolvedInput input,
  RuntimeServices services
) -> NodeHandlerResult
```

```
Result may be:
  COMPLETE(outcomePort, output)
  WAIT(waitHandle/taskIds/timerId)
  FAIL(error)
```

Trang 77 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

###### **31.2 Resolver Provider interface** 

```
ResolverProvider.supports(typeKey)
ResolverProvider.validate(config, expectedType)
ResolverProvider.resolve(config, ResolutionContext)
```

```
Examples:
  ContextResolverProvider
  ExpressionResolverProvider
  OrganizationResolverProvider
  RoleGroupResolverProvider
  ExternalQueryResolverProvider
```

Trang 78 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **32. Mô hình dữ liệu khái niệm mở rộng** 

|**Entity/Aggregate**|**Thuộc tính/quan hệ chính**|
|---|---|
|WorkflowDefinition|id, metadata, status, ownerId, activeVersionId, draftRevision.|
|WorkflowVersion|id, definitionId, versionNo, compiledGraph, schemaManifest, dependencyManifest, checksum,<br>publishedAt.|
|NodeDefinition|id, typeKey, name, executionScope, config, inputBindings, policies, position.|
|ConnectionDefinition|id, sourceNodeId, sourcePort, targetNodeId, condition?, priority, isDefault.|
|ResolverDefinition|id/inline, typeKey, params, expectedType, cardinality, nullPolicy, fallback.|
|FormDefinition/Version|schema, fields, validations, option source, output mapping.|
|WorkflowInstance|id, workflowVersionId, executionState, businessOutcome, triggerRef, contextRef,<br>startedAt/completedAt.|
|ParticipantExecution|id, instanceId, participantStableId, snapshot, state, outcome.|
|PathToken|id, instanceId, participantExecutionId?, parentForkId?, iterationNo, currentNodeExecutionId.|
|NodeExecution|id, instanceId, nodeDefinitionId, participantExecutionId?, pathId, iterationNo, state, inputSnapshot,<br>output, attempt.|
|Task|id, nodeExecutionId, type, status, poolId?, assigneeId?, claimantId?, dueAt, actionVersion.|
|TaskSubmission/Decision|taskId, revision, actorId, action, formData/comment, timestamp.|
|ResolverTrace|executionRef, resolverType/configRef, subject summary, result IDs/summary, fallbackUsed,<br>timestamp, status.|
|RuntimeEvent|instanceId, eventType, correlationRef, payloadRef, idempotencyKey, createdAt.|
|Timer|correlationRef, timerType, dueAt, state, payloadRef.|
|NotificationDelivery|recipient/channel/templateVersion/status/dedupKey/externalRef.|
|ActionExecution|nodeExecutionId, connector/action, attempt, idempotencyKey, requestSnapshotRef,<br>responseSummary, status.|
|AuditLog|actor, action, resource, before/after summary, timestamp.|
|OrganizationUser|internalId, externalId, displayName, email, active, managerId, orgUnitId, metadata.|
|OrgUnit/Role/Group|Stable identity + membership/relation metadata.|



###### **32.1 Definition vs Runtime boundary** 

- Definition entities chứa rule/config; runtime entities chứa resolved result/state. 

- Không cập nhật resolver definition bằng assignee đã resolve. 

- Không cập nhật Form Definition bằng dữ liệu submission. 

- Không để Workflow Instance tham chiếu “active version” động; phải pin workflowVersionId. 

- Runtime snapshot dữ liệu quan trọng đủ để audit khi organization/external data thay đổi. 

Trang 79 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **33. Monitoring, My Tasks, Notification và Audit** 

###### **33.1 Runtime Instance View** 

|**Khối**|**Thông tin cần hiển thị**|
|---|---|
|Summary|Instance ID, workflow/version, state/outcome, trigger source, startedAt, participant count, active<br>task count, SLA summary.|
|Graph runtime|Node status; multiple execution badge; current paths; error/wait indicators.|
|Participants|Participant, current step(s), current assignee(s), status, completion.|
|Tasks|Open/overdue/completed task; assignee/claimant; dueAt; action.|
|Timeline|Trigger, resolution, node start/complete, task assignment/action, route, SLA, retry, error.|
|Context view|Masked, permission-aware; node input/output revisions.|
|Resolver trace|Tại sao task giao cho user X / participant set có ai / condition chọn route nào.|



###### **33.2 My Tasks** 

- Task assigned trực tiếp cho current user. 

- Task pool user có quyền claim. 

- Filter status, due/overdue, workflow, task type. 

- Open task -> render correct form/action from pinned Workflow Version. 

- Notification deep-link phải mở đúng Task ID, không chỉ workflow detail. 

###### **33.3 Audit requirement** 

|**Sự kiện**|**Audit tối thiểu**|
|---|---|
|Definition changed|actor, draft revision, changed node/field/connection, before/after summary.|
|Publish|actor, version, checksum/dependencies.|
|Resolver|type, subject, result, fallback, timestamp.|
|Task assigned/claimed/reassigned|actor/system, from/to, reason.|
|Task action|actor, action, revision, timestamp, comment summary.|
|Condition route|expression/rule ID, outcome, selected connection.|
|System action|connector/action, attempt, status, idempotency key, masked request/response.|
|SLA/escalation|timer, target, action.|
|Instance cancel/fail/complete|actor/system, reason/outcome.|



Trang 80 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **34. Acceptance Criteria chứng minh tính ĐỘNG** 

Acceptance Criteria dưới đây không chỉ kiểm tra UI mà kiểm tra kiến trúc hai trụ cột. Một implementation chỉ đạt yêu cầu Dynamic khi pass các nhóm này. 

|**ID**|**Acceptance Criterion**|
|---|---|
|AC-DYN-01|Người dùng có thể tạo graph với các node core, nối qua semantic ports và publish mà không sửa code backend<br>theo tên workflow.|
|AC-DYN-02|Cùng một Human Task Node với CURRENT_PARTICIPANT resolve ra user khác nhau cho hai participant trong<br>cùng instance.|
|AC-DYN-03|Cùng một Approval Node với MANAGER_OF(CURRENT_PARTICIPANT) resolve ra manager khác nhau và tạo task<br>tương ứng.|
|AC-DYN-04|Participant Resolver theo role/group/org filter cho kết quả khác giữa hai instance khi organization data khác,<br>trong khi Workflow Version không đổi.|
|AC-DYN-05|Participant set được snapshot theo policy; thay đổi membership sau instance start không silently thay<br>participant của instance cũ.|
|AC-DYN-06|Task notification gửi tới resolved assignee; workflow-level notification có thể gửi participant độc lập với task.|
|AC-DYN-07|Condition route khác nhau với context khác nhau mà không sửa source code.|
|AC-DYN-08|Form options/default/visibility có thể bind context và output map sang node output typed.|
|AC-DYN-09|System Action input bind từ trigger/participant/node output; retry giữ idempotency và không tạo side effect lặp<br>theo connector contract.|
|AC-DYN-10|Một instance có N participant và N task execution mà không clone N workflow instance.|
|AC-DYN-11|PER_PARTICIPANT_CONTINUATION cho phép participant A đi tiếp trong khi B vẫn waiting.|
|AC-DYN-12|Rework tạo NodeExecution/Task revision mới; history cũ vẫn xem được.|
|AC-DYN-13|Resolver EMPTY áp dụng đúng Fail/Fallback/Escalate/Skip policy và ghi trace.|
|AC-DYN-14|Role/group trả nhiều user được xử lý theo assignment mode; không arbitrarily lấy user đầu tiên nếu Definition<br>không nói.|
|AC-DYN-15|Validation bắt được invalid context path/type/operator/cardinality trước publish ở mức schema có thể biết.|
|AC-DYN-16|Published Version immutable; publish N+1 không làm thay đổi node/resolver/form của instance bind N.|
|AC-DYN-17|Monitoring giải thích được “vì sao user X được giao task” thông qua resolver trace.|
|AC-DYN-18|Condition/expression không thể gọi network/file/arbitrary code.|
|AC-DYN-19|Node Registry cho phép thêm capability mới bằng descriptor+handler mà không sửa definition cũ.|
|AC-DYN-20|Không có switch/if theo workflow name/module nghiệp vụ trong Runtime Engine.|



Trang 81 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **35. Anti-pattern và quyết định thiết kế cần chốt** 

###### **35.1 Anti-pattern** 

- Mỗi workflow nghiệp vụ có một Java service/class riêng và engine gọi theo workflow name. 

- Node label quyết định behavior runtime. 

- Participant = Assignee = Requester bị gộp thành một khái niệm. 

- Role/group resolver trả N user nhưng engine luôn lấy phần tử đầu tiên mà không có assignment policy. 

- Workflow Definition lưu user resolved runtime hoặc task status. 

- Expression engine cho phép arbitrary code/network. 

- Human task chỉ là “node WAITING=true” mà không có Task object riêng. 

- Loop bằng cách reopen/mutate NodeExecution cũ và mất history. 

- Parallel branch cùng ghi variable global không có namespace/merge policy. 

- Connector retry tạo record/gửi tiền/gửi email nhiều lần vì không có idempotency/dedup. 

- Published workflow dùng form/connector “latest” không pin dependency version. 

- Resolver fail thì silently assign workflow owner/admin để flow không lỗi. 

###### **35.2 Quyết định cần chốt** 

|**Quyết định**|**Khuyến nghị V2**|
|---|---|
|Condition node hay condition edge?|Giữ Condition/Gateway node cho UX rõ; connection vẫn có optional condition cho advanced<br>routing nhưng semantic phải cùng engine.|
|Loop V1?|Nên support rework loop có guard vì nghiệp vụ tổ chức thường cần trả lại chỉnh sửa; không<br>support arbitrary unbounded loop ngay.|
|Role/Group assignment|Support CLAIMABLE_POOL + DIRECT_ALL; DIRECT_ONE cần selection policy explicit.|
|Participant relation snapshot|Membership snapshot at instance start; manager relation default resolve at task creation,<br>option snapshot nếu business yêu cầu.|
|HTTP node riêng?|UI có thể có icon HTTP; runtime implement như System Action action subtype.|
|Code node?|Optional governed; không dùng để bù thiếu primitive.|
|Parallel V1?|Có thể phase sau; model/port/path nên thiết kế không khóa đường mở rộng.|
|Subworkflow V1?|Phase sau nếu timeline hạn chế; nên pin version semantics từ đầu.|
|Live organization update|Không tự thay open task assignee; reassign/escalation là action riêng.|
|Missing assignee|Bắt buộc explicit policy; default FAIL an toàn.|



Trang 82 

_WORKFLOW BUILDER – DETAILED SYSTEM SPECIFICATION V2_ 

#### **36. Lộ trình capability theo phase** 

|**Phase**|**Capability bắt buộc**|**Mục tiêu**|
|---|---|---|
|Phase 1 – Dynamic Core|Start/End; Assignment/Form/Approval/Review; Condition; Notification;<br>System Action; Data Transform; Timer; Participant Resolver; Assignee<br>Resolver; Context/Binding; SLA; Versioning; My Tasks; Monitoring/Audit.|Đủ để biểu diễn phần lớn<br>workflow tổ chức tuần tự,<br>rework và rẽ nhánh với<br>actor/data động.|
|Phase 1.1 – Rework &<br>Pool|Loop/rework guard; role/group claimable pool; richer<br>fallback/escalation; resolver trace UI.|Nâng độ thực tế vận hành<br>human workflow.|
|Phase 2 – Advanced<br>Control|Wait Event; Parallel Split/Join; Subworkflow; advanced aggregation;<br>external participant query.|Biểu diễn orchestration phức<br>tạp và event-driven.|
|Phase 3 – Extensibility|Third-party connector/action registry, governed script, plugin SDK,<br>reusable policy libraries.|Mở rộng capability mà không<br>làm core engine phụ thuộc<br>nghiệp vụ.|



###### **36.1 Definition of Done cho “Dynamic Core”** 

- Một workflow owner có thể xây, validate, publish và chạy một quy trình mới chỉ bằng configuration và catalog đã có. 

- Participant, assignee, recipient, input và route được resolve theo runtime context; không cần sửa source code. 

- Runtime có thể giải thích được mọi quyết định quan trọng qua trace/audit. 

- Mọi Human Task xuất hiện trong My Tasks/Notification đúng người; task action resume đúng instance/participant/path. 

- Published version bất biến và executable độc lập với draft mới. 

- Failure của resolver/action có policy rõ; không có silent fallback gây xử lý sai người. 

#### **Kết luận** 

Workflow Platform thực sự ĐỘNG không được đánh giá bằng số lượng node trên palette hay khả năng kéothả. Nó được đánh giá bằng hai năng lực kết hợp: Definition phải là một ngôn ngữ cấu trúc đủ mạnh để business biểu diễn quy trình bằng primitive generic; Resolver phải là một runtime mechanism typed, composable và audit-able để biến rule trong definition thành participant, assignee, dữ liệu, route, thời gian và recipient cụ thể. 

Nếu hai trụ cột này được hiện thực như contract nền tảng – Node Registry + Executable Definition ở một phía, Context + Resolver Service ở phía còn lại – thì các quy trình mới chủ yếu là dữ liệu cấu hình được version/publish. Engine chỉ cần hiểu semantic generic của node và resolver, từ đó đáp ứng đúng mục tiêu tránh hard-code nghiệp vụ và cho phép tổ chức tự thay đổi quy trình một cách an toàn. 

Trang 83 

